"""
QA Rapport endpoint voor de Admin Dashboard.
Geeft een overzicht van test coverage, code kwaliteit en performance metrics.
Dit endpoint aggregeert data uit verschillende bronnen en maakt deze
presenteerbaar voor opdrachtgevers via het admin dashboard.
"""

import json
import logging
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends

from api.auth import verify_admin

router = APIRouter(prefix="/api/admin", tags=["Admin QA"])
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Hulpfuncties om rapport data te laden
# ─────────────────────────────────────────────


# Basis pad voor rapportages (backend root)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def _load_coverage_report() -> dict[str, Any]:
    """Laad pytest coverage data uit coverage.xml als die beschikbaar is."""
    coverage_path = os.path.join(BASE_DIR, "coverage.xml")

    if not os.path.exists(coverage_path):
        return {"available": False, "message": "Voer 'pytest' uit om coverage te genereren."}

    try:
        import xml.etree.ElementTree as ET

        tree = ET.parse(coverage_path)
        root = tree.getroot()

        line_rate = float(root.get("line-rate", 0)) * 100
        branch_rate = float(root.get("branch-rate", 0)) * 100
        timestamp = root.get("timestamp", "")

        # Extraheer per-package coverage
        packages = []
        for package in root.findall(".//package"):
            pkg_name = package.get("name", "")
            pkg_rate = float(package.get("line-rate", 0)) * 100
            packages.append({"name": pkg_name, "coverage": round(pkg_rate, 1)})

        # Sorteer op laagste coverage (prioriteit voor verbetering)
        packages.sort(key=lambda x: x["coverage"])

        return {
            "available": True,
            "line_coverage": round(line_rate, 1),
            "branch_coverage": round(branch_rate, 1),
            "threshold": 70.0,
            "passes_threshold": line_rate >= 70.0,
            "generated_at": timestamp,
            "packages": packages[:10],  # Top 10 laagste coverage
        }
    except Exception as e:
        logger.warning(f"Kon coverage.xml niet lezen: {e}")
        return {"available": False, "message": str(e)}


def _load_lint_report() -> dict[str, Any]:
    """Laad Ruff lint resultaten als beschikbaar."""
    # Ruff JSON output pad
    ruff_output_path = os.path.join(BASE_DIR, "ruff_report.json")

    if not os.path.exists(ruff_output_path):
        return {
            "available": False,
            "message": "Voer 'ruff check . --output-format=json > ruff_report.json' uit.",
        }

    try:
        with open(ruff_output_path, encoding="utf-8") as f:
            issues = json.load(f)

        # Aggregeer per categorie
        by_code: dict[str, int] = {}
        by_file: dict[str, int] = {}
        severity_counts = {"error": 0, "warning": 0, "info": 0}

        for issue in issues:
            code = issue.get("code", "UNKNOWN")
            filename = os.path.basename(issue.get("filename", "unknown"))
            by_code[code] = by_code.get(code, 0) + 1
            by_file[filename] = by_file.get(filename, 0) + 1

            # Ruff codes beginnen met E/W/F etc. — mappeer naar severity
            if code.startswith(("E", "F")):
                severity_counts["error"] += 1
            elif code.startswith("W"):
                severity_counts["warning"] += 1
            else:
                severity_counts["info"] += 1

        top_issues = sorted(by_code.items(), key=lambda x: x[1], reverse=True)[:8]
        top_files = sorted(by_file.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "available": True,
            "total_issues": len(issues),
            "severity": severity_counts,
            "top_rule_violations": [{"code": k, "count": v} for k, v in top_issues],
            "most_issues_in": [{"file": k, "count": v} for k, v in top_files],
            "is_clean": len(issues) == 0,
        }
    except Exception as e:
        logger.warning(f"Kon ruff_report.json niet lezen: {e}")
        return {"available": False, "message": str(e)}


