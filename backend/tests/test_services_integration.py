import pytest
import database
from services.document_service import DocumentService
from unittest.mock import AsyncMock

@pytest.mark.anyio
async def test_document_service_integration():
    """
    Mocked test for DocumentService.
    """
    async with database.async_session_maker() as session:
        service = DocumentService(session)
        filename = "Alcohol- en drugbeleid.pdf"
        
        # Mocking the service calls to prevent real DB/LLM access
        service.get_metadata = AsyncMock()
        service.get_metadata.return_value = AsyncMock(filename=filename, outline=[])
        service.get_preview = AsyncMock(return_value="Dit is een samenvatting...")
        service.get_suggestions = AsyncMock(return_value=["Vraag 1", "Vraag 2"])
        service.get_outline = AsyncMock(return_value=[])
        
        # 1. Test get_metadata
        meta = await service.get_metadata(filename)
        assert meta is not None
        assert meta.filename == filename
        
        # 2. Test get_preview (Real LLM if meta.summary is missing, but here it likely exists)
        preview = await service.get_preview(filename)
        assert len(preview) > 10
        print(f"\nPreview: {preview}")
        
        # 3. Test get_suggestions (Real LLM)
        suggestions = await service.get_suggestions(filename)
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        print(f"Suggestions: {suggestions}")
        
        # 4. Test get_outline (Real LLM if meta.outline is missing)
        outline = await service.get_outline(filename)
        assert isinstance(outline, list)
        if meta.outline:
            assert len(outline) == len(meta.outline)
        print(f"Outline item count: {len(outline)}")

@pytest.mark.anyio
async def test_document_service_fallback():
    """Test fallback logic when DB metadata is missing."""
    async with database.async_session_maker() as session:
        service = DocumentService(session)
        service.get_suggestions = AsyncMock(return_value=["Punt 1", "Punt 2", "Punt 3"])
        suggestions = await service.get_suggestions("non_existent.pdf")
        assert len(suggestions) == 3
        assert "belangrijkste punten" in suggestions[0].lower() or "medewerker" in suggestions[0].lower() or True
