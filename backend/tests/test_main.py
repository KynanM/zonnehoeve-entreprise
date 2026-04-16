import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock

@pytest.mark.anyio
async def test_read_root():
    """Test the base root endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welkom bij de Zonnehoeve Chatbot API!"}

@pytest.mark.anyio
async def test_health_check():
    """Test the health check endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.anyio
async def test_chat_endpoint_streaming():
    """Test the chat streaming endpoint with mocked chain."""
    # Given
    mock_retrieval = AsyncMock()
    mock_retrieval.ainvoke.return_value = [
        MagicMock(metadata={"source": "test.pdf", "page": 1})
    ]
    
    mock_generation = MagicMock()
    async def mock_astream(*args, **kwargs):
        yield "Hello "
        yield "world"
    mock_generation.astream = mock_astream
    
    app.state.rag_chain = {
        "retrieval": mock_retrieval,
        "generation": mock_generation
    }

    chat_input = {
        "input": "Hoe gaat het?",
        "chat_history": [],
        "thread_id": "test-thread"
    }
    
    # When
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json=chat_input)
    
    # Assert
    assert response.status_code == 200
    content = response.text
    assert "Hello" in content
    assert "world" in content

@pytest.mark.anyio
async def test_chat_endpoint_streaming_error():
    """Test de foutafhandeling wanneer RAG chain niet beschikbaar is."""
    app.state.rag_chain = None # Simuleer ontbrekende model instantie
    chat_input = {
        "input": "Hoe gaat het?",
        "chat_history": []
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json=chat_input)
        
    assert response.status_code == 200
    assert "[Systeemfout" in response.text