def _get_test_summary() -> dict[str, Any]:
    """Laad pytest resultaten uit pytest_results.json als beschikbaar."""
    pytest_output_path = os.path.join(BASE_DIR, "pytest_results.json")

    if not os.path.exists(pytest_output_path):
        return {
            "available": False,
            "message": "Voer 'pytest --json-report --json-report-file=pytest_results.json' uit.",
        }

    try:
        with open(pytest_output_path, encoding="utf-8") as f:
            data = json.load(f)

        summary = data.get("summary", {})
        return {
            "available": True,
            "total": summary.get("total", 0),
            "passed": summary.get("passed", 0),
            "failed": summary.get("failed", 0),
            "errors": summary.get("error", 0),
            "skipped": summary.get("skipped", 0),
            "duration": round(data.get("duration", 0), 2),
            "pass_rate": round(summary.get("passed", 0) / max(summary.get("total", 1), 1) * 100, 1),
            "created_at": data.get("created", ""),
        }
    except Exception as e:
        logger.warning(f"Kon pytest_results.json niet lezen: {e}")
        return {"available": False, "message": str(e)}


def _get_architecture_notes() -> list[dict[str, str]]:
    """Statische lijst van geïdentificeerde technische schuld."""
    return [
        {
            "severity": "ok",
            "title": "Asynchrone save_to_pgvector() geïmplementeerd",
            "description": "ingest.py gebruikt nu asyncio.to_thread() voor database operaties, waardoor de event loop niet meer geblokkeerd wordt.",
            "action": "Afgerond.",
        },
        {
            "severity": "ok",
            "title": "SQL-side JSON aggregatie actief",
            "description": "StatsService gebruikt nu PostgreSQL jsonb_array_elements_text() voor efficiente aggregatie.",
            "action": "Afgerond.",
        },
        {
            "severity": "ok",
            "title": "Gecentraliseerde LLM toegang",
            "description": "De LLM instantie wordt nu apart opgeslagen in app.state en direct benaderd zonder fragiele indexering.",
            "action": "Afgerond.",
        },
        {
            "severity": "ok",
            "title": "datetime.utcnow() vervangen",
            "description": "Alle deprecated utcnow() aanroepen zijn vervangen door datetime.now(timezone.utc).",
            "action": "Afgerond.",
        },
        {
            "severity": "ok",
            "title": "Caching op admin stats actief",
            "description": "Dashboard statistieken worden nu 5 minuten gecached in het geheugen.",
            "action": "Afgerond.",
        },
        {
            "severity": "ok",
            "title": "Dubbele router decorators opgelost",
            "description": "chat.py had @router.post('/') en @router.post('') — beide zijn aanwezig voor backward compatibiliteit.",
            "action": "Geverifieerd.",
        },
    ]


# ─────────────────────────────────────────────
# QA Rapport Endpoint
# ─────────────────────────────────────────────


@router.get("/qa-report", dependencies=[Depends(verify_admin)])
async def get_qa_report() -> dict[str, Any]:
    """
    Uitgebreid QA-rapport voor het admin dashboard.
    Aggregeert: test coverage, lint status, test samenvatting, technische schuld.
    """
    coverage = _load_coverage_report()
    lint = _load_lint_report()
    tests = _get_test_summary()
    tech_debt = _get_architecture_notes()

    # Bereken overall QA score (0-100)
    score_components = []

    if coverage.get("available"):
        cov_score = min(coverage["line_coverage"], 100) / 100 * 40  # Max 40 punten
        score_components.append(cov_score)
    else:
        score_components.append(0)

    if lint.get("available"):
        # Meer issues = lagere score, 0 issues = 30 punten
        issue_penalty = min(lint.get("total_issues", 0) * 0.5, 30)
        lint_score = max(30 - issue_penalty, 0)
        score_components.append(lint_score)
    else:
        score_components.append(15)  # Onbekend = half punt

    if tests.get("available"):
        test_score = tests.get("pass_rate", 0) / 100 * 30  # Max 30 punten
        score_components.append(test_score)
    else:
        score_components.append(0)

    total_score = round(sum(score_components))

    if total_score >= 80:
        score_label = "Uitstekend"
        score_color = "green"
    elif total_score >= 60:
        score_label = "Goed"
        score_color = "yellow"
    elif total_score >= 40:
        score_label = "Matig"
        score_color = "orange"
    else:
        score_label = "Kritiek"
        score_color = "red"

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "overall_score": total_score,
        "score_label": score_label,
        "score_color": score_color,
        "coverage": coverage,
        "lint": lint,
        "tests": tests,
        "tech_debt": tech_debt,
        "tech_debt_counts": {
            "warning": sum(1 for t in tech_debt if t["severity"] == "warning"),
            "info": sum(1 for t in tech_debt if t["severity"] == "info"),
            "ok": sum(1 for t in tech_debt if t["severity"] == "ok"),
        },
    }
