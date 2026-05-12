import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch, MagicMock

@pytest.mark.anyio
async def test_qa_report_endpoint_success():
    """Test the QA report endpoint returns a valid report."""
    from api.auth import verify_admin
    app.dependency_overrides[verify_admin] = lambda: True
    
    # Mock reports
    
    mock_lint = [
        {"code": "E501", "filename": "test.py", "message": "Line too long"}
    ]
    
    mock_tests = {
        "summary": {"total": 10, "passed": 9, "failed": 1},
        "duration": 5.0,
        "created": "2024-01-01"
    }

    try:
        with patch("os.path.exists", return_value=True), \
             patch("builtins.open", MagicMock()):
            
            # We need to mock the json.load and ET.parse
            with patch("xml.etree.ElementTree.parse") as mock_et_parse, \
                 patch("api.quality.json.load") as mock_json_load, \
                 patch("api.quality.json.loads") as mock_json_loads:
                
                # Mock ET
                mock_root = MagicMock()
                mock_root.get.side_effect = lambda k, d=None: {"line-rate": "0.85", "branch-rate": "0.75", "timestamp": "123456789"}.get(k, d)
                mock_pkg = MagicMock()
                mock_pkg.get.side_effect = lambda k, d=None: {"name": "api", "line-rate": "0.8"}.get(k, d)
                mock_root.findall.return_value = [mock_pkg]
                mock_et_parse.return_value.getroot.return_value = mock_root
                
                # Mock JSON
                mock_json_load.side_effect = [mock_lint, mock_tests]
                mock_json_loads.side_effect = [mock_lint, mock_tests]

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                    response = await ac.get("/api/admin/qa-report")
            
            assert response.status_code == 200
            data = response.json()
            assert data["overall_score"] > 0
            assert "coverage" in data
            assert "lint" in data
            assert "tests" in data
    finally:
        app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_qa_report_missing_files():
    """Test the QA report when report files are missing."""
    from api.auth import verify_admin
    app.dependency_overrides[verify_admin] = lambda: True
    
    try:
        with patch("os.path.exists", return_value=False):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.get("/api/admin/qa-report")
            
            assert response.status_code == 200
            data = response.json()
            assert data["coverage"]["available"] is False
            assert data["lint"]["available"] is False
            assert data["tests"]["available"] is False
    finally:
        app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_qa_report_error_handling():
    """Test error handling in report loading."""
    from api.auth import verify_admin
    app.dependency_overrides[verify_admin] = lambda: True
    
    try:
        with patch("os.path.exists", return_value=True), \
             patch("builtins.open", MagicMock(return_value=MagicMock(__enter__=MagicMock(return_value=MagicMock(read=MagicMock(return_value="{\"dummy\": true}")))))):
            with patch("xml.etree.ElementTree.parse", side_effect=Exception("XML Error")), \
                 patch("api.quality.json.loads", side_effect=Exception("JSON Error")):
                
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                    response = await ac.get("/api/admin/qa-report")
                
                assert response.status_code == 200
            
            data = response.json()
            assert "XML Error" in data["coverage"]["message"]
            assert "JSON Error" in data["lint"]["message"]
    finally:
        app.dependency_overrides.clear()
