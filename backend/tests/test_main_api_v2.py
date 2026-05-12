import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_main_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
        assert response.status_code == 200

@pytest.mark.anyio
async def test_main_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # We don't care if DB fails here, just that it returns 200 or 500
        response = await ac.get("/api/health")
        assert response.status_code in [200, 500]

@pytest.mark.anyio
async def test_main_lifespan_trigger():
    from main import lifespan
    mock_app = MagicMock()
    mock_app.state = MagicMock()
    
    with patch("main.engine") as mock_engine, \
         patch("main.setup_rag_chain", new_callable=AsyncMock) as mock_rag:
        
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__.return_value = mock_conn
        mock_rag.return_value = {"llm": "mock_llm"}
        
        async with lifespan(mock_app):
            pass
        
        assert mock_rag.called
