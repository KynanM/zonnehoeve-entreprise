import os
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from typing import List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import DocumentMetadata, DocumentFile
from api.auth import verify_admin

router = APIRouter(prefix="/api/documents", tags=["Documents"])
logger = logging.getLogger(__name__)

@router.get("/updates/recent")
async def get_recent_updates(days: int = 3, db: AsyncSession = Depends(get_db)) -> List[dict]:
    """Geeft documenten terug die recent zijn gewijzigd."""
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(DocumentMetadata).where(DocumentMetadata.last_modified >= since)
    )
    changed = result.scalars().all()
    return [
        {"filename": d.filename, "last_modified": d.last_modified.isoformat()}
        for d in changed
    ]

@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)) -> List[str]:
    """Leest bestanden uit de database in plaats van lokale disk."""
    result = await db.execute(select(DocumentFile.filename))
    return result.scalars().all()

@router.get("/search")
async def search_documents(q: str, db: AsyncSession = Depends(get_db)) -> List[str]:
    """Zoekt semantisch door alle documentinhoud."""
    from vector_store import get_vector_store
    try:
        if not q or len(q) < 3:
            result = await db.execute(select(DocumentFile.filename))
            return result.scalars().all()
            
        vector_store = get_vector_store()
        docs = vector_store.similarity_search(q, k=10)
        
        filenames = []
        for doc in docs:
            source = doc.metadata.get('source', '')
            if source:
                fname = os.path.basename(source)
                if fname not in filenames:
                    filenames.append(fname)
        return filenames
    except Exception as e:
        logger.error(f"Fout bij semantisch zoeken: {e}")
        return []

import io
from fastapi.responses import StreamingResponse

@router.get("/{filename}")
async def get_document(filename: str, download: bool = False, db: AsyncSession = Depends(get_db)):
    """Serveer file data vanuit de BLOB database opslag.
    - download=False: Serveer inline voor de viewer
    - download=True: Forceer een browser download
    """
    result = await db.execute(
        select(DocumentFile).where(DocumentFile.filename == filename)
    )
    doc_file = result.scalar_one_or_none()
    
    if not doc_file:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    # We gebruiken StreamingResponse voor betere performance en browser compatibiliteit
    content_stream = io.BytesIO(doc_file.data)
    
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    if download:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    # Voor 'inline' (viewing) laten we de Content-Disposition leeg zodat de frontend 
    # het als Blob kan ophalen zonder dat browsers een download triggeren.
        
    return StreamingResponse(
        content_stream, 
        media_type=doc_file.mime_type, 
        headers=headers
    )

@router.get("/{filename}/preview")
async def get_document_preview(filename: str, db: AsyncSession = Depends(get_db)):
    """Geeft de samenvatting van het document terug (voor de preview pane)."""
    result = await db.execute(
        select(DocumentMetadata).where(DocumentMetadata.filename == filename)
    )
    metadata = result.scalar_one_or_none()
    if not metadata or not metadata.summary:
        return "Geen samenvatting beschikbaar."
    return metadata.summary

@router.get("/{filename}/outline")
async def get_document_outline(filename: str, db: AsyncSession = Depends(get_db)):
    """Geeft de inhoudsopgave van het document terug."""
    result = await db.execute(
        select(DocumentMetadata).where(DocumentMetadata.filename == filename)
    )
    metadata = result.scalar_one_or_none()
    if not metadata or not metadata.outline:
        return []
    return metadata.outline

@router.get("/{filename}/suggest-questions")
async def suggest_questions(filename: str, db: AsyncSession = Depends(get_db)):
    """Genereert 3 relevante vragen die een gebruiker over dit document kan stellen."""
    result = await db.execute(
        select(DocumentMetadata).where(DocumentMetadata.filename == filename)
    )
    metadata = result.scalar_one_or_none()
    
    # Standaard vragen als we geen metadata hebben
    default_questions = [
        f"Wat zijn de belangrijkste punten van {filename}?",
        "Welke procedures worden hier beschreven?",
        "Zijn er specifieke actiepunten voor personeel?"
    ]
    
    if not metadata or not metadata.summary:
        return default_questions
        
    # In een ideale wereld vragen we het LLM hier, maar voor snelheid en stabiliteit 
    # vallen we terug op deze defaults of we kunnen ze in de toekomst opslaan in de DB.
    return default_questions

@router.post("/upload", dependencies=[Depends(verify_admin)])
async def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint om documenten live in Railway database en vector-store op te slaan!"""
    filename = file.filename
    content = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    
    # 1. Update / Insert the BLOB in database
    result = await db.execute(select(DocumentFile).where(DocumentFile.filename == filename))
    existing_file = result.scalar_one_or_none()
    
    if existing_file:
        existing_file.data = content
        existing_file.mime_type = mime_type
        existing_file.uploaded_at = datetime.utcnow()
    else:
        new_file = DocumentFile(filename=filename, data=content, mime_type=mime_type)
        db.add(new_file)
        
    await db.commit()
    
    # 2. Start achtergrondtaak om het in de vector database (ingest.py) op te nemen
    from ingest import process_single_file_from_memory
    background_tasks.add_task(process_single_file_from_memory, filename, content)
    
    return {"status": "success", "message": f"{filename} succesvol geüpload en in wachtrij gezet voor AI vectorisatie."}
