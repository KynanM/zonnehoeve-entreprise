import os
import logging
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

if not ADMIN_API_KEY:
    logger.warning("ADMIN_API_KEY is niet ingesteld in de omgevingsvariabelen!")

async def verify_admin(x_admin_key: str = Header(...)):
    if not ADMIN_API_KEY:
        logger.error("Admin poging mislukt: ADMIN_API_KEY ontbreekt in config")
        raise HTTPException(status_code=500, detail="Admin configuratiefout op server")
        
    if x_admin_key != ADMIN_API_KEY:
        logger.warning(f"Ongeautoriseerde admin poging met sleutel lengte: {len(x_admin_key)}")
        raise HTTPException(status_code=403, detail="Ongeldige admin authenticatie")
    return True
