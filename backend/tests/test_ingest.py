import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from ingest import compute_file_hash, split_text, update_document_metadata_async, process_single_file_from_memory
from langchain_core.documents import Document

def test_compute_file_hash(tmp_path):
    """Test SHA256 file hashing."""
    content = b"test content"
    test_file = tmp_path / "test.txt"
    test_file.write_bytes(content)
    h1 = compute_file_hash(str(test_file))
    h2 = compute_file_hash(str(test_file))
    assert h1 == h2
    assert len(h1) == 64

def test_split_text():
    """Test document splitting logic."""
    doc = Document(page_content="A" * 2000, metadata={"source": "long.pdf"})
    chunks = split_text([doc])
    assert len(chunks) > 1
    assert all(len(c.page_content) <= 1200 for c in chunks)

@pytest.mark.anyio
async def test_update_document_metadata_new_file(tmp_path):
    """Test metadata update for a new document."""
    mock_db = AsyncMock()
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    
    with patch("ingest.analyze_document_content", new_callable=AsyncMock) as mock_analyze, \
         patch("ingest.PDFPlumberLoader") as mock_pdf_loader:
         
        mock_analyze.return_value = {"summary": "New", "outline": []}
        mock_loader_instance = mock_pdf_loader.return_value
        mock_loader_instance.load.return_value = [Document(page_content="mocked content")]
        
        with patch("ingest.RAW_DATA_PATH", str(tmp_path)):
            test_file = tmp_path / "new.pdf"
            test_file.write_bytes(b"dummy")
            await update_document_metadata_async(mock_db)
            assert mock_db.add.called
            assert mock_db.commit.called

@pytest.mark.anyio
async def test_process_single_file_from_memory():
    """Test memory-based ingestion."""
    mock_vs = MagicMock()
    mock_vs.add_documents = AsyncMock()
    
    with patch("ingest.get_vector_store", return_value=mock_vs), \
         patch("ingest.PDFPlumberLoader") as mock_pdf_loader, \
         patch("ingest.async_session_maker") as mock_session_maker:
        
        mock_loader_instance = mock_pdf_loader.return_value
        mock_loader_instance.load.return_value = [Document(page_content="content")]
        
        mock_session = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_res
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        
        await process_single_file_from_memory("test.pdf", b"pdfcontent")
        
        assert mock_vs.add_documents.called
        assert mock_session.commit.called

def test_save_to_pgvector():
    mock_vs = MagicMock()
    with patch("ingest.get_vector_store", return_value=mock_vs):
        chunks = [Document(page_content="c1", metadata={"source": "path/to/file.pdf"})]
        from ingest import save_to_pgvector
        save_to_pgvector(chunks)
        assert mock_vs.add_documents.called
        assert chunks[0].metadata["source"] == "file.pdf"

@pytest.mark.anyio
async def test_ingest_main():
    with patch("ingest.update_document_metadata_async", new_callable=AsyncMock) as mock_meta, \
         patch("ingest.async_session_maker") as mock_session_maker, \
         patch("ingest.load_documents"), \
         patch("ingest.split_text"), \
         patch("ingest.save_to_pgvector"), \
         patch("os.listdir", return_value=[]), \
         patch("ingest.get_db") as mock_get_db:
        
        # mock_get_db is an async generator
        async def mock_gen():
            yield AsyncMock()
        mock_get_db.return_value = mock_gen()
        
        mock_session = AsyncMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        
        from ingest import main
        await main()
        
        assert mock_meta.called
        assert mock_session.commit.called
