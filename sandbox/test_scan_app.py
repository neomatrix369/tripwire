"""
Tests for sandbox.scan_app Supabase resilience helpers.

Author: swami
Created: 2026-08-01
Scope: _is_column_error detection; _safe_insert fallback on PGRST204;
       _to_runtime_error Modal exception hygiene; _safe_update / _safe_rpc wrapping
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
import scan_app

# ---------------------------------------------------------------------------
# _is_column_error
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message",
    [
        "Could not find the 'completed_at' column of 'scan_run_scanners' in the schema cache (PGRST204)",
        "PGRST204: Could not find the 'started_at' column",
        "pgrst204 something something",
        "Could not find the 'console_output' column of 'scan_run_scanners' in the schema cache",
    ],
    ids=["full_pgrst204", "code_prefix", "case_insensitive", "no_code_but_column_text"],
)
def test_given_column_missing_message_when_checked_then_detected(message: str) -> None:
    """
    Scenario: Column-missing PostgREST errors are recognised for fallback.
    Slice: _is_column_error — PGRST204 detection

    Given an exception whose string matches a PGRST204 column-missing pattern,
    When _is_column_error is called,
    Then it returns True.
    """
    ### Given / When / Then
    assert scan_app._is_column_error(Exception(message)) is True


@pytest.mark.parametrize(
    "message",
    [
        "JWT expired",
        "connection refused",
        "PGRST205: table not found",
        "",
    ],
    ids=["jwt", "conn_refused", "table_not_found", "empty"],
)
def test_given_non_column_error_when_checked_then_not_detected(message: str) -> None:
    """
    Scenario: Non-column errors are not mistakenly matched.
    Slice: _is_column_error — false positives

    Given an exception unrelated to missing columns,
    When _is_column_error is called,
    Then it returns False.
    """
    ### Given / When / Then
    assert scan_app._is_column_error(Exception(message)) is False


# ---------------------------------------------------------------------------
# _to_runtime_error
# ---------------------------------------------------------------------------


def test_given_postgrest_exception_when_converted_then_runtime_error() -> None:
    """
    Scenario: PostgREST exceptions become plain RuntimeError for Modal.
    Slice: _to_runtime_error — Modal deserialization hygiene

    Given an exception with a class Modal can't deserialize,
    When _to_runtime_error wraps it,
    Then the result is a RuntimeError with the original message preserved.
    """
    ### Given
    original = ValueError("Could not find the 'completed_at' column (PGRST204)")

    ### When
    wrapped = scan_app._to_runtime_error(original, "scan_run_scanners insert")

    ### Then
    assert isinstance(wrapped, RuntimeError)
    assert "PGRST204" in str(wrapped)
    assert "scan_run_scanners insert" in str(wrapped)


# ---------------------------------------------------------------------------
# _safe_insert — fallback behaviour
# ---------------------------------------------------------------------------


def _mock_supabase_column_error():
    """Build a Supabase mock whose first insert raises a PGRST204 column error."""
    mock_sb = MagicMock()
    error = Exception(
        "Could not find the 'completed_at' column of 'scan_run_scanners' "
        "in the schema cache (PGRST204)"
    )
    inserted_rows = []

    def _insert_side_effect(row):
        inserted_rows.append(row)
        chain = MagicMock()
        if len(inserted_rows) == 1:
            chain.execute.side_effect = error
        return chain

    mock_sb.table.return_value.insert = _insert_side_effect
    return mock_sb, inserted_rows


def test_given_pgrst204_when_safe_insert_then_retries_with_legacy_cols() -> None:
    """
    Scenario: PGRST204 on insert triggers a fallback to legacy-safe columns.
    Slice: _safe_insert — column-missing fallback

    Given a Supabase mock that raises PGRST204 on the first insert,
    When _safe_insert is called with a row containing new columns,
    Then it retries with only legacy columns and does not raise.
    """
    ### Given
    mock_sb, inserted_rows = _mock_supabase_column_error()
    row = {
        "scan_run_id": "run-1",
        "scanner_source": "Snyk",
        "status": "completed",
        "checks_run": 3,
        "detail": "3 checks passed",
        "console_output": "raw output here",
        "completed_at": "2026-08-01T12:00:00Z",
    }

    ### When
    scan_app._safe_insert(mock_sb, "scan_run_scanners", row, "test insert")

    ### Then — two insert calls: original (failed) + fallback (succeeded)
    assert len(inserted_rows) == 2, "expected original + fallback insert attempts"  # noqa: PLR2004
    fallback = inserted_rows[1]
    assert "completed_at" not in fallback, "fallback must strip new columns"
    assert "console_output" not in fallback, "fallback must strip new columns"
    assert fallback["scanner_source"] == "Snyk"
    assert fallback["scan_run_id"] == "run-1"


def test_given_pgrst204_when_safe_insert_then_fallback_has_merged_detail() -> None:
    """
    Scenario: Fallback insert merges console_output into detail field.
    Slice: _safe_insert — detail preservation

    Given a PGRST204 failure with console_output in the row,
    When fallback insert is built,
    Then console data is merged into detail (truncated to 4000 chars).
    """
    ### Given
    mock_sb = MagicMock()
    error = Exception("PGRST204 column missing")
    inserted_rows = []

    def _insert(row):
        chain = MagicMock()
        if len(inserted_rows) == 0:
            chain.execute.side_effect = error
        else:
            chain.execute.return_value = None
        inserted_rows.append(row)
        return chain

    mock_sb.table.return_value.insert = _insert
    row = {
        "scan_run_id": "run-1",
        "scanner_source": "Snyk",
        "status": "completed",
        "checks_run": 1,
        "detail": "1 check",
        "console_output": "A" * 5000,
        "completed_at": "2026-08-01T12:00:00Z",
    }

    ### When
    scan_app._safe_insert(mock_sb, "scan_run_scanners", row, "test insert")

    ### Then
    fallback = inserted_rows[1]
    assert "completed_at" not in fallback
    assert "console_output" not in fallback
    assert "1 check" in fallback["detail"]
    assert len(fallback["detail"]) <= 4000  # noqa: PLR2004


def test_given_non_column_error_when_safe_insert_then_raises_runtime_error() -> None:
    """
    Scenario: Non-column Supabase errors raise RuntimeError without fallback.
    Slice: _safe_insert — non-recoverable path

    Given a Supabase mock that raises a non-column error (e.g. auth),
    When _safe_insert is called,
    Then RuntimeError is raised immediately without a fallback retry.
    """
    ### Given
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.side_effect = Exception("JWT expired")

    ### When / Then
    with pytest.raises(RuntimeError, match="JWT expired"):
        scan_app._safe_insert(
            mock_sb,
            "scan_run_scanners",
            {"scan_run_id": "x", "scanner_source": "y", "status": "completed", "checks_run": 0},
            "test",
        )


# ---------------------------------------------------------------------------
# _safe_update / _safe_rpc
# ---------------------------------------------------------------------------


def test_given_supabase_error_when_safe_update_then_raises_runtime_error() -> None:
    """
    Scenario: _safe_update converts PostgREST errors to RuntimeError.
    Slice: _safe_update — exception hygiene

    Given a Supabase mock that raises on update,
    When _safe_update is called,
    Then RuntimeError is raised with context.
    """
    ### Given
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.eq.return_value.execute.side_effect = Exception(
        "PGRST204"
    )

    ### When / Then
    with pytest.raises(RuntimeError, match="mark scan_run failed"):
        scan_app._safe_update(
            mock_sb, "scan_runs", {"status": "failed"}, "id", "run-1", "mark scan_run failed"
        )


def test_given_supabase_error_when_safe_rpc_then_raises_runtime_error() -> None:
    """
    Scenario: _safe_rpc converts PostgREST errors to RuntimeError.
    Slice: _safe_rpc — exception hygiene

    Given a Supabase mock that raises on rpc,
    When _safe_rpc is called,
    Then RuntimeError is raised with context.
    """
    ### Given
    mock_sb = MagicMock()
    mock_sb.rpc.return_value.execute.side_effect = Exception("connection refused")

    ### When / Then
    with pytest.raises(RuntimeError, match="rollup"):
        scan_app._safe_rpc(mock_sb, "tripwire_rollup_item", {"p_item_id": "item-1"}, "rollup")
