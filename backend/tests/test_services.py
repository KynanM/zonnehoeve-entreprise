import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from services.document_service import DocumentService
from models import DocumentMetadata

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def doc_service(mock_db):
    return DocumentService(mock_db)

@pytest.mark.asyncio
async def test_get_metadata(doc_service, mock_db):
    # Given
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = DocumentMetadata(filename="test.pdf")
    mock_db.execute.return_value = mock_result
    
    # When
    meta = await doc_service.get_metadata("test.pdf")
    
    # Assert
    assert meta.filename == "test.pdf"
    mock_db.execute.assert_called_once()

@pytest.mark.asyncio
@patch("services.document_service.ChatOpenAI")
@patch("services.document_service.get_vector_store")
async def test_get_preview_with_meta(mock_vs, mock_chat, doc_service, mock_db):
    # Given
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = DocumentMetadata(filename="test.pdf", summary="Test summary")
    mock_db.execute.return_value = mock_result
    
    # When
    preview = await doc_service.get_preview("test.pdf")
    
    # Assert
    assert preview == "Test summary"

@pytest.mark.asyncio
@patch("services.document_service.ChatOpenAI")
@patch("services.document_service.get_vector_store")
@patch("services.document_service.ChatPromptTemplate.from_messages")
async def test_get_preview_fallback(mock_prompt, mock_vs_get, mock_chat, doc_service, mock_db):
    # Given
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    
    mock_vs = MagicMock()
    mock_vs.similarity_search.return_value = [MagicMock(page_content="Mocked content")]
    mock_vs_get.return_value = mock_vs
    
    # Mock Chain: prompt | llm | parser
    mock_chain = MagicMock()
    mock_chain.ainvoke = AsyncMock(return_value="Generated summary")
    mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_chain
    
    # When
    preview = await doc_service.get_preview("test.pdf")
    
    # Assert
    assert preview == "Generated summary"
