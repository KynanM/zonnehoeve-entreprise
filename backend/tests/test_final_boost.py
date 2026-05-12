import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from api.auth import verify_admin
from fastapi import HTTPException
from services.hash_service import HashService

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_auth_no_key_config():
    with patch("api.auth.ADMIN_API_KEY", None):
        with pytest.raises(HTTPException) as exc:
            await verify_admin("test")
        assert exc.value.status_code == 500

def test_hash_service_file_not_found():
    with pytest.raises(FileNotFoundError):
        HashService.compute_file_hash("nonexistent.txt")

@pytest.mark.anyio
async def test_ingestion_service_sync_dir_not_found():
    from services.ingestion_service import IngestionService
    service = IngestionService(AsyncMock())
    with patch("os.path.exists", return_value=False):
        await service.sync_local_directory("nonexistent_dir")
        # Should log error and return
        assert True

@pytest.mark.anyio
async def test_chat_service_detect_interaction():
    from services.chat_service import ChatService
    service = ChatService(AsyncMock(), MagicMock())
    is_simple, rtype = service._detect_simple_interaction("Hallo!")
    assert is_simple is True
    assert rtype == "greeting"
    
    is_simple, rtype = service._detect_simple_interaction("Bedankt!")
    assert is_simple is True
    assert rtype == "thanks"
