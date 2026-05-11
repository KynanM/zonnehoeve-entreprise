from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth import verify_admin
from database import get_db
from services.stats_service import StatsService

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", dependencies=[Depends(verify_admin)])
async def get_stats(
    force: bool = False, 
    page: int = 1, 
    page_size: int = 50, 
    db: AsyncSession = Depends(get_db)
):
    service = StatsService(db)
    return await service.get_dashboard_stats(force_refresh=force, page=page, page_size=page_size)
