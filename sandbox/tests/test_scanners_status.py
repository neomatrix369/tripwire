"""
Tests for sandbox.scanners overall status, unreachable detail, console capture,
and incremental callback relay.

Author: swami
Created: 2026-08-01
Scope: run_all_scanners overall_status; _unreachable detail truncation;
       _build_console / _truncate_console; on_scanner_done callback relay;
       _completed console_output passthrough;
       Tessl ID context seed after Review Quality (GWT-47.5)
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
    depshield_rows = [{"scanner_source": "DepShield", "status": "completed", "checks_run": 1}]
    ossprey_rows = [{"scanner_source": "Ossprey", "status": "completed", "checks_run": 1}]
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
        patch.object(scanners, "run_depshield", return_value=([], depshield_rows)),
        patch.object(scanners, "run_ossprey", return_value=([], ossprey_rows)),
    ):
        result = scanners.run_all_scanners(
            "/tmp/skill", "skill", "/tmp/skill", on_scanner_done=on_done
        )

    ### Then
    assert len(callback_calls) == 5, (
        "must call back once per scanner group (Cisco, Tessl, Snyk, DepShield, Ossprey)"
    )

    assert callback_calls[0]["findings"] == cisco_findings
    assert callback_calls[0]["rows"] == cisco_rows
    assert callback_calls[0]["quality_score"] is None

    assert callback_calls[1]["rows"] == tessl_rows
    assert callback_calls[1]["quality_score"] == 85.0

    assert callback_calls[2]["rows"] == snyk_rows

    assert callback_calls[3]["rows"] == depshield_rows

    assert callback_calls[4]["rows"] == ossprey_rows

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
        patch.object(scanners, "run_depshield", return_value=([], [])),
        patch.object(scanners, "run_ossprey", return_value=([], [])),
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
            return_value=(None, [scanners._unreachable("Tessl: Review (Quality)", "node too old")]),
        ),
        patch.object(
            scanners,
            "run_snyk",
            return_value=([], [scanners._unreachable("Snyk", "cold install failed")]),
        ),
        patch.object(scanners, "run_depshield", return_value=([], [])),
        patch.object(scanners, "run_ossprey", return_value=([], [])),
    ):
        result = scanners.run_all_scanners("/tmp/skill", "skill", "/tmp/skill")

    ### Then
    assert result["overall_status"] == "partial-failed"
    assert len(result["findings"]) == 1
    assert result["findings"][0]["severity"] == "red"
    tessl = next(
        r for r in result["scanner_rows"] if r["scanner_source"] == "Tessl: Review (Quality)"
    )
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
        patch.object(
            scanners,
            "run_depshield",
            return_value=(
                [],
                [{"scanner_source": "DepShield", "status": "completed", "checks_run": 1}],
            ),
        ),
        patch.object(
            scanners,
            "run_ossprey",
            return_value=(
                [],
                [{"scanner_source": "Ossprey", "status": "completed", "checks_run": 1}],
            ),
        ),
    ):
        result = scanners.run_all_scanners("/tmp/skill", "skill", "/tmp/skill")

    ### Then
    assert result["overall_status"] == "complete"
    assert result["quality_score"] == 0.9


# --- slice-42 A4: Tessl quality_score parsing and diagnostic logging ---


def test_tessl_quality_score_known_shapes_return_float() -> None:
    """
    Scenario: _tessl_quality_score extracts a float from each supported CLI output shape.
      Given a parsed JSON object in the "score" shape, "reviewScore" shape, or "normalizedScore" shape
      When _tessl_quality_score is called
      Then a non-None float is returned for each known shape

    Slice: 42 / A4 — Tessl quality_score extraction coverage
    """
    ### Given / When / Then — score key
    assert scanners._tessl_quality_score({"score": 72}) == 72

    ### Given / When / Then — reviewScore inside "review" object
    assert scanners._tessl_quality_score({"review": {"reviewScore": 68.5}}) == 68.5

    ### Given / When / Then — normalizedScore averaged across judge keys
    result = scanners._tessl_quality_score(
        {
            "descriptionJudge": {"normalizedScore": 0.8},
            "contentJudge": {"normalizedScore": 0.6},
        }
    )
    assert result is not None
    assert abs(result - 70.0) < 0.001, f"Expected 70.0 got {result}"


def test_tessl_quality_score_unknown_shape_returns_none() -> None:
    """
    Scenario: _tessl_quality_score returns None (no crash) for an unknown JSON shape.
      Given a parsed JSON object with none of the recognised score keys
      When _tessl_quality_score is called
      Then None is returned

    Slice: 42 / A4 — Tessl quality_score unknown shape guard
    """
    ### Given
    unknown_shape = {"someOtherKey": 99, "nested": {"value": 42}}

    ### When
    result = scanners._tessl_quality_score(unknown_shape)

    ### Then
    assert result is None


def test_run_tessl_logs_diagnostic_when_score_is_none(capsys) -> None:
    """
    Scenario: run_tessl prints a diagnostic line when _tessl_quality_score returns None.
      Given TESSL_TOKEN set, npx available, lint exits 0, review exits 0 with unknown JSON
      When run_tessl is called
      Then a [tessl] diagnostic line is printed containing the raw output prefix
      And the function returns (None, [lint_completed, review_unreachable]) without crashing

    Slice: 42 / A4 — Tessl diagnostic logging on score extraction failure
    """
    ### Given
    lint_output = "12 checks — 0 findings"
    unknown_json_output = '{"unexpectedKey": "no score here"}'

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "fake-token", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(
            scanners,
            "_run",
            side_effect=[(0, lint_output, ""), (0, unknown_json_output, "")],
        ),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score is None
    assert len(rows) == 2
    lint_row, review_row = rows
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row["status"] == "completed"
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["status"] == "unreachable"
    captured = capsys.readouterr()
    assert "[tessl]" in captured.out
    assert "quality_score extraction failed" in captured.out


# --- slice-46: Tessl Lint Adapter (Row 1) ---


def test_run_tessl_without_token_emits_lint_completed_and_review_needs_setup() -> None:
    """
    Scenario: TESSL_TOKEN absent — Lint runs, Review (Quality) is needs_setup.
      Given TESSL_TOKEN is absent from the environment
      When run_tessl is called with npx available and lint exits 0
      Then a Tessl: Lint row with status completed is returned
      And a Tessl: Review (Quality) row with status needs_setup is returned
      And quality_score is None

    Slice: 46 — GWT-46.2 lint auth-free / review needs_setup
    """
    ### Given
    lint_output = "12 checks — 0 findings"

    ### When
    with (
        patch.dict("os.environ", {}, clear=True),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(scanners, "_run", return_value=(0, lint_output, "")),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score is None
    assert len(rows) == 2
    lint_row, review_row = rows
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row["status"] == "completed"
    assert lint_row["checks_run"] == 12
    assert "12 checks" in lint_row["detail"]
    assert lint_row.get("tessl_run_id") is None
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["status"] == "needs_setup"


def test_run_tessl_with_token_emits_lint_and_review_rows() -> None:
    """
    Scenario: TESSL_TOKEN present — both Lint and Review (Quality) rows returned.
      Given TESSL_TOKEN is present and both subprocess calls succeed
      When run_tessl is called
      Then lint row is completed at position 0
      And review row is completed at position 1 with quality_score extracted
      And quality_score is returned as a float

    Slice: 46 — GWT-46.1 lint row present with token
    """
    ### Given
    lint_output = "8 checks — 2 findings"
    review_json = '{"score": 75}'

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "tok-abc", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(
            scanners,
            "_run",
            side_effect=[
                (0, lint_output, ""),
                (0, review_json, ""),
                (0, '{"id": "rev_abc123", "score": 75}', ""),
            ],
        ),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score == 75
    assert len(rows) == 2
    lint_row, review_row = rows
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row["status"] == "completed"
    assert lint_row.get("tessl_run_id") is None
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["status"] == "completed"
    assert review_row["tessl_run_id"] == "rev_abc123"
    assert review_row["tessl_run_id_at"]


def test_run_tessl_lint_failure_emits_failed_row() -> None:
    """
    Scenario: Lint subprocess exits non-zero — row status is failed.
      Given TESSL_TOKEN absent (so only lint runs), npx available, lint exits 1
      When run_tessl is called
      Then the Tessl: Lint row has status failed
      And the review row has status needs_setup

    Slice: 46 — GWT-46.1 lint failed row
    """
    ### Given / When
    with (
        patch.dict("os.environ", {}, clear=True),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(scanners, "_run", return_value=(1, "", "lint process crashed")),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score is None
    lint_row, review_row = rows
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row["status"] == "failed"
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["status"] == "needs_setup"


def test_run_tessl_no_npx_emits_lint_unreachable() -> None:
    """
    Scenario: npx missing — Lint row is unreachable.
      Given npx is not on PATH and TESSL_TOKEN absent
      When run_tessl is called
      Then the Tessl: Lint row has status unreachable
      And the review row has status needs_setup

    Slice: 46 — GWT-46.1 lint unreachable when npx absent
    """
    ### Given / When
    with (
        patch.dict("os.environ", {}, clear=True),
        patch.object(scanners, "_which", return_value=None),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score is None
    assert len(rows) == 2
    lint_row, review_row = rows
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row["status"] == "unreachable"
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["status"] == "needs_setup"


def test_parse_tessl_lint_detail_extracts_count_from_text() -> None:
    """
    Scenario: _parse_tessl_lint_detail extracts check count from common output patterns.
      Given lint output containing "12 checks", "3 warnings", or "0 findings"
      When _parse_tessl_lint_detail is called
      Then checks_run is the leading digit and detail is the first 500 chars

    Slice: 46 — GWT-46.3 lint counts parsed
    """
    ### Given / When / Then
    checks_run, detail = scanners._parse_tessl_lint_detail("12 checks — 0 findings")
    assert checks_run == 12
    assert "12 checks" in detail

    checks_run2, _ = scanners._parse_tessl_lint_detail("3 warnings found")
    assert checks_run2 == 3

    checks_run3, detail3 = scanners._parse_tessl_lint_detail("")
    assert checks_run3 is None
    assert detail3 == "lint completed — no output"


def test_parse_tessl_lint_detail_live_valid_plugin_counts_one_check() -> None:
    """
    Scenario: live tessl skill lint success has no numeric count.
      Given stdout captured 2026-08-24 from `tessl skill lint` on a plugin package
      When _parse_tessl_lint_detail is called
      Then checks_run is 1 (one package validation ran) and detail keeps the valid line

    Slice: 46 — GWT-46.3 live completed path (plugin-is-valid stdout)
    """
    ### Given
    live_stdout = "✔ Plugin tripwire/safe-changelog-writer@0.0.1 is valid"

    ### When
    checks_run, detail = scanners._parse_tessl_lint_detail(live_stdout)

    ### Then
    assert checks_run == 1
    assert "is valid" in detail.lower()


def test_parse_tessl_run_id_from_common_json_shapes() -> None:
    """
    Scenario: _parse_tessl_run_id reads id / runId / nested review.id.
    Slice: 47 — GWT-47.1 tessl_run_id capture

    Given Tessl --json objects with drifting id keys,
    When _parse_tessl_run_id is called,
    Then the run id string is returned (or None when absent).
    """
    ### Given / When / Then
    assert scanners._parse_tessl_run_id({"id": "rev_abc123"}) == "rev_abc123"
    assert scanners._parse_tessl_run_id({"runId": "rev_xyz"}) == "rev_xyz"
    assert scanners._parse_tessl_run_id({"run_id": "rev_under"}) == "rev_under"
    assert scanners._parse_tessl_run_id({"review": {"id": "rev_nested"}}) == "rev_nested"
    assert scanners._parse_tessl_run_id({"score": 70}) is None
    assert scanners._parse_tessl_run_id(None) is None


def test_run_tessl_review_quality_invokes_review_run_quality() -> None:
    """
    Scenario: Quality review uses tessl review run quality, not skill review.
    Slice: 47 — GWT-47.4 parameterised judge_type=quality

    Given TESSL_TOKEN and TESSL_WORKSPACE are set,
    When run_tessl is called,
    Then the review subprocess is tessl review run quality --json --workspace,
    And the row is Tessl: Review (Quality) only.
    """
    ### Given
    captured: list[list[str]] = []

    def _capture_run(cmd, timeout=None):
        captured.append(cmd)
        if cmd[3:5] == ["skill", "lint"]:
            return 0, "1 check", ""
        if cmd[3:6] == ["review", "run", "quality"]:
            return 0, '{"score": 80, "id": "rev_from_run"}', ""
        if cmd[3:6] == ["review", "view", "--last"]:
            return 0, '{"id": "rev_from_view", "score": 80}', ""
        raise AssertionError(f"unexpected cmd: {cmd}")

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(scanners, "_run", side_effect=_capture_run),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score == 80
    review_cmds = [c for c in captured if c[3:5] == ["review", "run"]]
    assert len(review_cmds) == 1
    assert review_cmds[0][5] == "quality"
    assert "--workspace" in review_cmds[0]
    assert "engteam" in review_cmds[0]
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert all(r["scanner_source"] != "Tessl: Review (Security)" for r in rows)


def test_run_tessl_captures_run_id_from_view_last_json() -> None:
    """
    Scenario: tessl_run_id comes from tessl review view --last --json.
    Slice: 47 — GWT-47.1

    Given review run JSON has a different id than view --last,
    When run_tessl completes,
    Then tessl_run_id is the view --last id and tessl_run_id_at is set.
    """
    ### Given
    lint_output = "4 checks"
    run_json = '{"score": 64, "id": "rev_from_run"}'
    view_json = '{"score": 64, "id": "rev_from_view"}'

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(
            scanners,
            "_run",
            side_effect=[(0, lint_output, ""), (0, run_json, ""), (0, view_json, "")],
        ),
    ):
        _score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    review_row = rows[1]
    assert review_row["scanner_source"] == "Tessl: Review (Quality)"
    assert review_row["tessl_run_id"] == "rev_from_view"
    assert review_row["tessl_run_id_at"]
    assert "T" in review_row["tessl_run_id_at"]


def test_run_tessl_falls_back_to_run_json_id_when_view_last_fails() -> None:
    """
    Scenario: view --last failure still stamps tessl_run_id from run --json.
    Slice: 47 — GWT-47.1 fallback

    Given review run JSON includes id and view --last exits non-zero,
    When run_tessl completes,
    Then tessl_run_id is the run JSON id.
    """
    ### Given / When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(
            scanners,
            "_run",
            side_effect=[
                (0, "1 check", ""),
                (0, '{"score": 50, "id": "rev_run_only"}', ""),
                (1, "", "view failed"),
            ],
        ),
    ):
        _score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert rows[1]["tessl_run_id"] == "rev_run_only"


def test_run_tessl_without_workspace_emits_review_needs_setup() -> None:
    """
    Scenario: TESSL_WORKSPACE absent — Review (Quality) is needs_setup.
    Slice: 47 — GWT-47.3 needs_setup for missing review config

    Given TESSL_TOKEN is set and TESSL_WORKSPACE is absent,
    When run_tessl is called,
    Then Review (Quality) status is needs_setup and no review subprocess runs.
    """
    ### Given
    ran: list[list[str]] = []

    def _record(cmd, timeout=None):
        ran.append(cmd)
        return 0, "1 check", ""

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "t"}, clear=True),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(scanners, "_run", side_effect=_record),
    ):
        score, rows = scanners.run_tessl("/tmp/fake-skill")

    ### Then
    assert score is None
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert rows[1]["status"] == "needs_setup"
    assert all(c[3:5] != ["review", "run"] for c in ran)


def test_given_quality_review_completes_when_run_tessl_then_ctx_review_quality_is_stamped_id() -> (
    None
):
    """
    Scenario: Quality Review run ID seeds in-process Tessl ID context.
    Slice: 47 — GWT-47.5 _TesslIdContext after Quality stamp

    Given run_tessl initialises ctx with review_quality and scenario_gen as None,
    When Quality Review completes and stamps tessl_run_id,
    Then ctx["review_quality"] is that run ID for downstream steps in this invocation,
    And Lint stays outside the ID chain (no tessl_run_id; no ctx update from Lint).
    """
    ### Given
    ctx = scanners._new_tessl_id_context()
    lint_output = "4 checks"
    run_json = '{"score": 64, "id": "rev_from_run"}'
    view_json = '{"score": 64, "id": "rev_from_view"}'

    ### When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"}),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(
            scanners,
            "_run",
            side_effect=[(0, lint_output, ""), (0, run_json, ""), (0, view_json, "")],
        ),
    ):
        _score, rows = scanners.run_tessl("/tmp/fake-skill", id_context=ctx)

    ### Then
    expected_run_id = "rev_from_view"
    actual_ctx_quality = ctx["review_quality"]
    assert actual_ctx_quality == expected_run_id, (
        f"ctx['review_quality'] should carry the stamped Quality run ID; got {actual_ctx_quality!r}"
    )
    assert ctx["scenario_gen"] is None, "scenario_gen must stay None until slice 49 stamps it"
    lint_row = rows[0]
    assert lint_row["scanner_source"] == "Tessl: Lint"
    assert lint_row.get("tessl_run_id") is None, (
        "Lint is outside the Tessl ID chain — tessl_run_id must stay unset"
    )


def test_given_review_needs_setup_when_run_tessl_then_ctx_review_quality_stays_none() -> None:
    """
    Scenario: Missing Review credentials leave Tessl ID context unseeded for Quality.
    Slice: 47 — GWT-47.5 ctx stays null when Quality does not stamp

    Given TESSL_TOKEN is absent,
    When run_tessl runs Lint then marks Review needs_setup,
    Then ctx["review_quality"] stays None,
    And Lint still has no tessl_run_id.
    """
    ### Given
    ctx = scanners._new_tessl_id_context()

    ### When
    with (
        patch.dict("os.environ", {}, clear=True),
        patch.object(scanners, "_which", return_value="/usr/bin/npx"),
        patch.object(scanners, "_run", return_value=(0, "1 check", "")),
    ):
        _score, rows = scanners.run_tessl("/tmp/fake-skill", id_context=ctx)

    ### Then
    assert ctx["review_quality"] is None, (
        "Quality run ID must not be invented when Review is needs_setup"
    )
    assert ctx["scenario_gen"] is None, "scenario_gen must stay None in slice 47"
    assert rows[0].get("tessl_run_id") is None, (
        "Lint remains outside the ID chain when Review is skipped"
    )


def test_given_empty_state_when_new_tessl_id_context_then_quality_and_scenario_keys_are_none() -> (
    None
):
    """
    Scenario: Tessl ID context starts with Quality and scenario_gen unset.
    Slice: 47 — GWT-47.5 _TesslIdContext seed shape

    Given no prior Tessl step has run,
    When _new_tessl_id_context is called,
    Then review_quality and scenario_gen are present and None.
    """
    ### Given / When
    actual_ctx = scanners._new_tessl_id_context()

    ### Then
    expected_ctx = {"review_quality": None, "scenario_gen": None}
    assert actual_ctx == expected_ctx, f"Seed ctx must be {expected_ctx!r}, got {actual_ctx!r}"
