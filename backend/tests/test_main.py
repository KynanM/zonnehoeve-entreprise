import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock

from database import get_db

@pytest.fixture
def mock_db():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()

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
@pytest.mark.anyio
async def test_chat_greeting():
    """Test de begroeting logica."""
    chat_input = {
        "input": "Hoi!",
        "chat_history": []
    }
    
    mock_llm = MagicMock()
    async def mock_astream(*args, **kwargs):
        yield MagicMock(content="Hoi, ik ")
        yield MagicMock(content="ben de Digitale Gids!")
    mock_llm.astream = mock_astream
    app.state.llm = mock_llm
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json=chat_input)
        
    assert response.status_code == 200
    assert "Digitale Gids" in response.text

@pytest.mark.anyio
async def test_chat_endpoint_empty_input():
    """Test chat met lege input."""
    # We need rag_chain to be not None for the is_greeting check if it somehow fails
    app.state.rag_chain = {"retrieval": AsyncMock(), "generation": AsyncMock()}
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/", json={"input": "   "})
    assert response.status_code == 200
    # Bij lege input wordt het vaak als greeting gezien of een fallback
    # In chat.py: normalized_input = req.input.lower().strip()... 
    # If empty, is_greeting might be False.

@pytest.mark.anyio
async def test_get_thread_history(mock_db):
    from models import ChatThread
    mock_thread = ChatThread(id="t1", title="Test Thread", logs=[])
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_thread
    mock_db.execute.return_value = mock_res
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/chat/threads/t1")
    assert response.status_code == 200
    assert response.json()["id"] == "t1"
