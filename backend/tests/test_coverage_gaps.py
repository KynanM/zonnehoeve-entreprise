import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.chat_service import ChatService
from services.ingestion_service import IngestionService
from models import ChatLog

@pytest.mark.anyio
async def test_create_chat_log_new_thread():
    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.add = MagicMock() # Sync method
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None # New thread
    mock_session.execute.return_value = mock_res
    
    service = ChatService(mock_session, MagicMock())
    await service.create_chat_log("t1", "Hello")
    
    assert mock_session.add.called
    assert mock_session.commit.called

@pytest.mark.anyio
async def test_update_chat_log_success():
    mock_session = MagicMock()
    mock_session.get = AsyncMock()
    mock_session.commit = AsyncMock()
    
    # Use a real object to avoid mock attribute issues
    mock_log = ChatLog(id=1, bot_response="old")
    mock_session.get.return_value = mock_log
    
    service = ChatService(mock_session, MagicMock())
    await service.update_chat_log(1, "Response", ["src.pdf"], 1.0)
    
    assert mock_log.bot_response == "Response"
    assert mock_session.commit.called

@pytest.mark.anyio
async def test_ingest_process_file_new(tmp_path):
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock() # Sync method
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    with patch("services.analysis_service.AnalysisService.analyze_document", new_callable=AsyncMock) as mock_analyze, \
         patch("services.ingestion_service.get_vector_store") as mock_vs_getter:
        
        mock_analyze.return_value = {"summary": "New", "outline": []}
        mock_vs = MagicMock()
        mock_vs_getter.return_value = mock_vs
        
        # Mock the loader instance and class
        mock_loader_instance = MagicMock()
        mock_loader_instance.load.return_value = [MagicMock(page_content="text", metadata={})]
        mock_loader_cls = MagicMock(return_value=mock_loader_instance)
        
        service = IngestionService(mock_db)
        # Manually override the loader mapping for the test
        service.LOADER_MAPPING = {".pdf": mock_loader_cls}
        
        await service.process_file("test.pdf", b"content")
        
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_vs.add_documents.called

@pytest.mark.anyio
async def test_ingest_sync_local_directory(tmp_path):
    mock_db = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock() # Sync method
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    test_file = tmp_path / "test.pdf"
    test_file.write_bytes(b"content")
    
    with patch("services.ingestion_service.IngestionService.process_file", new_callable=AsyncMock) as mock_process:
        service = IngestionService(mock_db)
        await service.sync_local_directory(str(tmp_path))
        assert mock_process.called
