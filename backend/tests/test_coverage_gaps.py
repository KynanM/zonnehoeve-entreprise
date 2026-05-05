import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from api.chat import create_chat_log, update_chat_log

@pytest.mark.anyio
async def test_create_chat_log_new_thread():
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None # New thread
    mock_session.execute.return_value = mock_res
    
    with patch("api.chat.async_session_maker") as mock_maker:
        mock_maker.return_value.__aenter__.return_value = mock_session
        await create_chat_log("t1", "Hello")
        assert mock_session.add.called
        assert mock_session.commit.called

@pytest.mark.anyio
async def test_update_chat_log_success():
    mock_session = AsyncMock()
    mock_log = MagicMock()
    mock_session.get.return_value = mock_log
    
    with patch("api.chat.async_session_maker") as mock_maker:
        mock_maker.return_value.__aenter__.return_value = mock_session
        await update_chat_log(1, "Response", ["src.pdf"], 1.0)
        assert mock_log.bot_response == "Response"
        assert mock_session.commit.called

@pytest.mark.anyio
async def test_ingest_update_branch(tmp_path):
    from ingest import update_document_metadata_async
    mock_db = AsyncMock()
    from models import DocumentMetadata
    mock_existing = DocumentMetadata(filename="test.pdf", file_hash="old")
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_existing)
    
    with patch("ingest.compute_file_hash", return_value="new"), \
         patch("ingest.analyze_document_content", new_callable=AsyncMock) as mock_analyze, \
         patch("ingest.PDFPlumberLoader") as mock_loader, \
         patch("ingest.RAW_DATA_PATH", str(tmp_path)):
        
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(b"content")
        mock_analyze.return_value = {"summary": "Updated", "outline": []}
        mock_loader.return_value.load.return_value = [MagicMock(page_content="text")]
        
        await update_document_metadata_async(mock_db)
        assert mock_existing.file_hash == "new"
        assert mock_existing.summary == "Updated"

@pytest.mark.anyio
async def test_ingest_load_documents(tmp_path):
    from ingest import load_documents
    with patch("ingest.RAW_DATA_PATH", str(tmp_path)), \
         patch("ingest.DirectoryLoader") as mock_dir_loader:
        mock_dir_loader.return_value.load.return_value = [MagicMock()]
        docs = load_documents()
        assert len(docs) > 0
