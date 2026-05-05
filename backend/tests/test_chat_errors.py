import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock

@pytest.mark.anyio
async def test_feedback_not_found():
    mock_db = AsyncMock()
    mock_db.get.return_value = None
    from database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/chat/feedback", json={"log_id": 999, "feedback": "up"})
    assert response.status_code == 404
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_thread_not_found():
    mock_db = AsyncMock()
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    from database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/chat/threads/missing")
    assert response.status_code == 404
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_update_thread_not_found():
    mock_db = AsyncMock()
    mock_db.get.return_value = None
    from database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.patch("/api/chat/threads/missing/metadata", json={"title": "new"})
    assert response.status_code == 404
    app.dependency_overrides.clear()
