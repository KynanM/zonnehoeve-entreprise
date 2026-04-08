import os
import hashlib
import logging
from datetime import datetime
from typing import List, Dict, Type

from langchain_core.documents import Document
from langchain_community.document_loaders.base import BaseLoader
from langchain_community.document_loaders import PDFPlumberLoader, DirectoryLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import asyncio

from vector_store import get_vector_store
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

RAW_DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "raw_documents"))

LOADER_MAPPING: Dict[str, Type[BaseLoader]] = {
    "*.pdf": PDFPlumberLoader,
    "*.docx": Docx2txtLoader
}

def compute_file_hash(filepath: str) -> str:
    """Berekent de SHA256 hash van een bestand voor verandering-detectie."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

async def analyze_document_content(text: str) -> Dict:
    """Gebruikt het LLM om een samenvatting en outline te genereren."""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    
    prompt = ChatPromptTemplate.from_template("""
    Analyseer de volgende tekst van een protocol of document van Zonnehoeve (zorginstelling).
    Genereer een beknopte samenvatting (max 3 zinnen) en een hiërarchische inhoudsopgave (outline).
    
    Formatteer het antwoord als JSON met de volgende structuur:
    {{
        "summary": "Korte tekstuele samenvatting...",
        "outline": [
            {{"title": "Hoofdstuk 1", "level": 1}},
            {{"title": "Paragraaf 1.1", "level": 2}},
            ...
        ]
    }}
    
    Tekst:
    {text}
    """)
    
    # We nemen alleen de eerste 10000 tekens voor de analyse om tokens te besparen en context limits te respecteren
    chain = prompt | llm | JsonOutputParser()
    try:
        return await chain.ainvoke({"text": text[:10000]})
    except Exception as e:
        logger.error(f"❌ Fout bij document analyse: {e}")
        return {"summary": "Geen samenvatting beschikbaar.", "outline": []}

async def update_document_metadata_async(db_session) -> None:
    """Vergelijkt bestandshashes en logt wijzigingen in de DocumentMetadata tabel."""
    from models import DocumentMetadata
    from sqlalchemy import select

    if not os.path.exists(RAW_DATA_PATH):
        return

    files = [
        f for f in os.listdir(RAW_DATA_PATH)
        if os.path.isfile(os.path.join(RAW_DATA_PATH, f)) and f != ".gitkeep"
    ]

    for filename in files:
        filepath = os.path.join(RAW_DATA_PATH, filename)
        current_hash = compute_file_hash(filepath)

        existing = (await db_session.execute(
            select(DocumentMetadata).where(DocumentMetadata.filename == filename)
        )).scalar_one_or_none()

        if existing is None or existing.file_hash != current_hash:
            # Document is nieuw of gewijzigd – analyseer inhoud
            # Snel document laden voor tekst-extractie (enkel de tekst)
            loader = None
            if filename.endswith(".pdf"):
                loader = PDFPlumberLoader(filepath)
            elif filename.endswith(".docx"):
                loader = Docx2txtLoader(filepath)
            
            content = ""
            if loader:
                docs = loader.load()
                content = "\n".join([d.page_content for d in docs])
            
            analysis = await analyze_document_content(content)
            
            if existing is None:
                doc_meta = DocumentMetadata(
                    filename=filename,
                    file_hash=current_hash,
                    last_ingested=datetime.utcnow(),
                    summary=analysis.get("summary"),
                    outline=analysis.get("outline")
                )
                db_session.add(doc_meta)
                logger.info(f"📄 Nieuw document geregistreerd en geanalyseerd: {filename}")
            else:
                existing.file_hash = current_hash
                existing.last_modified = datetime.utcnow()
                existing.summary = analysis.get("summary")
                existing.outline = analysis.get("outline")
                logger.info(f"🔔 Document bijgewerkt en herberekend: {filename}")

    await db_session.commit()

def load_documents() -> List[Document]:
    logger.info(f"📂 Zoeken naar documenten in: {RAW_DATA_PATH}")

    if not os.path.exists(RAW_DATA_PATH):
        logger.error(f"❌ De map '{RAW_DATA_PATH}' bestaat niet.")
        return []

    documents: List[Document] = []

    for glob_pattern, loader_cls in LOADER_MAPPING.items():
        loader = DirectoryLoader(RAW_DATA_PATH, glob=glob_pattern, loader_cls=loader_cls)
        docs = loader.load()
        if docs:
            logger.info(f"   - {len(docs)} pagina's gevonden voor {glob_pattern}.")
            documents.extend(docs)

    return documents

def split_text(documents: List[Document]) -> List[Document]:
    logger.info("✂️ Opsplitsen van tekst...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    logger.info(f"   - Totaal aantal chunks: {len(chunks)}")
    return chunks

import tempfile

def save_to_pgvector(chunks: List[Document]) -> None:
    logger.info("💾 Opslaan in PostgreSQL Vector Database...")
    # Normaliseer bron-paden naar enkel de bestandsnaam voor cross-platform compatibiliteit
    for chunk in chunks:
        if "source" in chunk.metadata:
            chunk.metadata["source"] = os.path.basename(chunk.metadata["source"])
            
    vector_store = get_vector_store()
    vector_store.add_documents(documents=chunks)
    logger.info("✅ Succes! Documenten toegevoegd aan database.")

async def process_single_file_from_memory(filename: str, content: bytes) -> None:
    """Verwerkt een bestand rechtstreeks vanuit Database BLOB geheugen."""
    logger.info(f"🚀 Start processing tijdelijke file via AI: {filename}")
    from models import DocumentMetadata
    from database import async_session_maker
    from sqlalchemy import select
    
    # 1. Update hash detectie
    sha256 = hashlib.sha256()
    sha256.update(content)
    current_hash = sha256.hexdigest()
    
    async with async_session_maker() as db_session:
        existing = (await db_session.execute(
            select(DocumentMetadata).where(DocumentMetadata.filename == filename)
        )).scalar_one_or_none()
        
        if existing and existing.file_hash == current_hash:
            logger.info(f"⏭️ {filename} is al up-to-date in vectordatabase (Hash match).")
            return

    # 2. Opslaan tijdelijk document
    ext = os.path.splitext(filename)[1].lower()
    suffix = ext if ext in [".pdf", ".docx"] else ".tmp"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(content)
        tmp_filepath = tmp_file.name
        
    try:
        loader = None
        if ext == ".pdf":
            loader = PDFPlumberLoader(tmp_filepath)
        elif ext == ".docx":
            loader = Docx2txtLoader(tmp_filepath)
            
        docs = []
        text_content = ""
        if loader:
            docs = loader.load()
            text_content = "\n".join([d.page_content for d in docs])
            for d in docs:
                d.metadata["source"] = filename # Override temp path
                
        # 3. LLM Analyse
        analysis = await analyze_document_content(text_content)
        
        # 4. Save metadata DB
        async with async_session_maker() as db_session:
            existing = (await db_session.execute(
                select(DocumentMetadata).where(DocumentMetadata.filename == filename)
            )).scalar_one_or_none()
            
            if existing is None:
                doc_meta = DocumentMetadata(
                    filename=filename,
                    file_hash=current_hash,
                    last_ingested=datetime.utcnow(),
                    summary=analysis.get("summary"),
                    outline=analysis.get("outline")
                )
                db_session.add(doc_meta)
            else:
                existing.file_hash = current_hash
                existing.last_modified = datetime.utcnow()
                existing.summary = analysis.get("summary")
                existing.outline = analysis.get("outline")
            await db_session.commit()
            
        # 5. Save vector chunks
        if docs:
            chunks = split_text(docs)
            save_to_pgvector(chunks)
            
    finally:
        # Altijd temp file weggooien
        if os.path.exists(tmp_filepath):
            os.remove(tmp_filepath)

async def main():
    # 1. Update metadata (hashes, outlines, summaries)
    from database import get_db
    async for db in get_db():
        await update_document_metadata_async(db)
        break # get_db is a generator, we only need one session
        
    # 2. Ingest documents into vector store
    docs = load_documents()
    if docs:
        chunks = split_text(docs)
        save_to_pgvector(chunks)

if __name__ == "__main__":
    asyncio.run(main())
