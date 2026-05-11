import os
import logging
from typing import Dict, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)

class AnalysisService:
    """Service for analyzing document content using LLMs."""

    def __init__(self, model: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(model=model, temperature=0)

    async def analyze_document(self, text: str) -> Dict:
        """Generates a summary and outline for the given text."""
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
        
        # Limit text to 10000 characters to save tokens and avoid context limits
        chain = prompt | self.llm | JsonOutputParser()
        try:
            return await chain.ainvoke({"text": text[:10000]})
        except Exception as e:
            logger.error(f"❌ Error during document analysis: {e}")
            return {"summary": "Geen samenvatting beschikbaar.", "outline": []}

    async def generate_suggestions(self, filename: str, context: str) -> List[str]:
        """Generates 3 relevant questions based on document context."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Je bent een assistent die medewerkers helpt bij het begrijpen van zorg-protocollen. "
                       "Op basis van de verstrekte tekst uit het document '{filename}', bedenk je 3 korte, relevante vragen die een medewerker zou kunnen stellen. "
                       "Geef ALLEEN een JSON lijst van strings terug."),
            ("human", "Tekst uit document:\n{context}")
        ])
        
        chain = prompt | self.llm | JsonOutputParser()
        try:
            suggestions = await chain.ainvoke({"filename": filename, "context": context})
            return suggestions[:3] if isinstance(suggestions, list) else []
        except Exception as e:
            logger.error(f"Error generating suggestions for {filename}: {e}")
            return [
                "Wat zijn de belangrijkste punten?",
                "Wat moet ik nu doen?",
                "Wie is verantwoordelijk?"
            ]
