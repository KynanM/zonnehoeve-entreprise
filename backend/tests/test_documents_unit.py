import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_list_documents_success():
    mock_res = MagicMock()
    mock_res.mappings.return_value.all.return_value = [{"filename": "test.pdf", "uploaded_at": None, "mime_type": "pdf", "last_ingested": None}]
    
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_res
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/")
            assert response.status_code == 200
            assert isinstance(response.json(), list)

@pytest.mark.anyio
async def test_delete_document_authorized():
    with patch("api.auth.ADMIN_API_KEY", "test_key"), \
         patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.delete("/api/documents/test.pdf", headers={"x-admin-key": "test_key"})
            assert response.status_code == 200

@pytest.mark.anyio
async def test_get_recent_updates_success():
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_res
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/updates/recent")
            assert response.status_code == 200

@pytest.mark.anyio
async def test_get_document_preview():
    with patch("services.document_service.DocumentService.get_preview", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {"summary": "test"}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/test.pdf/preview")
            assert response.status_code == 200

@pytest.mark.anyio
async def test_get_document_outline():
    with patch("services.document_service.DocumentService.get_outline", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = []
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/test.pdf/outline")
            assert response.status_code == 200

@pytest.mark.anyio
async def test_suggest_questions():
    with patch("services.document_service.DocumentService.get_suggestions", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ["Q1"]
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/test.pdf/suggest-questions")
            assert response.status_code == 200

@pytest.mark.anyio
async def test_search_documents_success():
    with patch("api.documents.get_vector_store") as mock_vs_func:
        mock_vs = MagicMock()
        mock_vs_func.return_value = mock_vs
        mock_vs.similarity_search = MagicMock(return_value=[])
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/documents/search?q=querytest")
            assert response.status_code == 200

@pytest.mark.anyio
async def test_auth_no_key_error():
    from api.auth import verify_admin
    with patch("api.auth.ADMIN_API_KEY", None):
        with pytest.raises(Exception) as exc:
            await verify_admin("somekey")
        assert "Admin configuratiefout" in str(exc.value)
