import pytest
from fastapi import HTTPException
from api.auth import verify_admin
from unittest.mock import patch

@pytest.mark.anyio
async def test_verify_admin_success():
    with patch("api.auth.ADMIN_API_KEY", "secret"):
        assert await verify_admin(x_admin_key="secret") is True

@pytest.mark.anyio
async def test_verify_admin_failure():
    with patch("api.auth.ADMIN_API_KEY", "secret"):
        with pytest.raises(HTTPException) as exc:
            await verify_admin(x_admin_key="wrong")
        assert exc.value.status_code == 403

@pytest.mark.anyio
async def test_verify_admin_missing_config():
    with patch("api.auth.ADMIN_API_KEY", None):
        with pytest.raises(HTTPException) as exc:
            await verify_admin(x_admin_key="anything")
        assert exc.value.status_code == 500
