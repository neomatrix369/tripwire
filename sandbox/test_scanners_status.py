"""
Tests for sandbox.scanners overall status and unreachable detail rows.

Author: swami
Created: 2026-08-01
Scope: run_all_scanners overall_status; _unreachable detail truncation
"""

from __future__ import annotations

from unittest.mock import patch

import scanners


def test_given_unreachable_stderr_when_building_row_then_detail_is_capped() -> None:
    """
    Scenario: Unreachable scanner rows carry truncated stderr for the dashboard.
    Slice: _unreachable — detail persistence

    Given a long stderr string from a failed scanner subprocess,
    When _unreachable builds the scan_run_scanners row,
    Then status is unreachable and detail is present and capped at 4000 chars.
    """
    ### Given
    stderr = "x" * 5000

    ### When
    row = scanners._unreachable("Snyk", stderr)

    ### Then
    assert row["status"] == "unreachable"
    assert row["checks_run"] == 0
    assert row["detail"] == "x" * 4000


def test_given_cisco_complete_and_tessl_unreachable_when_run_all_then_partial_failed() -> None:
    """
    Scenario: Any unreachable engine yields partial-failed overall status.
    Slice: run_all_scanners — overall_status

    Given Cisco completed and Tessl/Snyk unreachable for a skill,
    When run_all_scanners aggregates results,
    Then overall_status is partial-failed and findings from Cisco are retained.
    """
    ### Given
    cisco_findings = [
        {
            "severity": "red",
            "category": "prompt_injection",
            "message": "injection",
            "scanner_source": "Cisco Skill Scanner: static/bytecode/pipeline",
        }
    ]
    cisco_rows = [
        {
            "scanner_source": "Cisco Skill Scanner: static/bytecode/pipeline",
            "status": "completed",
            "checks_run": 3,
        }
    ]

    ### When
    with (
        patch.object(
            scanners, "run_cisco_skill_scanner", return_value=(cisco_findings, cisco_rows)
        ),
        patch.object(
            scanners,
            "run_tessl",
            return_value=(None, [scanners._unreachable("Tessl", "node too old")]),
        ),
        patch.object(
            scanners,
            "run_snyk",
            return_value=([], [scanners._unreachable("Snyk", "cold install failed")]),
        ),
    ):
        result = scanners.run_all_scanners("/tmp/skill", "skill", "/tmp/skill")

    ### Then
    assert result["overall_status"] == "partial-failed"
    assert len(result["findings"]) == 1
    assert result["findings"][0]["severity"] == "red"
    tessl = next(r for r in result["scanner_rows"] if r["scanner_source"] == "Tessl")
    assert tessl["detail"] == "node too old"


def test_given_all_engines_completed_when_run_all_then_complete() -> None:
    """
    Scenario: All engines completed → overall_status complete.
    Slice: run_all_scanners — happy path

    Given every scanner row is completed,
    When run_all_scanners aggregates,
    Then overall_status is complete.
    """
    ### Given / When
    with (
        patch.object(
            scanners,
            "run_cisco_skill_scanner",
            return_value=(
                [],
                [{"scanner_source": "Cisco", "status": "completed", "checks_run": 1}],
            ),
        ),
        patch.object(
            scanners,
            "run_tessl",
            return_value=(
                0.9,
                [{"scanner_source": "Tessl", "status": "completed", "checks_run": 1}],
            ),
        ),
        patch.object(
            scanners,
            "run_snyk",
            return_value=([], [{"scanner_source": "Snyk", "status": "completed", "checks_run": 1}]),
        ),
    ):
        result = scanners.run_all_scanners("/tmp/skill", "skill", "/tmp/skill")

    ### Then
    assert result["overall_status"] == "complete"
    assert result["quality_score"] == 0.9
