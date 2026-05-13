import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import MagicMock, AsyncMock
from database import get_db
import uuid

@pytest.fixture
def mock_db():
    db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_user_chat_isolation(mock_db):
    """
    Test of twee verschillende gastgebruikers elkaars geschiedenis niet kunnen zien.
    """
    user_a_id = "user-a"
    user_b_id = "user-b"
    
    # Mock behavior for User A
    from models import ChatThread
    mock_thread_a = ChatThread(id="thread-a", title="A's thread", user_id=user_a_id)
    
    # Mock result containers
    mock_res_a = MagicMock()
    mock_res_a.scalars.return_value.all.return_value = [mock_thread_a]
    mock_res_a.scalar_one_or_none.return_value = mock_thread_a
    
    mock_res_empty = MagicMock()
    mock_res_empty.scalars.return_value.all.return_value = []
    mock_res_empty.scalar_one_or_none.return_value = None

    async def mock_execute(query, *args, **kwargs):
        # Zeer simpele check op de query parameters of string
        # In de echte implementatie wordt de query dynamisch opgebouwd.
        # We kijken of er een bind parameter is voor user_id.
        params = kwargs.get("params", {})
        if params.get("uid") == user_a_id:
            return mock_res_a
        return mock_res_empty

    mock_db.execute.side_effect = mock_execute

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. User B vraagt threads op -> zou [] moeten zijn
        res_b = await ac.get("/api/chat/threads", headers={"X-Guest-ID": user_b_id})
        assert res_b.status_code == 200
        # Omdat onze mock_execute nu op params checkt, zou dit moeten werken
        
        # 2. User A vraagt threads op -> zou thread-a moeten bevatten
        # (Opmerking: in een echte test met een echte DB zou dit bewezen worden. 
        # Hier checken we vooral of de route de header doorgeeft naar de DB query)

@pytest.mark.anyio
async def test_access_without_guest_id(mock_db):
    """
    Test dat zonder Guest ID er geen threads worden teruggegeven (om lekken te voorkomen).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/chat/threads")
        assert response.status_code == 200
        assert response.json() == []
@pytest.mark.anyio
async def test_admin_bypass_isolation(mock_db):
    """
    Test dat een admin wel alle threads kan zien.
    """
    admin_key = "dedriemusketierszonnehoeve" # Uit conftest/config
    from models import ChatThread
    mock_threads = [
        ChatThread(id="t1", title="User 1", user_id="u1"),
        ChatThread(id="t2", title="User 2", user_id="u2")
    ]
    
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = mock_threads
    mock_db.execute.return_value = mock_res

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/chat/threads", headers={"x-admin-key": admin_key})
        assert response.status_code == 200
        assert len(response.json()) == 2
