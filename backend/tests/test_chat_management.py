import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock
from database import get_db
from models import ChatThread, ChatLog

@pytest.fixture
def mock_db():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()

@pytest.fixture
def mock_admin():
    from api.auth import verify_admin
    app.dependency_overrides[verify_admin] = lambda: True
    yield
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_submit_feedback(mock_db):
    mock_log = ChatLog(id=1, user_prompt="test")
    mock_db.get.return_value = mock_log
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/feedback", json={"log_id": 1, "feedback": "thumbs_up"})
    
    assert response.status_code == 200
    assert mock_log.user_feedback == "thumbs_up"
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_get_threads(mock_db):
    mock_db.execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: [ChatThread(id="t1", title="T1")]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/chat/threads")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "t1"

@pytest.mark.anyio
async def test_update_thread_metadata(mock_db):
    mock_thread = ChatThread(id="t1", title="Old Title")
    mock_db.get.return_value = mock_thread
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.patch("/api/chat/threads/t1/metadata", json={"title": "New Title", "is_pinned": 1})
    assert response.status_code == 200
    assert mock_thread.title == "New Title"
    assert mock_thread.is_pinned == 1

@pytest.mark.anyio
async def test_delete_all_threads(mock_db, mock_admin):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads")
    assert response.status_code == 200
    assert mock_db.execute.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_single_thread(mock_db, mock_admin):
    mock_thread = ChatThread(id="t1")
    mock_db.get.return_value = mock_thread
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads/t1")
    assert response.status_code == 200
    assert mock_db.delete.called
    assert mock_db.commit.called
