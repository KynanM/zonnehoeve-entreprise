import os
import logging
import asyncio
import tempfile
import mimetypes
from datetime import datetime, timezone
from typing import List, Optional, Type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.documents import Document
from langchain_community.document_loaders.base import BaseLoader
from langchain_community.document_loaders import PDFPlumberLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from models import DocumentFile, DocumentMetadata
from vector_store import get_vector_store
from services.hash_service import HashService
from services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)

class IngestionService:
    """Service to coordinate the document ingestion workflow."""

    LOADER_MAPPING: dict[str, Type[BaseLoader]] = {
        ".pdf": PDFPlumberLoader,
        ".docx": Docx2txtLoader
    }

    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.analysis_service = AnalysisService()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    async def process_file(self, filename: str, content: bytes) -> None:
        """Processes a file from memory: hashing, analysis, DB sync, and vectorization."""
        filename = filename.strip()
        logger.info(f"🚀 Processing document: {filename}")
        
        # 1. Hashing & Deduplication
        current_hash = HashService.compute_content_hash(content)
        existing_meta = await self._get_metadata(filename)
        
        if existing_meta and existing_meta.file_hash == current_hash:
            logger.info(f"⏭️ {filename} is already up-to-date (Hash match).")
            return

        # 2. Parsing (using temp file for LangChain loaders)
        ext = os.path.splitext(filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            tmp_file.write(content)
            tmp_filepath = tmp_file.name
            
        try:
            loader_cls = self.LOADER_MAPPING.get(ext)
            if not loader_cls:
                logger.warning(f"Unsupported file type: {ext}")
                return

            loader = loader_cls(tmp_filepath)
            docs = loader.load()
            text_content = "\n".join([d.page_content for d in docs])
            
            # Ensure metadata source is clean
            for d in docs:
                d.metadata["source"] = filename

            # 3. LLM Analysis
            analysis = await self.analysis_service.analyze_document(text_content)
            
            # 4. Database Sync (Metadata)
            if existing_meta:
                existing_meta.file_hash = current_hash
                existing_meta.last_modified = datetime.now(timezone.utc)
                existing_meta.summary = analysis.get("summary")
                existing_meta.outline = analysis.get("outline")
            else:
                new_meta = DocumentMetadata(
                    filename=filename,
                    file_hash=current_hash,
                    last_ingested=datetime.now(timezone.utc),
                    summary=analysis.get("summary"),
                    outline=analysis.get("outline")
                )
                self.db.add(new_meta)
            
            await self.db.commit()
            
            # 5. Vector Store Ingestion
            if docs:
                chunks = self.text_splitter.split_documents(docs)
                await self._save_to_vector_store(chunks, filename)
                
        finally:
            if os.path.exists(tmp_filepath):
                os.remove(tmp_filepath)

    async def _get_metadata(self, filename: str) -> Optional[DocumentMetadata]:
        result = await self.db.execute(
            select(DocumentMetadata).where(DocumentMetadata.filename == filename)
        )
        return result.scalar_one_or_none()

    async def _save_to_vector_store(self, chunks: List[Document], filename: str) -> None:
        """Saves document chunks to PGVector, clearing old ones first."""
        logger.info(f"💾 Saving {len(chunks)} chunks to vector store for {filename}")
        
        # Normalize source in metadata
        for chunk in chunks:
            chunk.metadata["source"] = filename
            
        vector_store = get_vector_store()
        
        # Clear existing embeddings for this file to avoid duplicates
        # We use a direct SQL delete for efficiency if possible, or VS delete if supported
        sql = "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'source' = :filename"
        from sqlalchemy import text
        await self.db.execute(text(sql), {"filename": filename})
        await self.db.commit()

        # Add new documents (running in thread to avoid blocking event loop if VS is synchronous)
        await asyncio.to_thread(vector_store.add_documents, chunks)
        logger.info(f"✅ Successfully vectorized {filename}")

    async def sync_local_directory(self, directory_path: str) -> None:
        """Syncs all documents from a local directory to DB and Vector Store."""
        if not os.path.exists(directory_path):
            logger.error(f"Directory not found: {directory_path}")
            return

        files = [f for f in os.listdir(directory_path) if f.endswith(tuple(self.LOADER_MAPPING.keys()))]
        for filename in files:
            filepath = os.path.join(directory_path, filename)
            with open(filepath, "rb") as f:
                content = f.read()
            
            # Ensure it's in DocumentFile for viewer too
            await self._ensure_document_file(filename, content)
            await self.process_file(filename, content)

    async def _ensure_document_file(self, filename: str, content: bytes) -> None:
        """Ensures the document binary is in the DocumentFile table."""
        filename = filename.strip()
        result = await self.db.execute(select(DocumentFile).where(DocumentFile.filename == filename))
        existing = result.scalar_one_or_none()
        
        mime_type = mimetypes.guess_type(filename)[0] or "application/pdf"
        
        if existing:
            if existing.data != content:
                existing.data = content
                existing.uploaded_at = datetime.now(timezone.utc)
        else:
            new_file = DocumentFile(filename=filename, data=content, mime_type=mime_type)
            self.db.add(new_file)
        
        await self.db.commit()
