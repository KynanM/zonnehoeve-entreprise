import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy import Date, cast, desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatLog

logger = logging.getLogger(__name__)


class StatsService:
    # Simpele in-memory cache voor dashboard statistieken
    _cache: Dict[str, Any] = {}
    _cache_expiry: float = 0
    CACHE_DURATION: int = 300  # 5 minuten in seconden

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self, days: int = 14, force_refresh: bool = False) -> dict[str, Any]:
        """Haalt alle dashboard statistieken op in zo min mogelijk queries."""
        
        # Check cache
        current_time = time.time()
        if not force_refresh and self._cache_expiry > current_time:
            logger.info("📊 Dashboard stats opgehaald uit cache.")
            return self._cache

        # 1. Algemene stats (Total, Avg Latency, Feedback counts)
        base_stats_query = select(
            func.count(ChatLog.id).label("total_questions"),
            func.avg(ChatLog.latency_seconds).label("avg_latency"),
            func.count(ChatLog.id).filter(ChatLog.user_feedback == "thumbs_up").label("thumbs_up"),
            func.count(ChatLog.id)
            .filter(ChatLog.user_feedback == "thumbs_down")
            .label("thumbs_down"),
        )
        res = await self.db.execute(base_stats_query)
        stats = res.mappings().one()

        total_questions = stats["total_questions"] or 0
        avg_latency = stats["avg_latency"] or 0.0
        thumbs_up = stats["thumbs_up"] or 0
        thumbs_down = stats["thumbs_down"] or 0

        feedback_total = thumbs_up + thumbs_down
        satisfaction_rate = (
            round((thumbs_up / feedback_total * 100), 1) if feedback_total > 0 else None
        )

        # 2. Activiteit per dag
        since = (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0)
        activity_query = (
            select(
                cast(ChatLog.timestamp, Date).label("day"), func.count(ChatLog.id).label("count")
            )
            .where(ChatLog.timestamp >= since)
            .group_by(cast(ChatLog.timestamp, Date))
            .order_by(cast(ChatLog.timestamp, Date))
        )
        activity_res = await self.db.execute(activity_query)
        daily_activity = [
            {"day": str(row.day), "count": row.count} for row in activity_res.fetchall()
        ]

        # 3. Top bronnen (Geoptimaliseerd met SQL jsonb aggregation)
        # We gebruiken jsonb_array_elements_text om de array in rijen te splitsen
        sources_sql = text("""
            SELECT doc_name, COUNT(*) as count
            FROM chat_logs, jsonb_array_elements_text(retrieved_sources) as doc_name
            WHERE retrieved_sources IS NOT NULL
            GROUP BY doc_name
            ORDER BY count DESC
            LIMIT 8
        """)
        sources_res = await self.db.execute(sources_sql)
        top_docs = [{"doc": row.doc_name, "count": row.count} for row in sources_res.fetchall()]

        # 4. Recente logs
        logs_query = select(ChatLog).order_by(desc(ChatLog.timestamp)).limit(50)
        logs_res = await self.db.execute(logs_query)
        recent_logs = logs_res.scalars().all()

        result = {
            "total_questions": total_questions,
            "avg_latency": round(float(avg_latency), 2),
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "satisfaction_rate": satisfaction_rate,
            "daily_activity": daily_activity,
            "top_docs": top_docs,
            "recent_logs": recent_logs,
        }

        # Update cache
        StatsService._cache = result
        StatsService._cache_expiry = current_time + self.CACHE_DURATION
        
        return result
