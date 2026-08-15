"""
Unit coverage for guard.scan edge paths (slice 29).

Author: slice-29
Created: 2026-08-15
Scope: all-unresolved early return; failed_targets markdown
"""

from __future__ import annotations

from typing import Any

from guard.scan import scan_artifacts
from guard.verify import ResolvedArtifact


def test_given_all_unresolved_when_scan_then_no_submit() -> None:
    """Scenario: When every name is unresolved, submit is not called."""
    ### Given
    calls = 0

    def resolve(_name: str) -> None:
        return None

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del paths, force
        nonlocal calls
        calls += 1
        return {"batch_id": "x", "scan_run_ids": [], "failed_targets": []}

    ### When
    actual = scan_artifacts(["ghost"], resolve=resolve, submit=submit)

    ### Then
    assert calls == 0
    machine = actual.to_machine()
    assert machine["batch_id"] == ""
    assert machine["submitted"] == []
    assert machine["skipped"] == ["ghost"]


def test_given_failed_targets_when_markdown_then_lists_failures() -> None:
    """Scenario: failed_targets from the API appear in Markdown confirmation."""

    ### Given
    def resolve(name: str) -> ResolvedArtifact:
        return ResolvedArtifact(name=name, artifact_type="skill", resolved_path=f"/tmp/{name}")

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del force
        return {
            "batch_id": "batch-fail",
            "scan_run_ids": [],
            "failed_targets": [{"target": paths[0], "error": "dispatch boom"}],
        }

    ### When
    actual = scan_artifacts(["skill-a"], resolve=resolve, submit=submit)
    markdown = actual.to_markdown()

    ### Then
    assert "dispatch boom" in markdown
    assert "/tmp/skill-a" in markdown or "skill-a" in markdown


def test_given_empty_path_resolve_when_scan_then_skipped() -> None:
    """Scenario: ResolvedArtifact with empty path is treated as not found."""

    ### Given
    def resolve(name: str) -> ResolvedArtifact:
        return ResolvedArtifact(name=name, artifact_type="skill", resolved_path="")

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del paths, force
        raise AssertionError("submit must not run")

    ### When
    actual = scan_artifacts(["empty-path"], resolve=resolve, submit=submit)

    ### Then
    assert actual.to_machine()["skipped"] == ["empty-path"]


def test_given_sparse_failure_dict_when_markdown_then_defaults() -> None:
    """Scenario: failed_targets missing keys still render safely."""

    ### Given
    def resolve(name: str) -> ResolvedArtifact:
        return ResolvedArtifact(name=name, artifact_type="skill", resolved_path=f"/tmp/{name}")

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del paths, force
        return {"batch_id": "b", "scan_run_ids": ["r1"], "failed_targets": [{}]}

    ### When
    markdown = scan_artifacts(["skill-a"], resolve=resolve, submit=submit).to_markdown()

    ### Then
    assert "failed `?`" in markdown
    assert "unknown error" in markdown
