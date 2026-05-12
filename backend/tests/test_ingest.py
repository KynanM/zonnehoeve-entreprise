import pytest
from unittest.mock import patch, AsyncMock
from services.hash_service import HashService
from services.ingestion_service import IngestionService
from langchain_core.documents import Document
import ingest

def test_compute_file_hash(tmp_path):
    """Test SHA256 file hashing via HashService."""
    content = b"test content"
    test_file = tmp_path / "test.txt"
    test_file.write_bytes(content)
    h1 = HashService.compute_file_hash(str(test_file))
    h2 = HashService.compute_file_hash(str(test_file))
    assert h1 == h2
    assert len(h1) == 64

def test_split_text():
    """Test document splitting logic in IngestionService."""
    service = IngestionService(AsyncMock())
    doc = Document(page_content="A" * 2000, metadata={"source": "long.pdf"})
    chunks = service.text_splitter.split_documents([doc])
    assert len(chunks) > 1
    assert all(len(c.page_content) <= 1200 for c in chunks)

@pytest.mark.anyio
async def test_process_single_file_from_memory():
    """Test the entry point in ingest.py."""
    with patch("ingest.IngestionService", autospec=True) as mock_service_cls:
        mock_instance = mock_service_cls.return_value
        mock_instance.process_file = AsyncMock()
        
        await ingest.process_single_file_from_memory("test.pdf", b"pdfcontent")
        
        assert mock_instance.process_file.called

@pytest.mark.anyio
async def test_ingest_main():
    """Test the CLI entry point in ingest.py."""
    with patch("ingest.IngestionService", autospec=True) as mock_service_cls:
        mock_instance = mock_service_cls.return_value
        mock_instance.sync_local_directory = AsyncMock()
        
        await ingest.main()
        
        assert mock_instance.sync_local_directory.called
