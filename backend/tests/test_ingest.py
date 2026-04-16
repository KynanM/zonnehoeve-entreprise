import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from ingest import compute_file_hash, split_text, update_document_metadata_async
from langchain_core.documents import Document

def test_compute_file_hash(tmp_path):
    """Test SHA256 file hashing."""
    # Given
    content = b"test content"
    test_file = tmp_path / "test.txt"
    test_file.write_bytes(content)
    
    # When
    h1 = compute_file_hash(str(test_file))
    h2 = compute_file_hash(str(test_file))
    
    # Assert
    assert h1 == h2
    assert len(h1) == 64

def test_split_text():
    """Test document splitting logic."""
    # Given
    doc = Document(page_content="A" * 2000, metadata={"source": "long.pdf"})
    docs = [doc]
    
    # When
    chunks = split_text(docs)
    
    # Assert
    assert len(chunks) > 1
    assert all(len(c.page_content) <= 1000 for c in chunks)

@pytest.mark.asyncio
async def test_update_document_metadata_new_file(tmp_path):
    """Test metadata update for a new document using context managers for robustness."""
    # Given
    mock_db = AsyncMock()
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    
    with patch("ingest.analyze_document_content", new_callable=AsyncMock) as mock_analyze, \
         patch("ingest.PDFPlumberLoader") as mock_pdf_loader:
         
        mock_analyze.return_value = {"summary": "New", "outline": []}
        mock_loader_instance = mock_pdf_loader.return_value
        mock_loader_instance.load.return_value = [Document(page_content="mocked content")]
        
        # Mock RAW_DATA_PATH to tmp_path
        with patch("ingest.RAW_DATA_PATH", str(tmp_path)):
            test_file = tmp_path / "new.pdf"
            test_file.write_bytes(b"dummy")
            
            # When
            await update_document_metadata_async(mock_db)
            
            # Assert
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_analyze.assert_called_once()
