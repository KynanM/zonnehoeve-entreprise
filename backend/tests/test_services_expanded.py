import pytest
from services.document_service import DocumentService
from unittest.mock import MagicMock, patch, AsyncMock
from models import DocumentMetadata
from langchain_core.documents import Document

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def doc_service(mock_db):
    return DocumentService(mock_db)

@pytest.mark.anyio
async def test_get_suggestions(doc_service, mock_db):
    with patch.object(DocumentService, "_get_fallback_context", new_callable=AsyncMock) as mock_context:
        mock_context.return_value = "Document text"
        mock_chain = MagicMock()
        mock_chain.with_retry.return_value = mock_chain
        mock_chain.ainvoke = AsyncMock(return_value=["Q1", "Q2", "Q3"])
        with patch("services.document_service.ChatOpenAI"), \
             patch("services.document_service.ChatPromptTemplate.from_messages") as mock_prompt:
            mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_chain
            suggestions = await doc_service.get_suggestions("test.pdf")
            assert suggestions == ["Q1", "Q2", "Q3"]

@pytest.mark.anyio
async def test_get_outline_success(doc_service, mock_db):
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = DocumentMetadata(outline=[{"title": "H1"}])
    mock_db.execute.return_value = mock_res
    outline = await doc_service.get_outline("test.pdf")
    assert outline[0]["title"] == "H1"

@pytest.mark.anyio
async def test_get_outline_fallback(doc_service, mock_db):
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    with patch.object(DocumentService, "_get_fallback_context", new_callable=AsyncMock) as mock_context:
        mock_context.return_value = "Content"
        mock_chain = MagicMock()
        mock_chain.with_retry.return_value = mock_chain
        mock_chain.ainvoke = AsyncMock(return_value=[{"title": "Gen H1"}])
        with patch("services.document_service.ChatOpenAI"), \
             patch("services.document_service.ChatPromptTemplate.from_messages") as mock_prompt:
            mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_chain
            outline = await doc_service.get_outline("test.pdf")
            assert len(outline) > 0
            assert outline[0]["title"] == "Gen H1"

@pytest.mark.anyio
async def test_delete_document_success(doc_service, mock_db):
    mock_db.execute.return_value = MagicMock()
    result = await doc_service.delete_document("test.pdf")
    assert result is True
    assert mock_db.execute.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_document_failure(doc_service, mock_db):
    mock_db.execute.side_effect = Exception("DB Error")
    result = await doc_service.delete_document("test.pdf")
    assert result is False
    assert mock_db.rollback.called

@pytest.mark.anyio
async def test_get_fallback_context(doc_service):
    with patch("services.document_service.get_vector_store") as mock_get_vs:
        mock_vs = mock_get_vs.return_value
        mock_vs.asimilarity_search = AsyncMock(return_value=[Document(page_content="Context 1")])
        context = await doc_service._get_fallback_context("test.pdf")
        assert context == "Context 1"

@pytest.mark.anyio
async def test_get_preview_no_meta(doc_service, mock_db):
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    with patch.object(DocumentService, "_get_fallback_context", new_callable=AsyncMock) as mock_context:
        mock_context.return_value = "Long text context"
        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value="Summary result")
        with patch("services.document_service.ChatOpenAI"), \
             patch("services.document_service.ChatPromptTemplate.from_messages") as mock_prompt:
            mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_chain
            preview = await doc_service.get_preview("test.pdf")
            assert preview == "Summary result"
