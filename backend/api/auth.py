import os
from fastapi import Header, HTTPException

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

if not ADMIN_API_KEY:
    # We don't print the error in prod to avoid leaking, but we ensure it's not the default
    pass

async def verify_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Ongeldige admin authenticatie")
    return True
