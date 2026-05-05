import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock, patch
from database import get_db
from models import DocumentFile, DocumentMetadata
from datetime import datetime, timezone

@pytest.fixture
def mock_db():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()

@pytest.fixture
def mock_admin():
    from api.auth import verify_admin
    app.dependency_overrides[verify_admin] = lambda: True
    yield
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_list_documents_enhanced(mock_db):
    """Test of de documentenlijst de juiste metadata bevat."""
    mock_row = {
        "filename": "test_protocol.pdf",
        "uploaded_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "mime_type": "application/pdf",
        "last_ingested": datetime(2024, 1, 1, tzinfo=timezone.utc)
    }
    
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row]
    mock_db.execute.return_value = mock_result
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/")
        
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test_protocol.pdf"
    assert data[0]["is_ingested"] is True

@pytest.mark.anyio
async def test_list_documents_fallback(mock_db):
    """Test fallback naar enkel filenames als join faalt."""
    mock_db.execute.side_effect = [Exception("DB Error"), MagicMock(scalars=lambda: MagicMock(all=lambda: ["test.pdf"]))]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/")
        
    assert response.status_code == 200
    assert response.json()[0]["filename"] == "test.pdf"

@pytest.mark.anyio
async def test_get_recent_updates(mock_db):
    mock_meta = DocumentMetadata(filename="recent.pdf", last_modified=datetime.now(timezone.utc))
    mock_db.execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: [mock_meta]))
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/updates/recent")
    
    assert response.status_code == 200
    assert response.json()[0]["filename"] == "recent.pdf"

@pytest.mark.anyio
async def test_get_document_success(mock_db):
    mock_file = DocumentFile(filename="test.pdf", data=b"pdfcontent", mime_type="application/pdf")
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_file)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/test.pdf")
    
    assert response.status_code == 200
    assert response.content == b"pdfcontent"

@pytest.mark.anyio
async def test_get_document_not_found(mock_db):
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/missing.pdf")
    assert response.status_code == 404

@pytest.mark.anyio
async def test_get_document_preview(mock_db):
    mock_meta = DocumentMetadata(filename="test.pdf", summary="Summary text")
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_meta)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/test.pdf/preview")
    assert response.status_code == 200
    assert response.json() == "Summary text"

@pytest.mark.anyio
async def test_get_document_outline(mock_db):
    mock_meta = DocumentMetadata(filename="test.pdf", outline=[{"title": "H1", "page": 1}])
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_meta)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/test.pdf/outline")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "H1"

@pytest.mark.anyio
async def test_suggest_questions(mock_db):
    mock_meta = DocumentMetadata(filename="test.pdf", summary="Summary")
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_meta)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/test.pdf/suggest-questions")
    assert response.status_code == 200
    assert len(response.json()) == 3

@pytest.mark.anyio
async def test_upload_document_new(mock_db, mock_admin):
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    
    files = {"file": ("test.pdf", b"content", "application/pdf")}
    with patch("ingest.process_single_file_from_memory"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/documents/upload", files=files)
        
        assert response.status_code == 200
        assert mock_db.add.called
        assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_document_endpoint(mock_db, mock_admin):
    """Test of het delete endpoint de service correct aanroept."""
    with patch("services.document_service.DocumentService.delete_document", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = True
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.delete("/api/documents/test.pdf")
        
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_delete.assert_called_once_with("test.pdf")

@pytest.mark.anyio
async def test_search_documents_empty_query(mock_db):
    mock_db.execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: ["file1.pdf"]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/documents/search?q=a")
    assert response.status_code == 200
    assert response.json() == ["file1.pdf"]
