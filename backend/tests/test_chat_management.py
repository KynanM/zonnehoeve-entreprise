import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock, patch
from database import get_db
from models import ChatThread, ChatLog

@pytest.fixture
def mock_db():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_submit_feedback(mock_db):
    mock_log = ChatLog(id=1, user_prompt="test")
    # Mock the same call path as the endpoint: db.execute(...).scalar_one_or_none()
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: mock_log)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/feedback", json={"log_id": 1, "feedback": "thumbs_up"})
    
    assert response.status_code == 200
    assert mock_log.user_feedback == "thumbs_up"
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_get_threads(mock_db):
    mock_db.execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: [ChatThread(id="t1", title="T1")] ))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Provide a guest id header to allow non-admin queries to return threads
        response = await ac.get("/api/chat/threads", headers={"X-Guest-ID": "user1"})
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
async def test_delete_all_threads(mock_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch("api.auth.ADMIN_API_KEY", "test_key"):
            response = await ac.delete("/api/chat/threads", headers={"x-admin-key": "test_key"})
    assert response.status_code == 200
    assert mock_db.execute.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_own_threads_as_guest(mock_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads", headers={"X-Guest-ID": "user1"})
    assert response.status_code == 200
    assert mock_db.execute.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_all_threads_unauthorized(mock_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads")
    assert response.status_code == 403

@pytest.mark.anyio
async def test_delete_single_thread(mock_db):
    mock_thread = ChatThread(id="t1", user_id="user1")
    mock_db.get.return_value = mock_thread
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads/t1", headers={"X-Guest-ID": "user1"})
    assert response.status_code == 200
    assert mock_db.delete.called
    assert mock_db.commit.called

@pytest.mark.anyio
async def test_delete_single_thread_forbidden_for_other_guest(mock_db):
    mock_thread = ChatThread(id="t1", user_id="user1")
    mock_db.get.return_value = mock_thread
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/chat/threads/t1", headers={"X-Guest-ID": "user2"})
    assert response.status_code == 403
    assert not mock_db.delete.called
