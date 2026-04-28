import os
import logging
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from vector_store import get_vector_store
from models import DocumentMetadata

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm_model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def get_metadata(self, filename: str) -> Optional[DocumentMetadata]:
        result = await self.db.execute(select(DocumentMetadata).where(DocumentMetadata.filename == filename))
        return result.scalar_one_or_none()

    async def _get_fallback_context(self, filename: str, query: str = "overzicht", k: int = 4) -> str:
        """Helper to get context from vector store when DB metadata is missing."""
        vector_store = get_vector_store()
        # Gebruik asynchrone zoekopdracht voor betere performance op Railway
        docs = await vector_store.asimilarity_search(
            query=query,
            k=k,
            filter={"source": filename}
        )
        return "\n\n".join([doc.page_content for doc in docs])

    async def get_suggestions(self, filename: str) -> List[str]:
        # Suggestions are usually dynamic or we can fallback to LLM
        context = await self._get_fallback_context(filename)
        if not context:
            return ["Wat zijn de belangrijkste punten?", "Wat moet ik weten over dit beleid?", "Wie is het contactpersoon?"]

        llm = ChatOpenAI(model=self.llm_model, temperature=0.7)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Je bent een assistent die medewerkers helpt bij het begrijpen van zorg-protocollen. "
                       "Op basis van de verstrekte tekst uit het document '{filename}', bedenk je 3 korte, relevante vragen die een medewerker zou kunnen stellen. "
                       "Geef ALLEEN een JSON lijst van strings terug."),
            ("human", "Tekst uit document:\n{context}")
        ])
        
        chain = prompt | llm | JsonOutputParser()
        chain_with_retry = chain.with_retry(stop_after_attempt=3)
        try:
            suggestions = await chain_with_retry.ainvoke({"filename": filename, "context": context})
            return suggestions[:3] if isinstance(suggestions, list) else []
        except Exception as e:
            logger.error(f"Error generating suggestions for {filename}: {e}")
            return ["Wat zijn de belangrijkste punten?", "Wat moet ik nu doen?", "Wie is verantwoordelijk?"]

    async def get_preview(self, filename: str) -> str:
        meta = await self.get_metadata(filename)
        if meta and meta.summary:
            return meta.summary

        context = await self._get_fallback_context(filename, k=1)
        if not context:
            return "Geen preview beschikbaar."

        llm = ChatOpenAI(model=self.llm_model, temperature=0.3)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Vat de volgende tekst uit het document '{filename}' samen in EXACT 2 korte, heldere zinnen voor een zorgmedewerker."),
            ("human", "{context}")
        ])
        
        chain = prompt | llm | StrOutputParser()
        try:
            preview = await chain.ainvoke({"filename": filename, "context": context})
            return preview.strip()
        except Exception as e:
            logger.error(f"Error generating preview for {filename}: {e}")
            return "Kon preview niet genereren."

    async def get_outline(self, filename: str) -> List[Dict]:
        meta = await self.get_metadata(filename)
        if meta and meta.outline:
            return meta.outline

        context = await self._get_fallback_context(filename, query="Inhoudsopgave", k=5)
        if not context:
            return []

        llm = ChatOpenAI(model=self.llm_model, temperature=0.1)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Je bent een expert in het structureren van zorg-protocollen. "
                       "Maak een beknopte inhoudsopgave van het document '{filename}' op basis van de verstrekte tekst. "
                       "Geef een JSON lijst terug met objecten: {{'title': 'Hoofdstuknaam', 'page': paginanummer}}. "
                       "Zorg dat de paginanummers overeenkomen met de tekst indien vermeld, anders schatting."),
            ("human", "Tekst:\n{context}")
        ])
        
        chain = prompt | llm | JsonOutputParser()
        chain_with_retry = chain.with_retry(stop_after_attempt=3)
        try:
            outline = await chain_with_retry.ainvoke({"filename": filename, "context": context})
            return outline if isinstance(outline, list) else []
        except Exception as e:
            logger.error(f"Error generating outline for {filename}: {e}")
            return []

    async def delete_document(self, filename: str) -> bool:
        """Verwijdert een document uit alle opslaglagen (Files, Metadata, Vector Store)."""
        from models import DocumentFile, DocumentMetadata
        from sqlalchemy import delete
        
        try:
            # 1. Verwijder uit DocumentFile (Viewer)
            await self.db.execute(delete(DocumentFile).where(DocumentFile.filename == filename))
            
            # 2. Verwijder uit DocumentMetadata
            await self.db.execute(delete(DocumentMetadata).where(DocumentMetadata.filename == filename))
            
            # 3. Verwijder uit Vector Store
            # Let op: LangChain PGVector's delete() verwacht IDs.
            # We kunnen direct SQL gebruiken voor meer efficiëntie bij metadata-filtering.
            vector_store = get_vector_store()
            # De tabelnaam is standaard 'langchain_pg_embedding' tenzij anders geconfigureerd.
            # We filteren op de metadata kolom (jsonb).
            sql = "DELETE FROM langchain_pg_embedding WHERE cmetadata->>'source' = :filename"
            from sqlalchemy import text
            await self.db.execute(text(sql), {"filename": filename})
            
            await self.db.commit()
            logger.info(f"✅ Document '{filename}' succesvol verwijderd uit alle systemen.")
            return True
        except Exception as e:
            logger.error(f"❌ Fout bij verwijderen van document '{filename}': {e}")
            await self.db.rollback()
            return False
