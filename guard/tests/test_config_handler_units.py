"""
Tests for guard.config and guard.hooks_entry edge paths (coverage).

Author: slice-23
Created: 2026-08-15
Scope: load_config invalid/missing; env config path; default check_call; main()
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import pytest


def test_given_missing_config_when_loaded_then_defaults(tmp_path: Path) -> None:
    """
    Scenario: Missing config file yields schema defaults.
    Slice: 23 — load_config
    """
    from guard.config import load_config

    ### Given / When
    actual = load_config(tmp_path / "absent.json")

    ### Then
    assert actual == {"enable": True, "scan_validity_days": 14}


def test_given_invalid_json_when_loaded_then_defaults(tmp_path: Path) -> None:
    """Scenario: Corrupt config JSON yields schema defaults."""
    from guard.config import load_config

    ### Given
    path = tmp_path / "bad.json"
    path.write_text("{not-json", encoding="utf-8")

    ### When
    actual = load_config(path)

    ### Then
    assert actual == {"enable": True, "scan_validity_days": 14}


def test_given_non_object_json_when_loaded_then_defaults(tmp_path: Path) -> None:
    """Scenario: Non-object JSON config yields schema defaults."""
    from guard.config import load_config

    ### Given
    path = tmp_path / "arr.json"
    path.write_text("[1,2]", encoding="utf-8")

    ### When
    actual = load_config(path)

    ### Then
    assert actual == {"enable": True, "scan_validity_days": 14}


def test_given_tripwire_config_env_when_handler_runs_then_uses_override(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: TRIPWIRE_CONFIG selects the config path when none is passed."""
    from guard.hooks_entry import handle_pre_tool_use

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": False, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))

    ### When
    stdout, code = handle_pre_tool_use(b"{}", check_call=lambda _: {"allow": False})

    ### Then
    assert code == 0
    assert json.loads(stdout)["decision"] == "approve"


def test_given_no_injected_check_call_when_handler_runs_then_uses_default(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: Default check_call path is used when no inject is provided."""
    import sys
    from types import ModuleType

    from guard import hooks_entry

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")

    def _stub(content_bytes: bytes) -> dict:
        assert content_bytes == b"payload"
        return {"allow": False, "reason": "stubbed red", "status": "red"}

    fake_hook = ModuleType("guard.guard_hook")
    fake_hook.check_call = _stub  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "guard.guard_hook", fake_hook)

    ### When
    stdout, code = hooks_entry.handle_pre_tool_use(
        b"{}",
        config_path=path,
        target_content=b"payload",
    )

    ### Then
    assert code == 0
    payload = json.loads(stdout)
    assert payload["decision"] == "block"
    assert payload["reason"] == "stubbed red"


def test_given_empty_reason_when_blocked_then_default_reason(tmp_path: Path) -> None:
    """Scenario: Missing guard reason string still produces a block reason."""
    from guard.hooks_entry import handle_pre_tool_use

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")

    ### When
    stdout, code = handle_pre_tool_use(
        b"{}",
        config_path=path,
        check_call=lambda _: {"allow": False, "reason": "", "status": "red"},
    )

    ### Then
    assert code == 0
    assert json.loads(stdout)["reason"] == "blocked by Tripwire Guard"


def test_given_stdin_when_main_runs_then_prints_decision(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Scenario: main() reads stdin and prints approve/block JSON."""
    from guard import hooks_entry

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": False, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))
    monkeypatch.setattr(sys, "stdin", io.TextIOWrapper(io.BytesIO(b"{}")))

    ### When
    with pytest.raises(SystemExit) as exc:
        hooks_entry.main()

    ### Then
    assert exc.value.code == 0
    assert json.loads(capsys.readouterr().out.strip())["decision"] == "approve"


def test_given_home_config_when_no_env_override_then_uses_home(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: Without TRIPWIRE_CONFIG, config is read from ~/.tripwire/config.json."""
    from guard.hooks_entry import handle_pre_tool_use

    ### Given
    monkeypatch.delenv("TRIPWIRE_CONFIG", raising=False)
    monkeypatch.setenv("HOME", str(tmp_path))
    cfg = tmp_path / ".tripwire" / "config.json"
    cfg.parent.mkdir(parents=True)
    cfg.write_text(json.dumps({"enable": False, "scan_validity_days": 14}), encoding="utf-8")

    ### When
    stdout, code = handle_pre_tool_use(b"{}")

    ### Then
    assert code == 0
    assert json.loads(stdout)["decision"] == "approve"


@pytest.mark.parametrize(
    ("fixture", "reason_snippet"),
    [
        ("unscanned", "never scanned"),
        ("red", "rated red"),
    ],
)
def test_given_check_call_fixture_env_when_handler_runs_then_blocks(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    fixture: str,
    reason_snippet: str,
) -> None:
    """
    Scenario: TRIPWIRE_CHECK_CALL_FIXTURE supplies unscanned/RED without Supabase.
    Slice: 25 — smoke seam (in-process coverage)
    """
    from guard.hooks_entry import handle_pre_tool_use

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CHECK_CALL_FIXTURE", fixture)

    ### When
    stdout, code = handle_pre_tool_use(b"{}", config_path=path)

    ### Then
    assert code == 0
    payload = json.loads(stdout)
    assert payload["decision"] == "block"
    assert reason_snippet in payload["reason"].lower()


def test_given_unknown_check_call_fixture_when_handler_runs_then_uses_default(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Scenario: Unknown fixture key falls through to default check_call."""
    import sys
    from types import ModuleType

    from guard import hooks_entry

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": True, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CHECK_CALL_FIXTURE", "not-a-real-fixture")

    fake_hook = ModuleType("guard.guard_hook")
    fake_hook.check_call = lambda _: {  # type: ignore[attr-defined]
        "allow": True,
        "reason": "default path",
        "status": "green",
    }
    monkeypatch.setitem(sys.modules, "guard.guard_hook", fake_hook)

    ### When
    stdout, code = hooks_entry.handle_pre_tool_use(b"{}", config_path=path)

    ### Then
    assert code == 0
    assert json.loads(stdout)["decision"] == "approve"


def test_given_main_stdout_already_newline_when_runs_then_no_double_newline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Scenario: main() does not append a second newline when stdout already ends with one."""
    from guard import hooks_entry

    ### Given
    path = tmp_path / "cfg.json"
    path.write_text(json.dumps({"enable": False, "scan_validity_days": 14}), encoding="utf-8")
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(path))
    monkeypatch.setattr(sys, "stdin", io.TextIOWrapper(io.BytesIO(b"{}")))
    monkeypatch.setattr(
        hooks_entry,
        "handle_pre_tool_use",
        lambda *_a, **_k: ('{"decision":"approve"}\n', 0),
    )

    ### When
    with pytest.raises(SystemExit) as exc:
        hooks_entry.main()

    ### Then
    assert exc.value.code == 0
    assert capsys.readouterr().out == '{"decision":"approve"}\n'
