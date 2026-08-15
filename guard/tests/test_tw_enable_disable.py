"""
Acceptance tests for /tw-enable and /tw-disable (slice 27).

Author: slice-27
Created: 2026-08-15
Scope: set_enable preserve keys; manual verify/scan when disabled; SKILL.md layout
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
TW_ENABLE_SKILL = REPO_ROOT / ".claude" / "skills" / "tw-enable" / "SKILL.md"
TW_DISABLE_SKILL = REPO_ROOT / ".claude" / "skills" / "tw-disable" / "SKILL.md"


def test_given_enable_false_when_tw_enable_then_flag_true_other_keys_unchanged(
    tmp_path: Path,
) -> None:
    """
    Scenario: /tw-enable sets only the enable flag to true.
    Slice: 27 — enable sets flag true

    Given config with enable=false and an extra key,
    When set_enable(..., True) runs,
    Then enable is true and other keys are unchanged.
    """
    from guard.config import set_enable

    ### Given
    path = tmp_path / "config.json"
    path.write_text(
        json.dumps(
            {
                "enable": False,
                "scan_validity_days": 21,
                "future_key": "keep-me",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    ### When
    actual = set_enable(path, True)
    on_disk = json.loads(path.read_text(encoding="utf-8"))

    ### Then
    assert actual["enable"] is True, "enable must become true"
    assert on_disk["enable"] is True, "disk enable must become true"
    assert on_disk["scan_validity_days"] == 21, "scan_validity_days must be preserved"
    assert on_disk["future_key"] == "keep-me", "unknown keys must be preserved"


def test_given_enable_true_when_tw_disable_then_flag_false_other_keys_unchanged(
    tmp_path: Path,
) -> None:
    """
    Scenario: /tw-disable sets only the enable flag to false.
    Slice: 27 — disable sets flag false

    Given config with enable=true and an extra key,
    When set_enable(..., False) runs,
    Then enable is false and other keys are unchanged.
    """
    from guard.config import set_enable

    ### Given
    path = tmp_path / "config.json"
    path.write_text(
        json.dumps(
            {
                "enable": True,
                "scan_validity_days": 7,
                "future_key": "keep-me",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    ### When
    actual = set_enable(path, False)
    on_disk = json.loads(path.read_text(encoding="utf-8"))

    ### Then
    assert actual["enable"] is False, "enable must become false"
    assert on_disk["enable"] is False, "disk enable must become false"
    assert on_disk["scan_validity_days"] == 7, "scan_validity_days must be preserved"
    assert on_disk["future_key"] == "keep-me", "unknown keys must be preserved"


@pytest.mark.parametrize("skill", ["verify", "scan"])
def test_given_enable_false_when_manual_verify_or_scan_then_still_produces_output(
    tmp_path: Path,
    skill: Literal["verify", "scan"],
) -> None:
    """
    Scenario: Manual /tw-verify and /tw-scan still produce output when disabled.
    Slice: 27 — verify/scan still work when disabled

    Given enable=false,
    When a manual verify or scan probe runs for a resolvable name,
    Then status/submit-shaped output is returned (not a no-op from enable=false).
    """
    from guard.config import set_enable
    from guard.control_skills import manual_skill_probe

    ### Given
    path = tmp_path / "config.json"
    set_enable(path, False)

    ### When
    actual = manual_skill_probe(skill, config_path=path, name="demo-skill")

    ### Then
    assert path.is_file(), "config must exist after disable"
    assert json.loads(path.read_text(encoding="utf-8"))["enable"] is False
    assert actual["ok"] is True, f"{skill} must not no-op when enforcement is off"
    assert actual["skill"] == skill
    assert actual["name"] == "demo-skill"
    assert actual["enable"] is False, "probe must reflect disabled enforcement"
    assert actual["output"]["kind"] == skill
    assert actual["output"]["name"] == "demo-skill"
    assert "note" in actual["output"]


def test_given_repo_when_skills_looked_up_then_claude_layout_skill_md_exist() -> None:
    """
    Scenario: /tw-enable and /tw-disable ship at the Claude skill layout path.
    Slice: 27 — skills installed at Claude layout

    Given the repo checkout,
    When an operator looks for /tw-enable and /tw-disable,
    Then both SKILL.md files exist and describe config-only toggles.
    """
    ### Given / When
    enable_text = TW_ENABLE_SKILL.read_text(encoding="utf-8")
    disable_text = TW_DISABLE_SKILL.read_text(encoding="utf-8")

    ### Then
    assert TW_ENABLE_SKILL.is_file(), f"missing {TW_ENABLE_SKILL}"
    assert TW_DISABLE_SKILL.is_file(), f"missing {TW_DISABLE_SKILL}"
    assert "set_enable" in enable_text or "enable" in enable_text.lower()
    assert "config" in enable_text.lower()
    assert "enforcement" not in enable_text.lower() or "do not call" in enable_text.lower()
    assert "scan_validity_days" in enable_text or "other keys" in enable_text.lower()
    assert "verify" in disable_text.lower() or "scan" in disable_text.lower()
    assert "unaffected" in disable_text.lower() or "remain" in disable_text.lower()


@pytest.mark.parametrize("enabled", [True, False])
def test_given_missing_config_when_toggle_then_file_created_with_flag(
    tmp_path: Path,
    enabled: bool,
) -> None:
    """
    Scenario: Toggle creates config when absent.
    Slice: 27 — missing config created on toggle

    Given no config file,
    When set_enable runs,
    Then the file is created with the requested enable value and default validity days.
    """
    from guard.config import set_enable

    ### Given
    path = tmp_path / "nested" / "config.json"
    assert not path.exists()

    ### When
    actual = set_enable(path, enabled)
    on_disk = json.loads(path.read_text(encoding="utf-8"))

    ### Then
    assert actual["enable"] is enabled
    assert on_disk["enable"] is enabled
    assert on_disk["scan_validity_days"] == 14
