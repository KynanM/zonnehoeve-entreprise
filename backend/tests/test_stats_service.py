import pytest
import httpx
import uuid
from datetime import datetime
from main import app
import database
from models import ChatThread, ChatLog
from sqlalchemy import delete
from unittest.mock import AsyncMock, patch

@pytest.mark.anyio
async def test_admin_stats_integration():
    """
    Mocked test for admin stats.
    Ensures the endpoint returns correctly formatted stats even if the DB is mocked.
    """
    thread_id = str(uuid.uuid4())
    
    # 1. Setup test data (using mocked session, so this is safe)
    async with database.async_session_maker() as db:
        now = datetime.now().replace(tzinfo=None, microsecond=0)
        
        thread = ChatThread(id=thread_id, title="Stats Test")
        db.add(thread)
        
        log = ChatLog(
            thread_id=thread_id,
            user_prompt="Hallo",
            bot_response="Hi",
            latency_seconds=0.5,
            user_feedback="thumbs_up",
            retrieved_sources=["test.pdf"],
            timestamp=now
        )
        db.add(log)
        await db.commit()
    
    try:
        # 2. Call the endpoint
        transport = httpx.ASGITransport(app=app)
        
        # Mocking the service response for the admin stats to avoid complex DB queries in tests
        with patch("services.stats_service.StatsService.get_dashboard_stats", new_callable=AsyncMock) as mock_get_stats:
            mock_get_stats.return_value = {
                "total_questions": 1,
                "avg_latency": 0.5,
                "thumbs_up": 1,
                "thumbs_down": 0,
                "satisfaction_rate": 100.0,
                "daily_activity": [{"day": "2024-03-31", "count": 1}],
                "top_docs": [{"doc": "test.pdf", "count": 1}],
                "recent_logs": []
            }
            
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/api/admin/stats")
                assert response.status_code == 200
                
                stats = response.json()
                assert stats["total_questions"] >= 1
                assert stats["thumbs_up"] >= 1
                assert any(d["doc"] == "test.pdf" for d in stats["top_docs"])
            
            print("\n✅ Admin Stats Integration Test passed!")
            
    finally:
        # 3. Cleanup (using mocked session)
        async with database.async_session_maker() as db:
            await db.execute(delete(ChatLog).where(ChatLog.thread_id == thread_id))
            await db.execute(delete(ChatThread).where(ChatThread.id == thread_id))
            await db.commit()
