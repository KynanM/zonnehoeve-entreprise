import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.append(os.getcwd())
from database import async_session_maker
from models import ChatLog
from sqlalchemy import select, func, cast, Date

async def check():
    async with async_session_maker() as db:
        res = await db.execute(select(ChatLog.timestamp).order_by(ChatLog.timestamp.desc()).limit(1))
        latest = res.scalar()
        print(f"Latest log timestamp: {latest}")
        print(f"Current UTC (naive): {datetime.now(timezone.utc).replace(tzinfo=None)}")
        
        since = (datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=14))
        res = await db.execute(select(func.count(ChatLog.id)).where(ChatLog.timestamp >= since))
        print(f"Count with >= since: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(check())
