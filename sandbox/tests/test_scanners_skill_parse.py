"""
Tests for Cisco Skill Scanner parse/map paths in sandbox.scanners.

Author: swami
Created: 2026-08-02
Scope: run_cisco_skill_scanner / _map_skill_findings / _safe_json —
       happy JSON, malformed payload, severity collapse (stubbed _run/_which)
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
import scanners

_FIXTURES = Path(__file__).resolve().parent / "testdata" / "skill_scanner"
_SOURCE = "Cisco Skill Scanner: static/bytecode/pipeline"

SEVERITY_COLLAPSE_CASES = [
    ("CRITICAL", "red"),
    ("HIGH", "red"),
    ("MEDIUM", "amber"),
    ("LOW", "amber"),
    ("INFO", "green"),
    ("INFORMATIONAL", "green"),
    ("SAFE", None),
    ("", None),
]


def _load(name: str) -> str:
    return (_FIXTURES / name).read_text(encoding="utf-8")


def test_given_happy_skill_json_when_scanner_runs_then_findings_mapped() -> None:
    """
    Scenario: Recorded skill-scanner JSON maps into Tripwire finding shape.
    Slice: slice-8 — skill happy path

    Given happy skill-scanner JSON and stubbed subprocess,
    When run_cisco_skill_scanner runs,
    Then findings carry collapsed severity, category, anchors, and message.
    """
    ### Given
    stdout = _load("happy.json")

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, stdout, "")),
        patch.dict(
            "os.environ",
            {"SKILL_SCANNER_LLM_API_KEY": "", "AI_DEFENSE_API_KEY": ""},
            clear=False,
        ),
    ):
        findings, rows = scanners.run_cisco_skill_scanner("/tmp/scan-target")

    ### Then
    assert len(findings) == 2, f"Expected 2 findings, got {len(findings)}"
    assert findings[0]["severity"] == "red"
    assert findings[0]["category"] == "prompt_injection"
    assert findings[0]["file_path"] == "SKILL.md"
    assert findings[0]["location"] == "12"
    assert "Red prompt injection" in findings[0]["message"]
    assert findings[0]["scanner_source"] == _SOURCE
    assert findings[1]["severity"] == "amber"
    assert rows[0]["status"] == "completed"
    assert rows[0]["checks_run"] == 2


def test_given_prefixed_json_when_safe_json_then_object_extracted() -> None:
    """
    Scenario: Progress noise before JSON still yields a parsed object.
    Slice: slice-8 — _safe_json prefix strip

    Given stdout with banners before a JSON object,
    When _safe_json runs,
    Then findings_count is readable from the extracted object.
    """
    ### Given
    text = _load("prefixed_happy.txt")

    ### When
    actual = scanners._safe_json(text)

    ### Then
    assert actual is not None
    assert actual["findings_count"] == 1
    assert actual["findings"][0]["severity"] == "CRITICAL"


def test_given_malformed_payload_when_scanner_runs_then_marks_the_engine_unreachable() -> None:
    """
    Scenario: A successful exit without parseable scanner evidence is not clean.
    Slice: scanner evidence integrity

    Given non-JSON stdout and exit 0,
    When run_cisco_skill_scanner runs,
    Then findings are empty and the static row is unreachable, never a false clean result.
    """
    ### Given
    stdout = _load("malformed.txt")

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, stdout, "warn")),
        patch.dict(
            "os.environ",
            {"SKILL_SCANNER_LLM_API_KEY": "", "AI_DEFENSE_API_KEY": ""},
            clear=False,
        ),
    ):
        findings, rows = scanners.run_cisco_skill_scanner("/tmp/scan-target")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"
    assert "no parseable JSON" in rows[0]["detail"]


@pytest.mark.parametrize(("raw", "expected"), SEVERITY_COLLAPSE_CASES)
def test_given_upstream_severity_when_mapped_then_tripwire_severity(
    raw: str, expected: str | None
) -> None:
    """
    Scenario: Skill finding severities collapse via the shared severity table.
    Slice: slice-8 — severity map

    Given a skill finding with an upstream severity string,
    When _map_skill_findings runs,
    Then Tripwire severity matches the collapse contract (or finding omitted when SAFE).
    """
    ### Given
    parsed = {
        "findings": [
            {
                "severity": raw,
                "category": "prompt_injection",
                "title": "t",
                "description": "d",
                "file_path": "SKILL.md",
                "line_number": 1,
            }
        ]
    }

    ### When
    mapped = scanners._map_skill_findings(parsed, _SOURCE)

    ### Then
    if expected is None:
        assert mapped == [] or mapped[0]["severity"] is None
        if mapped:
            assert mapped[0]["severity"] is None
    else:
        assert len(mapped) == 1
        assert mapped[0]["severity"] == expected


def test_given_skill_binary_missing_when_scanner_runs_then_unreachable() -> None:
    """
    Scenario: Missing skill-scanner binary yields unreachable without calling _run.
    Slice: slice-8 — _which guard

    Given _which returns False,
    When run_cisco_skill_scanner runs,
    Then one unreachable row is returned and findings are empty.
    """
    ### Given / When
    with patch.object(scanners, "_which", return_value=False):
        findings, rows = scanners.run_cisco_skill_scanner("/tmp/scan-target")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"
    assert "not installed" in rows[0]["detail"]
