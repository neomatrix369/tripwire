"""
Acceptance tests for /tw-scan (slice 29).

Author: slice-29
Created: 2026-08-15
Scope: multi-name submit; --force / bare force; ID echo; force-token strip; SKILL.md
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
TW_SCAN_SKILL = REPO_ROOT / ".claude" / "skills" / "tw-scan" / "SKILL.md"
API_ECHO_KEYS = frozenset({"batch_id", "scan_run_ids", "failed_targets"})


def _resolved(name: str, artifact_type: str = "skill") -> Any:
    from guard.verify import ResolvedArtifact

    return ResolvedArtifact(
        name=name,
        artifact_type=artifact_type,
        resolved_path=f"/tmp/{name}",
    )


def _force_sensitive_submit(paths: list[str], *, force: bool) -> dict[str, Any]:
    """Simulate cached skip unless force — empty run IDs without force."""
    if force:
        return {
            "batch_id": "batch-forced",
            "scan_run_ids": [f"run-{i}" for i, _ in enumerate(paths)],
            "failed_targets": [],
        }
    return {
        "batch_id": "batch-cached",
        "scan_run_ids": [],
        "failed_targets": [],
    }


def test_given_two_names_when_scan_then_submitted_covers_both() -> None:
    """
    Scenario: Multi-name scan confirms every name and submits both paths once.
    Slice: 29 — multi-name submit

    Given two resolvable names,
    When scan_artifacts runs,
    Then machine submitted lists both names, markdown mentions both, and one
    submit receives both resolved paths.
    """
    from guard.scan import scan_artifacts

    ### Given
    names = ["skill-a", "skill-b"]
    captured: list[tuple[list[str], bool]] = []

    def resolve(name: str):
        return _resolved(name)

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        captured.append((list(paths), force))
        return {
            "batch_id": "batch-1",
            "scan_run_ids": ["run-a", "run-b"],
            "failed_targets": [],
        }

    ### When
    actual = scan_artifacts(names, resolve=resolve, submit=submit, force=False)

    ### Then
    machine = actual.to_machine()
    assert machine["submitted"] == names, "submitted must list both names in order"
    markdown = actual.to_markdown()
    assert "skill-a" in markdown and "skill-b" in markdown
    assert len(captured) == 1, "must batch into one submit call"
    assert captured[0][0] == ["/tmp/skill-a", "/tmp/skill-b"]
    assert captured[0][1] is False


def test_given_force_flag_when_scan_then_new_run_ids() -> None:
    """
    Scenario: --force / force=True yields non-empty scan_run_ids over a cached result.
    Slice: 29 — --force works

    Given a force-sensitive submit double,
    When scan_artifacts runs with force=True,
    Then machine force is true and scan_run_ids is non-empty.
    """
    from guard.scan import scan_artifacts

    ### Given
    def resolve(name: str):
        return _resolved(name)

    ### When
    actual = scan_artifacts(
        ["fresh-skill"],
        resolve=resolve,
        submit=_force_sensitive_submit,
        force=True,
    )

    ### Then
    machine = actual.to_machine()
    assert machine["force"] is True
    assert machine["scan_run_ids"], "force must produce new scan_run_ids"


def test_given_bare_force_token_when_scan_then_same_as_force_flag() -> None:
    """
    Scenario: Bare force token has the same effect as --force.
    Slice: 29 — bare force works

    Given tokens ['skill-a', 'force'],
    When parse_scan_args then scan_artifacts with the force-sensitive submit,
    Then force is true, submitted is only skill-a, and scan_run_ids is non-empty.
    """
    from guard.scan import parse_scan_args, scan_artifacts

    ### Given
    tokens = ["skill-a", "force"]

    def resolve(name: str):
        return _resolved(name)

    ### When
    names, force = parse_scan_args(tokens)
    actual = scan_artifacts(
        names,
        resolve=resolve,
        submit=_force_sensitive_submit,
        force=force,
    )

    ### Then
    machine = actual.to_machine()
    assert force is True
    assert machine["force"] is True
    assert machine["submitted"] == ["skill-a"]
    assert machine["scan_run_ids"], "bare force must produce new scan_run_ids"


def test_given_successful_submit_when_scan_then_machine_echoes_ids() -> None:
    """
    Scenario: Confirmation echoes slice-26 scan stdout identifiers.
    Slice: 29 — identifiers returned

    Given a successful submit,
    When scan_artifacts responds,
    Then machine includes batch_id, scan_run_ids, failed_targets as API echo keys.
    """
    from guard.scan import scan_artifacts

    ### Given
    def resolve(name: str):
        return _resolved(name)

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del paths, force
        return {
            "batch_id": "11111111-1111-1111-1111-111111111111",
            "scan_run_ids": ["22222222-2222-2222-2222-222222222222"],
            "failed_targets": [],
        }

    ### When
    actual = scan_artifacts(["skill-a"], resolve=resolve, submit=submit)

    ### Then
    machine = actual.to_machine()
    assert isinstance(machine["batch_id"], str) and machine["batch_id"]
    assert isinstance(machine["scan_run_ids"], list) and machine["scan_run_ids"]
    assert isinstance(machine["failed_targets"], list)
    api_keys = API_ECHO_KEYS & machine.keys()
    # skill-composed keys may exist; API echo set must be exactly the three
    assert api_keys == API_ECHO_KEYS
    for key in API_ECHO_KEYS:
        assert key in machine


def test_given_force_tokens_when_parsed_then_absent_from_names() -> None:
    """
    Scenario: Force tokens are stripped from the artifact name list.
    Slice: 29 — force tokens not names

    Given tokens including --force and bare force among real names,
    When parse_scan_args runs,
    Then names are only the real artifacts and force is true.
    """
    from guard.scan import parse_scan_args

    ### Given
    tokens = ["skill-a", "--force", "skill-b", "force"]

    ### When
    names, force = parse_scan_args(tokens)

    ### Then
    assert names == ["skill-a", "skill-b"]
    assert force is True
    assert "force" not in names
    assert "--force" not in names


def test_given_repo_when_looking_for_tw_scan_then_skill_shipped() -> None:
    """
    Scenario: /tw-scan Claude skill is present at the expected layout.
    Slice: 29 — skill layout

    Given the repo checkout,
    When an operator reads .claude/skills/tw-scan/SKILL.md,
    Then the file exists and mentions scan_artifacts, batch_id, scan_run_ids,
    and frontline-output-contract.
    """
    ### Given / When
    assert TW_SCAN_SKILL.is_file(), f"missing skill at {TW_SCAN_SKILL}"
    text = TW_SCAN_SKILL.read_text(encoding="utf-8")

    ### Then
    assert "guard.scan.scan_artifacts" in text
    assert "batch_id" in text
    assert "scan_run_ids" in text
    assert "frontline-output-contract" in text


def test_given_mixed_resolve_when_scan_then_not_found_skipped() -> None:
    """
    Scenario: Unresolved names are reported and excluded from submit.
    Slice: 29 — not-found skip

    Given one resolvable name and one unresolved name,
    When scan_artifacts runs,
    Then submit receives only the resolved path, submitted lists only that name,
    and markdown mentions the unresolved name as not found.
    """
    from guard.scan import NOT_FOUND_NOTE, scan_artifacts

    ### Given
    captured: list[list[str]] = []

    def resolve(name: str):
        if name == "missing-skill":
            return None
        return _resolved(name)

    def submit(paths: list[str], *, force: bool) -> dict[str, Any]:
        del force
        captured.append(list(paths))
        return {
            "batch_id": "batch-partial",
            "scan_run_ids": ["run-1"],
            "failed_targets": [],
        }

    ### When
    actual = scan_artifacts(
        ["skill-a", "missing-skill"],
        resolve=resolve,
        submit=submit,
    )

    ### Then
    machine = actual.to_machine()
    assert machine["submitted"] == ["skill-a"]
    assert captured == [["/tmp/skill-a"]]
    markdown = actual.to_markdown()
    assert "missing-skill" in markdown
    assert NOT_FOUND_NOTE in markdown
