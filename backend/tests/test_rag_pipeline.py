import pytest
import httpx
from main import app
from unittest.mock import patch, AsyncMock, MagicMock
from langchain_core.documents import Document

@pytest.mark.asyncio
@patch("api.chat.get_rag_chain")
async def test_rag_streaming_integration(mock_get_rag_chain):
    """
    Test the full RAG pipeline via the API endpoint.
    """
    # Given
    mock_gen = MagicMock()
    async def mock_astream(*args, **kwargs):
        yield "Het "
        yield "beleid "
        yield "over "
        yield "alcohol..."
    mock_gen.astream.side_effect = mock_astream
    
    mock_ret = AsyncMock()
    mock_ret.ainvoke.return_value = [Document(page_content="Alcohol beleid...", metadata={"source": "test.pdf"})]
    
    mock_get_rag_chain.return_value = {
        "retrieval": mock_ret,
        "generation": mock_gen
    }

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ask a question
        payload = {
            "input": "Wat is het beleid over alcohol en drugs?",
            "chat_history": []
        }
        
        response = await client.post("/api/chat/", json=payload)
        
        if response.status_code != 200:
            print(f"\n❌ ERROR BODY: {response.text}")
        
        assert response.status_code == 200
        
        # Full content for a streaming response in TestClient can be tricky, 
        # but ASGITransport handles it.
        content = response.text
        
        # 2. Verify response content
        assert len(content) > 10
        # Check for keywords related to the query
        assert "alcohol" in content.lower() or "drugs" in content.lower() or "beleid" in content.lower()
        
        # 3. Verify that metadata markers are present in the stream
        assert "__log_id__:" in content
        assert "__sources__:" in content
        
        print("\n✅ RAG Pipeline Integration Test passed!")

@pytest.mark.asyncio
async def test_search_documents_integration():
    """Verify that the /search endpoint works and is not shadowed by /{filename}."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Searching for a common term
        response = await client.get("/api/documents/search?q=alcohol")
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        # Should contain filenames, not a 404 error detail
        if len(results) > 0:
            assert isinstance(results[0], str)

@pytest.mark.asyncio
async def test_health_check_integration():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
