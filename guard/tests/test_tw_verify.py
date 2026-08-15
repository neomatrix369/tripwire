"""
Acceptance tests for /tw-verify (slice 28).

Author: slice-28
Created: 2026-08-15
Scope: multi-name one-pass; six UI states; RED note; unscanned→scan offer; not-found; SKILL.md
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
TW_VERIFY_SKILL = REPO_ROOT / ".claude" / "skills" / "tw-verify" / "SKILL.md"
RED_BLOCK_NOTE = "Will be blocked when Tripwire is enabled"
NOW = datetime(2026, 8, 15, 12, 0, 0, tzinfo=UTC)


def _resolved(name: str, artifact_type: str = "skill") -> Any:
    from guard.verify import ResolvedArtifact

    return ResolvedArtifact(
        name=name,
        artifact_type=artifact_type,
        resolved_path=f"/tmp/{name}",
    )


def _status(
    *,
    heatmap: str | None = "green",
    scanned_at: datetime | None = None,
    run_status: str | None = "complete",
) -> Any:
    from guard.verify import StatusRecord

    return StatusRecord(
        heatmap_status=heatmap,
        scanned_at=scanned_at if scanned_at is not None else NOW - timedelta(days=1),
        run_status=run_status,
    )


def test_given_two_names_when_verify_then_one_pass_table_and_json() -> None:
    """
    Scenario: Multi-name verify reports every name in one Markdown table and JSON.
    Slice: 28 — multi-name one-pass

    Given two resolvable names with distinct statuses,
    When verify_artifacts runs,
    Then both names appear as table rows and in artifacts[] without stopping early.
    """
    from guard.verify import verify_artifacts

    ### Given
    names = ["safe-skill", "vuln-skill"]

    def resolve(name: str):
        return _resolved(name)

    def fetch_status(resolved):
        if resolved.name == "safe-skill":
            return _status(heatmap="green")
        return _status(heatmap="red")

    ### When
    actual = verify_artifacts(
        names,
        resolve=resolve,
        fetch_status=fetch_status,
        validity_days=14,
        now=lambda: NOW,
    )

    ### Then
    assert len(actual.artifacts) == 2, "must report both names in one pass"
    assert [row.name for row in actual.artifacts] == names
    machine = actual.to_machine()
    assert len(machine["artifacts"]) == 2
    markdown = actual.to_markdown()
    assert "| Name | Type | Status | Note |" in markdown
    assert "safe-skill" in markdown
    assert "vuln-skill" in markdown
    assert markdown.count("\n| `") >= 2 or markdown.count("| `safe-skill`") == 1


SIX_STATE_CASES = [
    ("fresh-green", "fresh", "green"),
    ("stale-skill", "stale", "green"),
    ("new-skill", "unscanned", None),
    ("pending-skill", "scanning", None),
    ("missing-skill", "not-found", None),
    ("vuln-skill", "red", "red"),
]


@pytest.mark.parametrize(("name", "expected_state", "expected_rag"), SIX_STATE_CASES)
def test_given_state_fixture_when_verify_then_contract_state(
    name: str,
    expected_state: str,
    expected_rag: str | None,
) -> None:
    """
    Scenario: Each of the six UI states renders per the slice-26 contract.
    Slice: 28 — state coverage

    Given a fixture for one UI state,
    When verify runs,
    Then artifact.state (and rag when applicable) matches the contract.
    """
    from guard.verify import StatusRecord, verify_artifacts

    ### Given
    def resolve(query: str):
        if query == "missing-skill":
            return None
        return _resolved(query)

    def fetch_status(resolved):
        if resolved.name == "fresh-green":
            return _status(heatmap="green")
        if resolved.name == "stale-skill":
            return _status(
                heatmap="green",
                scanned_at=NOW - timedelta(days=30),
            )
        if resolved.name == "new-skill":
            return StatusRecord(heatmap_status="grey", scanned_at=None, run_status=None)
        if resolved.name == "pending-skill":
            return StatusRecord(
                heatmap_status="grey",
                scanned_at=None,
                run_status="running",
            )
        if resolved.name == "vuln-skill":
            return _status(heatmap="red")
        return _status(heatmap="green")

    ### When
    actual = verify_artifacts(
        [name],
        resolve=resolve,
        fetch_status=fetch_status,
        validity_days=14,
        now=lambda: NOW,
    )

    ### Then
    assert len(actual.artifacts) == 1
    row = actual.artifacts[0]
    assert row.state == expected_state, f"expected state {expected_state} for {name}"
    assert row.rag == expected_rag
    status_cell = actual.to_markdown()
    assert row.name in status_cell


def test_given_red_artifact_when_verify_then_block_note_and_flag() -> None:
    """
    Scenario: RED always carries the Tripwire block warning.
    Slice: 28 — RED block note

    Given a RED artifact within the validity window,
    When verify reports it,
    Then Note includes the block warning and will_be_blocked is true.
    """
    from guard.verify import verify_artifacts

    ### Given
    def resolve(name: str):
        return _resolved(name)

    def fetch_status(_resolved):
        return _status(heatmap="red")

    ### When
    actual = verify_artifacts(
        ["vuln-skill"],
        resolve=resolve,
        fetch_status=fetch_status,
        validity_days=14,
        now=lambda: NOW,
    )

    ### Then
    row = actual.artifacts[0]
    assert row.state == "red"
    assert row.will_be_blocked is True
    assert RED_BLOCK_NOTE in row.note
    assert RED_BLOCK_NOTE in actual.to_markdown()


def test_given_unscanned_when_verify_then_offers_tw_scan() -> None:
    """
    Scenario: Unscanned artifacts offer /tw-scan for that name.
    Slice: 28 — unscanned offers scan

    Given an unscanned artifact,
    When verify reports it,
    Then the Note offers /tw-scan for that name.
    """
    from guard.verify import StatusRecord, verify_artifacts

    ### Given
    name = "new-skill"

    def resolve(query: str):
        return _resolved(query)

    def fetch_status(_resolved):
        return StatusRecord(heatmap_status="grey", scanned_at=None, run_status=None)

    ### When
    actual = verify_artifacts(
        [name],
        resolve=resolve,
        fetch_status=fetch_status,
        validity_days=14,
        now=lambda: NOW,
    )

    ### Then
    row = actual.artifacts[0]
    assert row.state == "unscanned"
    assert "/tw-scan" in row.note
    assert name in row.note


def test_given_unresolved_name_when_verify_then_human_not_found_message() -> None:
    """
    Scenario: Not-found names get a useful human message, not a bare error.
    Slice: 28 — not-found human-readable

    Given a name with no resolution match,
    When verify runs,
    Then the response includes a useful human message (not a bare error),
    and fetch_status is never invoked for missing names.
    """
    from guard.verify import verify_artifacts

    ### Given
    name = "unknown-skill"

    def resolve(_query: str):
        return None

    def fetch_status(_resolved):
        raise AssertionError("fetch_status must not run for not-found")

    ### When
    actual = verify_artifacts(
        [name],
        resolve=resolve,
        fetch_status=fetch_status,
        validity_days=14,
        now=lambda: NOW,
    )

    ### Then
    row = actual.artifacts[0]
    assert row.state == "not-found"
    assert row.name == name
    assert row.resolved_path is None
    assert "No match" in row.note or "not found" in row.note.lower()
    assert "Traceback" not in row.note
    assert "Exception" not in row.note
    assert "❓" in actual.to_markdown() or "NOT FOUND" in actual.to_markdown()


def test_given_repo_when_skill_looked_up_then_claude_layout_skill_md_exists() -> None:
    """
    Scenario: /tw-verify ships at the Claude skill layout path.
    Slice: 28 — skill installed at Claude layout

    Given the repo checkout,
    When an operator looks for /tw-verify,
    Then SKILL.md exists and points at verify_artifacts + the dual-output contract.
    """
    ### Given / When
    text = TW_VERIFY_SKILL.read_text(encoding="utf-8")

    ### Then
    assert TW_VERIFY_SKILL.is_file(), f"missing {TW_VERIFY_SKILL}"
    assert "verify_artifacts" in text
    assert "frontline-output-contract" in text or "dual" in text.lower()
    assert "Will be blocked when Tripwire is enabled" in text or "block" in text.lower()
