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


def _safe_load_json(path: str, default_if_empty: Any = None) -> Any:
    """
    Laadt JSON op een robuuste manier. 
    Handelt lege bestanden, ongeldige JSON en Ruff-specifieke tekst af.
    """
    if not os.path.exists(path):
        return None

    try:
        with open(path, encoding="utf-8") as f:
            content = f.read().strip()
            
        if not content:
            return default_if_empty

        # Speciaal geval voor Ruff: "All checks passed!" is geen geldige JSON
        if "All checks passed!" in content:
            # Als er verder geen JSON-achtige tekens zijn, is het waarschijnlijk de platte tekst output
            if not (content.startswith("[") or content.startswith("{")):
                return default_if_empty if default_if_empty is not None else []

        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON decodeerfout in {path}: {e}")
        # Als we een lijst verwachten, wees vergevingsgezind
        if isinstance(default_if_empty, list):
            return default_if_empty
        raise e
    except Exception as e:
        logger.warning(f"Fout bij lezen van {path}: {e}")
        raise e


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
        issues = _safe_load_json(ruff_output_path, default_if_empty=[])
        
        if issues is None:
            return {
                "available": False,
                "message": "Kon ruff_report.json niet vinden.",
            }

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
        return {"available": False, "message": "Fout bij laden lint-rapport. Is het bestand geldig?"}


def _get_test_summary() -> dict[str, Any]:
    """Laad pytest resultaten uit pytest_results.json als beschikbaar."""
    pytest_output_path = os.path.join(BASE_DIR, "pytest_results.json")

    if not os.path.exists(pytest_output_path):
        return {
            "available": False,
            "message": "Voer 'pytest --json-report --json-report-file=pytest_results.json' uit.",
        }

    try:
        data = _safe_load_json(pytest_output_path)
        
        if data is None:
            return {
                "available": False,
                "message": "Kon pytest_results.json niet vinden.",
            }

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
        return {"available": False, "message": "Fout bij laden testresultaten. Is het bestand geldig?"}


def _get_safety_metrics() -> dict[str, Any]:
    """Laad resultaten van de AI Safety & Red Teaming tests."""
    safety_results_path = os.path.join(BASE_DIR, "data", "safety_test_results.json")

    if not os.path.exists(safety_results_path):
        return {"available": False, "message": "Voer 'pytest backend/tests/test_chatbot_qa_expert.py' uit."}

    try:
        data = _safe_load_json(safety_results_path)
        
        if data is None:
            return {"available": False, "message": "Kon safety_test_results.json niet vinden."}

        # Bereken gemiddeldes per categorie
        summary = {}
        total_score = 0
        categories_count = 0

        for category, tests in data.items():
            cat_score = sum(t["score"] for t in tests) / len(tests)
            summary[category] = round(cat_score, 1)
            total_score += cat_score
            categories_count += 1

        overall_trust = round(total_score / max(categories_count, 1), 1)

        return {
            "available": True,
            "overall_trust_score": overall_trust,
            "category_scores": summary,
            "detailed_results": data,
            "generated_at": datetime.now(UTC).isoformat(), # We kunnen ook de timestamp van de file pakken
        }
    except Exception as e:
        logger.warning(f"Kon safety_test_results.json niet lezen: {e}")
        return {"available": False, "message": "Fout bij laden safety-metrics. Is het bestand geldig?"}


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
        "safety": _get_safety_metrics(),
    }
