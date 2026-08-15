"""
Tests for Frontline dual output contract (slice 26).

Author: swami
Created: 2026-08-15
Scope: six UI states + heatmap mapping; human table columns; machine JSON
       fields; observed tripwire scan stdout shape (no invented fields)
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACT = REPO_ROOT / "docs" / "user-guide" / "frontline-output-contract.md"
ORCHESTRATOR = REPO_ROOT / "cli" / "src" / "orchestrator.js"
GUARD_HOOK = REPO_ROOT / "guard" / "guard_hook.py"

SIX_STATES = ("fresh", "stale", "unscanned", "scanning", "not-found", "red")
MACHINE_FIELDS = (
    "name",
    "resolved_path",
    "type",
    "state",
    "rag",
    "scanned_at",
    "stale",
    "will_be_blocked",
    "note",
)
SCAN_STDOUT_FIELDS = ("batch_id", "scan_run_ids", "failed_targets")
HEATMAP_VALUES = ("green", "amber", "red", "grey", "error")


def test_given_contract_doc_when_read_then_six_states_and_heatmap_mapping_present() -> None:
    """
    Scenario: Contract names all six UI states and maps heatmap_status sources.
    Slice: 26 — six states are named and mapped

    Given the Frontline dual-output contract doc,
    When an operator looks up each UI state and heatmap_status values,
    Then fresh/stale/unscanned/scanning/not-found/red and green/amber/red/grey/error
    are each documented with a mapping.
    """
    ### Given
    assert CONTRACT.is_file(), f"missing contract SSOT: {CONTRACT}"
    text = CONTRACT.read_text(encoding="utf-8")

    ### When / Then
    for state in SIX_STATES:
        assert re.search(rf"`{re.escape(state)}`", text), f"state `{state}` missing from contract"
    for value in HEATMAP_VALUES:
        assert f"heatmap_status={value}" in text or f"`{value}`" in text, (
            f"heatmap value `{value}` missing from contract mapping"
        )
    assert "heatmap_status" in text
    assert "Will be blocked when Tripwire is enabled" in text


def test_given_contract_doc_when_read_then_human_table_columns_are_fixed() -> None:
    """
    Scenario: Human Markdown table columns are Name | Type | Status | Note.
    Slice: 26 — human table columns are fixed

    Given the contract doc,
    When rendering a verify/scan response,
    Then the documented columns are Name, Type, Status, and Note in that order.
    """
    ### Given
    text = CONTRACT.read_text(encoding="utf-8")

    ### When / Then
    assert re.search(
        r"\|\s*Name\s*\|\s*Type\s*\|\s*Status\s*\|\s*Note\s*\|",
        text,
    ), "human table must declare columns Name | Type | Status | Note"


def test_given_contract_doc_when_read_then_machine_json_fields_are_fixed() -> None:
    """
    Scenario: Machine JSON artifact shape lists required dual-output fields.
    Slice: 26 — machine JSON shape is fixed

    Given the contract doc,
    When emitting machine output,
    Then each artifact documents name, resolved_path, type, state, rag,
    scanned_at, stale, will_be_blocked, and note.
    """
    ### Given
    text = CONTRACT.read_text(encoding="utf-8")

    ### When / Then
    assert '"artifacts"' in text or "`artifacts`" in text
    for field in MACHINE_FIELDS:
        assert f"`{field}`" in text, f"machine field `{field}` missing from contract"


def test_given_orchestrator_when_introspected_then_scan_json_matches_contract() -> None:
    """
    Scenario: Documented tripwire scan stdout matches orchestrator runScan result.
    Slice: 26 — scan JSON introspection recorded

    Given cli/src/orchestrator.js runScan result construction,
    When comparing to the contract's observed scan JSON section,
    Then batch_id, scan_run_ids, and failed_targets are both in code and docs,
    and BACKLOG notes that dual-output rows are not inventable from scan stdout alone.
    """
    ### Given
    assert ORCHESTRATOR.is_file()
    orch = ORCHESTRATOR.read_text(encoding="utf-8")
    contract = CONTRACT.read_text(encoding="utf-8")

    ### When / Then
    for field in SCAN_STDOUT_FIELDS:
        assert field in orch, f"orchestrator missing observed field {field}"
        assert f"`{field}`" in contract or f'"{field}"' in contract, (
            f"contract must document observed scan field {field}"
        )
    assert "BACKLOG" in contract
    assert "Do not invent" in contract or "Do not invent scan-stdout" in contract
    guard = GUARD_HOOK.read_text(encoding="utf-8")
    assert 'item["heatmap_status"]' in guard or "heatmap_status" in guard
