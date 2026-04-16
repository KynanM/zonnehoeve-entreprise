import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch, AsyncMock

@pytest.mark.anyio
async def test_chat_endpoint_invalid_input():
    """Test the chat endpoint with missing input field."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json={"wrong_key": "data"})
    assert response.status_code == 422 # Pydantic validation error

@pytest.mark.anyio
@patch("api.chat.get_rag_chain")
async def test_chat_endpoint_chain_failure(mock_get_rag_chain):
    """Test chat endpoint when the RAG chain fails."""
    # Given
    mock_retrieval = AsyncMock()
    mock_retrieval.ainvoke.side_effect = Exception("LLM connection failed")
    
    # We return a dict structured as api.rag returns
    mock_get_rag_chain.return_value = {
        "retrieval": mock_retrieval,
        "generation": AsyncMock()
    }

    # When
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json={"input": "test"})
    
    # Assert
    assert response.status_code == 200
    assert "[Systeemfout" in response.text

@pytest.mark.anyio
async def test_delete_non_existent_thread():
    """Test deleting a thread that doesn't exist."""
    # Mocking get_db dependency to return a session that returns None for the thread
    from api.chat import get_db
    mock_session = AsyncMock()
    mock_session.get.return_value = None
    
    app.dependency_overrides[get_db] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads/non-existent-id")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Thread niet gevonden"
    
    # Clean up
    app.dependency_overrides.clear()
