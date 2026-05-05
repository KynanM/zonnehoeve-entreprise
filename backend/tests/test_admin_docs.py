import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock, patch
from database import get_db

@pytest.mark.anyio
async def test_list_documents_enhanced():
    """Test of de documentenlijst de juiste metadata bevat."""
    # Mock database session en resultaten
    mock_db = AsyncMock()
    
    mock_row = {
        "filename": "test_protocol.pdf",
        "uploaded_at": MagicMock(),
        "mime_type": "application/pdf",
        "last_ingested": MagicMock()
    }
    mock_row["uploaded_at"].isoformat.return_value = "2024-01-01T12:00:00"
    
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row]
    mock_db.execute.return_value = mock_result
    
    # Override get_db dependency
    app.dependency_overrides[get_db] = lambda: mock_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/")
        
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test_protocol.pdf"
    assert data[0]["is_ingested"] is True
    
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_delete_document_endpoint():
    """Test of het delete endpoint de service correct aanroept."""
    # Mock auth en service
    from api.auth import verify_admin
    
    with patch("services.document_service.DocumentService.delete_document", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = True
        
        # We moeten ook get_db overriden anders faalt de dependency injection
        mock_db = AsyncMock()
        app.dependency_overrides[get_db] = lambda: mock_db
        app.dependency_overrides[verify_admin] = lambda: True
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # We voegen de header toe die verify_admin verwacht, ook al hebben we het gepatcht
            response = await ac.delete("/api/documents/test.pdf", headers={"x-admin-key": "test"})
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_delete.assert_called_once_with("test.pdf")
        
        app.dependency_overrides.clear()
