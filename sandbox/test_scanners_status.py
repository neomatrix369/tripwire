"""
Tests for sandbox.scanners overall status, unreachable detail, console capture,
and incremental callback relay.

Author: swami
Created: 2026-08-01
Scope: run_all_scanners overall_status; _unreachable detail truncation;
       _build_console / _truncate_console; on_scanner_done callback relay;
       _completed console_output passthrough
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


def test_given_unreachable_with_console_when_building_row_then_console_output_present() -> None:
    """
    Scenario: Unreachable scanner rows also carry raw console output.
    Slice: _unreachable — console_output relay

    Given a stderr and console_output,
    When _unreachable builds the row,
    Then console_output is included in the row.
    """
    ### Given / When
    row = scanners._unreachable("Snyk", "exit 1", console_output="full raw output here")

    ### Then
    assert row["console_output"] == "full raw output here"


def test_given_stdout_and_stderr_when_build_console_then_combined_output() -> None:
    """
    Scenario: _build_console combines stdout and stderr with a separator.
    Slice: _build_console — concatenation

    Given stdout with JSON and stderr with warnings,
    When _build_console is called,
    Then output contains both sections with stderr separator.
    """
    ### Given
    stdout = '{"findings": []}'
    stderr = "npm warn deprecated"

    ### When
    result = scanners._build_console(stdout, stderr)

    ### Then
    assert '{"findings": []}' in result
    assert "--- stderr ---" in result
    assert "npm warn deprecated" in result


def test_given_only_stdout_when_build_console_then_no_stderr_label() -> None:
    """
    Scenario: _build_console with only stdout omits stderr separator.
    Slice: _build_console — stdout-only

    Given stdout text and empty stderr,
    When _build_console is called,
    Then result contains stdout without any stderr label.
    """
    ### Given / When
    result = scanners._build_console("scan complete", "")

    ### Then
    assert result == "scan complete"
    assert "stderr" not in result


def test_given_empty_output_when_build_console_then_none() -> None:
    """
    Scenario: _build_console with empty/whitespace returns None.
    Slice: _build_console — empty input

    Given empty stdout and stderr,
    When _build_console is called,
    Then result is None.
    """
    ### Given / When / Then
    assert scanners._build_console("", "") is None
    assert scanners._build_console("  ", "  ") is None
    assert scanners._build_console(None, None) is None


def test_given_long_text_when_truncate_console_then_head_tail_preserved() -> None:
    """
    Scenario: _truncate_console preserves head and tail of long output.
    Slice: _truncate_console — truncation

    Given text longer than MAX_CONSOLE_CHARS,
    When _truncate_console is called,
    Then head and tail are preserved with an omission marker.
    """
    ### Given
    text = "A" * 1000 + "MIDDLE" + "Z" * 3000

    ### When
    result = scanners._truncate_console(text, max_chars=200)

    ### Then
    assert result is not None
    assert len(result) <= 250, "truncated result should be bounded"
    assert result.startswith("A"), "head must be preserved"
    assert result.endswith("Z"), "tail must be preserved"
    assert "omitted" in result, "must include omission marker"


def test_given_short_text_when_truncate_console_then_unchanged() -> None:
    """
    Scenario: _truncate_console returns short text as-is.
    Slice: _truncate_console — passthrough

    Given text shorter than max,
    When _truncate_console is called,
    Then result is the original text.
    """
    ### Given / When / Then
    assert scanners._truncate_console("short", max_chars=3000) == "short"
    assert scanners._truncate_console(None) is None


def test_given_completed_with_console_when_building_row_then_console_output_in_row() -> None:
    """
    Scenario: Completed scanner rows carry console_output when provided.
    Slice: _completed — console_output relay

    Given findings and console output,
    When _completed builds the row,
    Then detail has the summary and console_output has the raw text.
    """
    ### Given
    findings = [{"severity": "red", "message": "injection"}]
    console = '{"findings": [{"severity": "red"}]}'

    ### When
    row = scanners._completed("Snyk", 1, findings, console_output=console)

    ### Then
    assert row["status"] == "completed"
    assert "1 finding" in row["detail"]
    assert row["console_output"] == console


def test_given_completed_without_console_when_building_row_then_no_console_key() -> None:
    """
    Scenario: Completed scanner rows omit console_output when not provided.
    Slice: _completed — no console_output

    Given no console output,
    When _completed builds the row,
    Then console_output key is absent.
    """
    ### Given / When
    row = scanners._completed("Snyk", 5, [])

    ### Then
    assert "console_output" not in row


def test_given_callback_when_run_all_then_callback_called_per_scanner_group() -> None:
    """
    Scenario: on_scanner_done is called after each scanner group finishes.
    Slice: run_all_scanners — incremental relay

    Given mocked scanners and an on_scanner_done callback,
    When run_all_scanners runs for a skill,
    Then the callback is called once per scanner group with findings+rows.
    """
    ### Given
    cisco_findings = [{"severity": "red", "message": "test", "scanner_source": "Cisco"}]
    cisco_rows = [{"scanner_source": "Cisco", "status": "completed", "checks_run": 1}]
    tessl_rows = [{"scanner_source": "Tessl", "status": "completed", "checks_run": 1}]
    snyk_rows = [{"scanner_source": "Snyk", "status": "completed", "checks_run": 1}]
    callback_calls = []

    def on_done(findings, rows, quality_score=None):
        callback_calls.append({"findings": findings, "rows": rows, "quality_score": quality_score})

    ### When
    with (
        patch.object(
            scanners, "run_cisco_skill_scanner", return_value=(cisco_findings, cisco_rows)
        ),
        patch.object(scanners, "run_tessl", return_value=(85.0, tessl_rows)),
        patch.object(scanners, "run_snyk", return_value=([], snyk_rows)),
    ):
        result = scanners.run_all_scanners(
            "/tmp/skill", "skill", "/tmp/skill", on_scanner_done=on_done
        )

    ### Then
    assert len(callback_calls) == 3, "must call back once per scanner group (Cisco, Tessl, Snyk)"

    assert callback_calls[0]["findings"] == cisco_findings
    assert callback_calls[0]["rows"] == cisco_rows
    assert callback_calls[0]["quality_score"] is None

    assert callback_calls[1]["rows"] == tessl_rows
    assert callback_calls[1]["quality_score"] == 85.0

    assert callback_calls[2]["rows"] == snyk_rows

    assert result["overall_status"] == "complete"
    assert result["quality_score"] == 85.0


def test_given_no_callback_when_run_all_then_works_unchanged() -> None:
    """
    Scenario: run_all_scanners without callback preserves backward compat.
    Slice: run_all_scanners — no callback

    Given mocked scanners and no callback,
    When run_all_scanners runs,
    Then results are returned normally without error.
    """
    ### Given / When
    with (
        patch.object(
            scanners,
            "run_cisco_mcp_scanner",
            return_value=([], [{"scanner_source": "YARA", "status": "completed", "checks_run": 1}]),
        ),
        patch.object(
            scanners,
            "run_snyk",
            return_value=([], [{"scanner_source": "Snyk", "status": "completed", "checks_run": 1}]),
        ),
    ):
        result = scanners.run_all_scanners("/tmp/mcp", "mcp_server", "https://example.com")

    ### Then
    assert result["overall_status"] == "complete"
    assert len(result["scanner_rows"]) == 2


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
