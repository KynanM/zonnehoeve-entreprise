import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.ingestion_service import IngestionService
from services.analysis_service import AnalysisService
from services.socket_manager import ConnectionManager
from langchain_core.documents import Document

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_ingestion_service_process_file_success_new():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    
    # Mocking external calls
    with patch("services.hash_service.HashService.compute_content_hash", return_value="new_hash"), \
         patch.object(service, "_get_metadata", return_value=None), \
         patch("services.analysis_service.AnalysisService.analyze_document", return_value={"summary": "sum", "outline": []}), \
         patch("langchain_community.document_loaders.PDFPlumberLoader.load", return_value=[Document(page_content="text")]), \
         patch.object(service, "_save_to_vector_store", return_value=None):
        
        await service.process_file("test.pdf", b"content")
        
        # Verify DB add was called for new metadata
        assert mock_db.add.called
        assert mock_db.commit.called

@pytest.mark.anyio
async def test_ingestion_service_process_file_existing_update():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    
    mock_meta = MagicMock()
    mock_meta.file_hash = "old_hash"
    
    with patch("services.hash_service.HashService.compute_content_hash", return_value="new_hash"), \
         patch.object(service, "_get_metadata", return_value=mock_meta), \
         patch("services.analysis_service.AnalysisService.analyze_document", return_value={"summary": "sum", "outline": []}), \
         patch("langchain_community.document_loaders.PDFPlumberLoader.load", return_value=[Document(page_content="text")]), \
         patch.object(service, "_save_to_vector_store", return_value=None):
        
        await service.process_file("test.pdf", b"content")
        
        # Verify metadata was updated
        assert mock_meta.file_hash == "new_hash"
        assert mock_db.commit.called

@pytest.mark.anyio
async def test_analysis_service_analyze():
    service = AnalysisService()
    
    # Mock the chain.ainvoke result
    mock_result = {"summary": "test summary", "outline": []}
    
    with patch("langchain_core.runnables.base.RunnableSequence.ainvoke", new_callable=AsyncMock) as mock_ainvoke:
        mock_ainvoke.return_value = mock_result
        result = await service.analyze_document("some text content")
        assert result["summary"] == "test summary"
        assert isinstance(result["outline"], list)

@pytest.mark.anyio
async def test_analysis_service_suggestions():
    service = AnalysisService()
    mock_result = ["Q1", "Q2", "Q3"]
    
    with patch("langchain_core.runnables.base.RunnableSequence.ainvoke", new_callable=AsyncMock) as mock_ainvoke:
        mock_ainvoke.return_value = mock_result
        result = await service.generate_suggestions("test.pdf", "context")
        assert len(result) == 3
        assert result[0] == "Q1"

@pytest.mark.anyio
async def test_ingestion_service_unsupported_file():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    with patch("services.hash_service.HashService.compute_content_hash", return_value="h"), \
         patch.object(service, "_get_metadata", return_value=None):
        await service.process_file("test.txt", b"content")
        assert not mock_db.add.called

@pytest.mark.anyio
async def test_ingestion_service_save_to_vector_store():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    chunks = [Document(page_content="c", metadata={})]
    
    with patch("services.ingestion_service.get_vector_store") as mock_vs_func, \
         patch("asyncio.to_thread", new_callable=AsyncMock) as mock_thread:
        mock_vs = MagicMock()
        mock_vs_func.return_value = mock_vs
        await service._save_to_vector_store(chunks, "test.pdf")
        assert mock_thread.called

@pytest.mark.anyio
async def test_ensure_document_file_update():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    
    mock_existing = MagicMock()
    mock_existing.data = b"old"
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_existing
    
    mock_db.execute.return_value = mock_res
    await service._ensure_document_file("test.pdf", b"new")
    assert mock_existing.data == b"new"
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_analysis_service_error_handling():
    service = AnalysisService()
    with patch("langchain_core.runnables.base.RunnableSequence.ainvoke", side_effect=Exception("LLM Error")):
        res = await service.analyze_document("text")
        assert "Geen samenvatting" in res["summary"]
        
        sug = await service.generate_suggestions("f", "c")
        assert len(sug) == 3
        assert "belangrijkste punten" in sug[0]

@pytest.mark.anyio
async def test_socket_manager_lifecycle():
    manager = ConnectionManager()
    mock_ws = AsyncMock()
    
    # Test connect
    await manager.connect(mock_ws, room="admin")
    assert mock_ws in manager.active_connections["admin"]
    
    # Test broadcast success
    await manager.broadcast({"msg": "test"}, room="admin")
    assert mock_ws.send_json.called
    
    # Test broadcast error & cleanup
    mock_ws.send_json.side_effect = Exception("Send failed")
    await manager.broadcast({"msg": "fail"}, room="admin")
    assert mock_ws not in manager.active_connections["admin"]

@pytest.mark.anyio
async def test_chat_service_create_log_new_thread():
    from services.chat_service import ChatService
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res
    
    mock_app_state = MagicMock()
    service = ChatService(mock_db, mock_app_state)
    
    await service.create_chat_log("new-thread", "hello")
    assert mock_db.add.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_chat_service_update_log():
    from services.chat_service import ChatService
    mock_db = AsyncMock()
    mock_log = MagicMock()
    mock_db.get.return_value = mock_log
    
    mock_app_state = MagicMock()
    service = ChatService(mock_db, mock_app_state)
    
    await service.update_chat_log(1, "response", ["source"], 1.0)
    assert mock_log.bot_response == "response"
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_hash_service_content():
    from services.hash_service import HashService
    h = HashService.compute_content_hash(b"test")
    assert len(h) == 64
    
    h2 = HashService.compute_content_hash(b"test")
    assert h == h2

@pytest.mark.anyio
async def test_ingestion_service_sync_dir():
    mock_db = AsyncMock()
    service = IngestionService(mock_db)
    
    with patch("os.path.exists", return_value=True), \
         patch("os.listdir", return_value=["test.pdf"]), \
         patch.object(service, "_ensure_document_file", new_callable=AsyncMock) as mock_ensure, \
         patch.object(service, "process_file", new_callable=AsyncMock) as mock_proc:
        
        with patch("builtins.open") as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = b"content"
            await service.sync_local_directory("/some/dir")
            assert mock_ensure.called
            assert mock_proc.called
