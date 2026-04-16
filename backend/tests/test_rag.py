from unittest.mock import MagicMock, patch
from langchain_core.documents import Document
from api.rag import _format_docs, _load_all_chunks_for_bm25, setup_rag_chain

def test_format_docs_success(sample_documents):
    """Test standard document formatting."""
    # Given
    docs = sample_documents
    
    # When
    formatted = _format_docs(docs)
    
    # Assert
    assert "Bron: protocol_zorg.pdf (Pagina 1)" in formatted
    assert "Zonnehoeve biedt 100% levenskwaliteit" in formatted
    assert "Bron: veiligheid.docx (Pagina 5)" in formatted
    assert "Afspraken over medicatieveiligheid" in formatted

def test_format_docs_duplicates():
    """Test that duplicate documents are filtered out."""
    # Given
    doc1 = Document(page_content="Content A", metadata={"source": "doc.pdf", "page": 1})
    doc2 = Document(page_content="Content A", metadata={"source": "doc.pdf", "page": 1})
    docs = [doc1, doc2]
    
    # When
    formatted = _format_docs(docs)
    
    # Assert
    assert formatted.count("Bron: doc.pdf") == 1
    assert formatted.count("Content A") == 1

def test_load_all_chunks_bm25_success(mock_vector_store, sample_documents):
    """Test successful loading of chunks for BM25."""
    # Given
    mock_vector_store.similarity_search.return_value = sample_documents
    
    # When
    docs = _load_all_chunks_for_bm25()
    
    # Assert
    assert len(docs) == 2
    assert mock_vector_store.similarity_search.call_count >= 1

def test_load_all_chunks_bm25_failure(mock_vector_store):
    """Test fallback when vector store fails."""
    # Given
    mock_vector_store.similarity_search.side_effect = Exception("DB Connection Error")
    
    # When
    docs = _load_all_chunks_for_bm25()
    
    # Assert
    assert docs == []

@patch("api.rag.ChatOpenAI")
@patch("api.rag.BM25Retriever")
@patch("api.rag.EnsembleRetriever")
def test_setup_rag_chain_structure(mock_ensemble, mock_bm25, mock_chat, mock_vector_store):
    """Test if the RAG chain is correctly initialized and structured."""
    # Given
    mock_vs_retriever = MagicMock()
    mock_vector_store.as_retriever.return_value = mock_vs_retriever
    
    # When
    chains = setup_rag_chain()
    
    # Assert
    assert isinstance(chains, dict)
    assert "generation" in chains
    assert "retrieval" in chains
