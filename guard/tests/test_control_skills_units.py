"""
Unit coverage for guard.control_skills and set_enable edge paths (slice 27).

Author: slice-27
Created: 2026-08-15
Scope: env config path; enable/disable wrappers; corrupt/non-object raw config
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest


def test_given_tripwire_config_env_when_path_resolved_then_override_used(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: TRIPWIRE_CONFIG selects the config path for control skills."""
    from guard.control_skills import config_path_from_env

    ### Given
    path = tmp_path / "cfg.json"
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))

    ### When
    actual = config_path_from_env()

    ### Then
    assert actual == path


def test_given_no_env_when_path_resolved_then_default_home_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Scenario: Without TRIPWIRE_CONFIG, use ~/.tripwire/config.json."""
    from guard.control_skills import DEFAULT_CONFIG_PATH, config_path_from_env

    ### Given
    monkeypatch.delenv("TRIPWIRE_CONFIG", raising=False)

    ### When
    actual = config_path_from_env()

    ### Then
    assert actual == DEFAULT_CONFIG_PATH


def test_given_fixture_path_when_enable_enforcement_then_enable_true(
    tmp_path: Path,
) -> None:
    """Scenario: enable_enforcement wrapper sets enable true."""
    from guard.control_skills import enable_enforcement

    ### Given
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"enable": False, "scan_validity_days": 14}), encoding="utf-8")

    ### When
    actual = enable_enforcement(path)

    ### Then
    assert actual["enable"] is True


def test_given_fixture_path_when_disable_enforcement_then_enable_false(
    tmp_path: Path,
) -> None:
    """Scenario: disable_enforcement wrapper sets enable false."""
    from guard.control_skills import disable_enforcement

    ### Given
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")

    ### When
    actual = disable_enforcement(path)

    ### Then
    assert actual["enable"] is False


def test_given_env_path_when_enable_without_arg_then_writes_override(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: enable_enforcement() with no path uses TRIPWIRE_CONFIG."""
    from guard.control_skills import enable_enforcement

    ### Given
    path = tmp_path / "config.json"
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))

    ### When
    actual = enable_enforcement()

    ### Then
    assert actual["enable"] is True
    assert json.loads(path.read_text(encoding="utf-8"))["enable"] is True


def test_given_env_path_when_disable_without_arg_then_writes_override(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: disable_enforcement() with no path uses TRIPWIRE_CONFIG."""
    from guard.control_skills import disable_enforcement

    ### Given
    path = tmp_path / "config.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))

    ### When
    actual = disable_enforcement()

    ### Then
    assert actual["enable"] is False


def test_given_corrupt_json_when_set_enable_then_defaults_then_flag(
    tmp_path: Path,
) -> None:
    """Scenario: Corrupt JSON is replaced with defaults plus requested enable."""
    from guard.config import set_enable

    ### Given
    path = tmp_path / "bad.json"
    path.write_text("{not-json", encoding="utf-8")

    ### When
    actual = set_enable(path, False)

    ### Then
    assert actual["enable"] is False
    assert actual["scan_validity_days"] == 14


def test_given_non_object_json_when_set_enable_then_defaults_then_flag(
    tmp_path: Path,
) -> None:
    """Scenario: Non-object JSON is replaced with defaults plus requested enable."""
    from guard.config import set_enable

    ### Given
    path = tmp_path / "arr.json"
    path.write_text("[1, 2]", encoding="utf-8")

    ### When
    actual = set_enable(path, True)

    ### Then
    assert actual["enable"] is True
    assert actual["scan_validity_days"] == 14


def test_given_enable_only_object_when_set_enable_then_validity_seeded(
    tmp_path: Path,
) -> None:
    """Scenario: Object missing scan_validity_days gets the default seeded."""
    from guard.config import set_enable

    ### Given
    path = tmp_path / "partial.json"
    path.write_text(json.dumps({"enable": False, "extra": 1}), encoding="utf-8")

    ### When
    actual = set_enable(path, True)
    on_disk = json.loads(path.read_text(encoding="utf-8"))

    ### Then
    assert actual["enable"] is True
    assert on_disk["scan_validity_days"] == 14
    assert on_disk["extra"] == 1


def test_given_missing_file_when_ensure_default_config_then_writes_defaults(
    tmp_path: Path,
) -> None:
    """Scenario: ensure_default_config creates schema defaults when absent."""
    from guard.config import ensure_default_config

    ### Given
    path = tmp_path / "config.json"

    ### When
    actual = ensure_default_config(path)

    ### Then
    assert path.is_file()
    assert actual == {"enable": True, "scan_validity_days": 14}


def test_given_existing_file_when_ensure_default_config_then_preserves(
    tmp_path: Path,
) -> None:
    """Scenario: ensure_default_config does not overwrite an existing file."""
    from guard.config import ensure_default_config

    ### Given
    path = tmp_path / "config.json"
    path.write_text(
        json.dumps({"enable": False, "scan_validity_days": 3}),
        encoding="utf-8",
    )

    ### When
    actual = ensure_default_config(path)

    ### Then
    assert actual["enable"] is False
    assert actual["scan_validity_days"] == 3
