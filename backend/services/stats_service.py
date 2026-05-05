import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import Date, DateTime, cast, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatLog

logger = logging.getLogger(__name__)


class StatsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self, days: int = 14) -> dict[str, Any]:
        """Haalt alle dashboard statistieken op in zo min mogelijk queries."""

        # 1. Algemene stats (Total, Avg Latency, Feedback counts)
        # We kunnen dit in één query doen met multiple functions
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
        since = (datetime.now() - timedelta(days=days)).replace(tzinfo=None, microsecond=0)
        activity_query = (
            select(
                cast(ChatLog.timestamp, Date).label("day"), func.count(ChatLog.id).label("count")
            )
            .where(ChatLog.timestamp >= cast(since, DateTime(timezone=False)))
            .group_by(cast(ChatLog.timestamp, Date))
            .order_by(cast(ChatLog.timestamp, Date))
        )
        activity_res = await self.db.execute(activity_query)
        daily_activity = [
            {"day": str(row.day), "count": row.count} for row in activity_res.fetchall()
        ]

        # 3. Top bronnen (Dit is lastiger in SQL omdat retrieved_sources JSON is)
        # In een volwaardige productie-app zouden we dit joinen met een Document tabel,
        # maar voor nu optimaliseren we de Python-side loop.
        sources_query = select(ChatLog.retrieved_sources).where(
            ChatLog.retrieved_sources.isnot(None)
        )
        sources_res = await self.db.execute(sources_query)

        all_sources: dict[str, int] = {}
        for row in sources_res.scalars():
            if isinstance(row, list):
                for s in row:
                    all_sources[s] = all_sources.get(s, 0) + 1

        top_docs = sorted(all_sources.items(), key=lambda x: x[1], reverse=True)[:8]

        # 4. Recente logs
        logs_query = select(ChatLog).order_by(desc(ChatLog.timestamp)).limit(50)
        logs_res = await self.db.execute(logs_query)
        recent_logs = logs_res.scalars().all()

        return {
            "total_questions": total_questions,
            "avg_latency": round(float(avg_latency), 2),
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "satisfaction_rate": satisfaction_rate,
            "daily_activity": daily_activity,
            "top_docs": [{"doc": d, "count": c} for d, c in top_docs],
            "recent_logs": recent_logs,
        }
