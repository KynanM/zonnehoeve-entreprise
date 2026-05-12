import logging
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from models import DocumentMetadata, DocumentFile
from services.analysis_service import AnalysisService
from vector_store import get_vector_store

logger = logging.getLogger(__name__)

class DocumentService:
    """Service for managing document metadata, suggestions, and deletion."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.analysis_service = AnalysisService()

    async def get_metadata(self, filename: str) -> Optional[DocumentMetadata]:
        result = await self.db.execute(select(DocumentMetadata).where(DocumentMetadata.filename == filename))
        return result.scalar_one_or_none()

    async def _get_fallback_context(self, filename: str, query: str = "overzicht", k: int = 4) -> str:
        """Helper to get context from vector store when DB metadata is missing."""
        vector_store = get_vector_store()
        docs = await vector_store.asimilarity_search(
            query=query,
            k=k,
            filter={"source": filename}
        )
        return "\n\n".join([doc.page_content for doc in docs])

    async def get_suggestions(self, filename: str) -> List[str]:
        context = await self._get_fallback_context(filename)
        if not context:
            return ["Wat zijn de belangrijkste punten?", "Wat moet ik weten over dit beleid?", "Wie is het contactpersoon?"]
        return await self.analysis_service.generate_suggestions(filename, context)

    async def get_preview(self, filename: str) -> str:
        meta = await self.get_metadata(filename)
        if meta and meta.summary:
            return meta.summary

        context = await self._get_fallback_context(filename, k=1)
        if not context:
            return "Geen preview beschikbaar."

        # Fallback analysis for preview
        analysis = await self.analysis_service.analyze_document(context)
        return analysis.get("summary", "Kon preview niet genereren.")

    async def get_outline(self, filename: str) -> List[Dict]:
        meta = await self.get_metadata(filename)
        if meta and meta.outline:
            return meta.outline

        context = await self._get_fallback_context(filename, query="Inhoudsopgave", k=5)
        if not context:
            return []

        analysis = await self.analysis_service.analyze_document(context)
        return analysis.get("outline", [])

    async def delete_document(self, filename: str) -> bool:
        """Verwijdert een document uit alle opslaglagen (Files, Metadata, Vector Store)."""
        try:
            # 1. Verwijder uit DocumentFile (Viewer)
            await self.db.execute(delete(DocumentFile).where(DocumentFile.filename == filename))
            
            # 2. Verwijder uit DocumentMetadata
            await self.db.execute(delete(DocumentMetadata).where(DocumentMetadata.filename == filename))
            
            # 3. Verwijder uit Vector Store
            sql = "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'source' = :filename"
            await self.db.execute(text(sql), {"filename": filename})
            
            await self.db.commit()
            logger.info(f"✅ Document '{filename}' succesvol verwijderd uit alle systemen.")
            return True
        except Exception as e:
            logger.error(f"❌ Fout bij verwijderen van document '{filename}': {e}")
            await self.db.rollback()
            return False
