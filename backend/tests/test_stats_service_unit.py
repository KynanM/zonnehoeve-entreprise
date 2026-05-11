import pytest
from services.stats_service import StatsService
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

@pytest.mark.anyio
async def test_stats_service_get_dashboard_stats():
    # Given
    mock_db = AsyncMock()
    service = StatsService(mock_db)
    
    # Mock base stats
    mock_stats_res = MagicMock()
    mock_stats_res.mappings.return_value.one.return_value = {
        "total_questions": 10,
        "avg_latency": 1.5,
        "thumbs_up": 8,
        "thumbs_down": 2
    }
    
    # Mock activity
    mock_activity_res = MagicMock()
    mock_activity_res.fetchall.return_value = [
        MagicMock(day=datetime.now().date(), count=5)
    ]
    
    # Mock top docs
    mock_docs_res = MagicMock()
    mock_docs_res.fetchall.return_value = [
        MagicMock(doc_name="protocol.pdf", count=10)
    ]
    
    # Mock total logs count for pagination
    mock_total_logs_res = MagicMock()
    mock_total_logs_res.scalar.return_value = 10
    
    # Mock recent logs
    mock_logs_res = MagicMock()
    mock_logs_res.scalars.return_value.all.return_value = []
    
    mock_db.execute.side_effect = [
        mock_stats_res,
        mock_activity_res,
        mock_docs_res,
        mock_total_logs_res,
        mock_logs_res
    ]
    
    # When
    stats = await service.get_dashboard_stats(days=14, force_refresh=True)
    
    # Assert
    assert stats["total_questions"] == 10
    assert stats["avg_latency"] == 1.5
    assert stats["satisfaction_rate"] == 80.0
    assert len(stats["top_docs"]) == 1
    assert stats["top_docs"][0]["doc"] == "protocol.pdf"

@pytest.mark.anyio
async def test_stats_service_cache():
    # Given
    mock_db = AsyncMock()
    service = StatsService(mock_db)
    
    # Mock first call
    mock_res = MagicMock()
    mock_res.mappings.return_value.one.return_value = {"total_questions": 5, "avg_latency": 1.0, "thumbs_up": 5, "thumbs_down": 0}
    mock_db.execute.return_value = mock_res
    
    # When
    await service.get_dashboard_stats(force_refresh=True)
    assert mock_db.execute.called
    
    mock_db.execute.reset_mock()
    
    # Second call (cached)
    await service.get_dashboard_stats(force_refresh=False)
    assert not mock_db.execute.called
