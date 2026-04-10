from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.stats_service import StatsService
from api.auth import verify_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/stats", dependencies=[Depends(verify_admin)])
async def get_stats(db: AsyncSession = Depends(get_db)):
    service = StatsService(db)
    return await service.get_dashboard_stats()
