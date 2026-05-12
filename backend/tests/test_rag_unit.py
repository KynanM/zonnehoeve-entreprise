import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from api.rag import _format_docs, _load_all_chunks_for_bm25, setup_rag_chain
from langchain_core.documents import Document

@pytest.fixture
def anyio_backend():
    return "asyncio"

def test_format_docs():
    docs = [
        Document(page_content="Content 1", metadata={"source": "doc1.pdf", "page": 1}),
        Document(page_content="Content 2", metadata={"source": "doc2.pdf", "page": 5})
    ]
    formatted = _format_docs(docs)
    assert "doc1.pdf" in formatted
    assert "Content 1" in formatted
    assert "Pagina 5" in formatted

@pytest.mark.anyio
async def test_load_all_chunks_success():
    mock_vs = MagicMock()
    # Mock asimilarity_search as an async method
    mock_vs.asimilarity_search = AsyncMock(return_value=[Document(page_content="test")])
    
    with patch("api.rag.get_vector_store", return_value=mock_vs):
        chunks = await _load_all_chunks_for_bm25()
        assert len(chunks) > 0
        assert chunks[0].page_content == "test"

@pytest.mark.anyio
async def test_setup_rag_chain_basic():
    # Mock everything to avoid real LLM calls
    with patch("api.rag.get_vector_store") as mock_vs_func, \
         patch("api.rag._load_all_chunks_for_bm25", return_value=[]), \
         patch("api.rag.ChatOpenAI"):
        
        mock_vs = MagicMock()
        mock_vs_func.return_value = mock_vs
        mock_vs.as_retriever.return_value = MagicMock()
        
        chain_data = await setup_rag_chain()
        assert "generation" in chain_data
        assert "retrieval" in chain_data
