import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from database import async_session_maker
from services.stats_service import StatsService
from models import ChatLog
from sqlalchemy import select, func

async def check():
    async with async_session_maker() as db:
        # Check raw counts
        res = await db.execute(select(func.count(ChatLog.id)))
        total = res.scalar()
        print(f"Total logs in DB: {total}")
        
        res = await db.execute(select(func.count(ChatLog.id)).filter(ChatLog.user_feedback == "thumbs_up"))
        up = res.scalar()
        print(f"Total thumbs_up in DB: {up}")
        
        res = await db.execute(select(func.count(ChatLog.id)).filter(ChatLog.user_feedback == "thumbs_down"))
        down = res.scalar()
        print(f"Total thumbs_down in DB: {down}")

        service = StatsService(db)
        print("Fetching stats from service...")
        stats = await service.get_dashboard_stats(force_refresh=True)
        
        if "error" in stats:
            print(f"Error in stats: {stats['error']}")
        else:
            print(f"Service total: {stats['total_questions']}")
            print(f"Service thumbs_up: {stats['thumbs_up']}")
            print(f"Service satisfaction_rate: {stats['satisfaction_rate']}")
            print(f"Service daily_activity: {stats['daily_activity']}")

if __name__ == "__main__":
    asyncio.run(check())
