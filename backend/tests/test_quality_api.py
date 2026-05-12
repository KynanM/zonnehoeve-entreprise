import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from unittest.mock import patch

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_get_qa_report_authorized():
    # We mock the reports to avoid file IO issues during test
    with patch("api.quality._load_coverage_report", return_value={"available": True, "line_coverage": 85.0}), \
         patch("api.quality._load_lint_report", return_value={"available": True, "total_issues": 0}), \
         patch("api.quality._get_test_summary", return_value={"available": True, "pass_rate": 100.0}), \
         patch("api.quality._get_safety_metrics", return_value={"available": True, "overall_trust_score": 95.0}):
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # We need to bypass verify_admin or provide a key
            # Since verify_admin depends on ADMIN_API_KEY env var
            with patch("api.auth.ADMIN_API_KEY", "test_key"):
                response = await ac.get("/api/admin/qa-report", headers={"x-admin-key": "test_key"})
                assert response.status_code == 200
                data = response.json()
                assert data["overall_score"] > 80
                assert data["score_label"] == "Uitstekend"

@pytest.mark.anyio
async def test_get_qa_report_unauthorized():
    with patch("api.auth.ADMIN_API_KEY", "correct_key"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/admin/qa-report", headers={"x-admin-key": "wrong"})
            assert response.status_code == 403

def test_load_coverage_report_not_found():
    from api.quality import _load_coverage_report
    with patch("os.path.exists", return_value=False):
        res = _load_coverage_report()
        assert res["available"] is False

def test_load_lint_report_not_found():
    from api.quality import _load_lint_report
    with patch("os.path.exists", return_value=False):
        res = _load_lint_report()
        assert res["available"] is False

def test_get_test_summary_not_found():
    from api.quality import _get_test_summary
    with patch("os.path.exists", return_value=False):
        res = _get_test_summary()
        assert res["available"] is False

def test_get_safety_metrics_not_found():
    from api.quality import _get_safety_metrics
    with patch("os.path.exists", return_value=False):
        res = _get_safety_metrics()
        assert res["available"] is False
