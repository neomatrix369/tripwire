"""Slice 23 GWTs — config schema + PreToolUse handler approve/block contract.

CONTRACT_SHAPE: bounded-change
Outcome anchor: Operator (Claude Code) receives approve/block JSON;
config file carries Frontline schema defaults.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
HOOKS_DIR = REPO_ROOT / "guard" / "hooks"
PRE_TOOL_USE = HOOKS_DIR / "pre-tool-use.sh"

FIXTURE_STDIN = json.dumps(
    {
        "tool_name": "Skill",
        "tool_input": {"skill": "demo"},
        "session_id": "slice-23-fixture",
    }
).encode()


def _write_config(path: Path, **fields: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fields), encoding="utf-8")


def test_disabled_config_approves_without_guard_work(tmp_path: Path) -> None:
    """@contract-shape:bounded-change @walking_skeleton

    Given enable=false, when PreToolUse handler runs, then approve + exit 0 and guard is not called.
    """
    from guard import hooks_entry

    config_path = tmp_path / "config.json"
    _write_config(config_path, enable=False, scan_validity_days=14)
    calls: list[bytes] = []

    def _check_call(content_bytes: bytes) -> dict:
        calls.append(content_bytes)
        return {"allow": False, "reason": "should not run", "status": "red"}

    stdout, code = hooks_entry.handle_pre_tool_use(
        FIXTURE_STDIN,
        config_path=config_path,
        check_call=_check_call,
        target_content=b"artifact-bytes",
    )
    payload = json.loads(stdout)
    assert code == 0
    assert payload["decision"] == "approve"
    assert calls == []

    # Walking skeleton: installed shell template also short-circuits.
    assert PRE_TOOL_USE.is_file()
    env = os.environ.copy()
    env["TRIPWIRE_CONFIG"] = str(config_path)
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    proc = subprocess.run(
        ["bash", str(PRE_TOOL_USE)],
        input=FIXTURE_STDIN,
        capture_output=True,
        env=env,
        check=False,
    )
    assert proc.returncode == 0
    assert json.loads(proc.stdout.decode())["decision"] == "approve"


def test_enabled_red_blocks_with_reason(tmp_path: Path) -> None:
    """@contract-shape:bounded-change

    Given enable=true and RED guard result, when handler runs, then block with reason, exit 0.
    """
    from guard import hooks_entry

    config_path = tmp_path / "config.json"
    _write_config(config_path, enable=True, scan_validity_days=14)

    def _check_call(_content_bytes: bytes) -> dict:
        return {
            "allow": False,
            "reason": "rated red — at/above threshold",
            "status": "red",
        }

    stdout, code = hooks_entry.handle_pre_tool_use(
        FIXTURE_STDIN,
        config_path=config_path,
        check_call=_check_call,
        target_content=b"artifact-bytes",
    )
    payload = json.loads(stdout)
    assert code == 0
    assert payload["decision"] == "block"
    assert payload["reason"]


def test_enabled_below_threshold_approves(tmp_path: Path) -> None:
    """@contract-shape:bounded-change

    Given enable=true and green guard result, when handler runs, then approve, exit 0.
    """
    from guard import hooks_entry

    config_path = tmp_path / "config.json"
    _write_config(config_path, enable=True, scan_validity_days=14)

    def _check_call(_content_bytes: bytes) -> dict:
        return {
            "allow": True,
            "reason": "rated green — below threshold",
            "status": "green",
        }

    stdout, code = hooks_entry.handle_pre_tool_use(
        FIXTURE_STDIN,
        config_path=config_path,
        check_call=_check_call,
        target_content=b"artifact-bytes",
    )
    payload = json.loads(stdout)
    assert code == 0
    assert payload["decision"] == "approve"


def test_unexpected_error_fails_closed(tmp_path: Path) -> None:
    """@contract-shape:bounded-change

    Given enable=true and check_call raises, when handler runs, then fail-closed block, exit 0.
    """
    from guard import hooks_entry

    config_path = tmp_path / "config.json"
    _write_config(config_path, enable=True, scan_validity_days=14)

    def _check_call(_content_bytes: bytes) -> dict:
        raise RuntimeError("boom")

    stdout, code = hooks_entry.handle_pre_tool_use(
        FIXTURE_STDIN,
        config_path=config_path,
        check_call=_check_call,
        target_content=b"artifact-bytes",
    )
    payload = json.loads(stdout)
    assert code == 0
    assert payload["decision"] == "block"
    assert "fail closed" in payload["reason"].lower()


def test_first_write_applies_config_defaults(tmp_path: Path) -> None:
    """@contract-shape:bounded-change

    Given no config file, when ensure_default_config runs, then enable=true and scan_validity_days=14.
    """
    from guard import config as tripwire_config

    config_path = tmp_path / ".tripwire" / "config.json"
    assert not config_path.exists()
    written = tripwire_config.ensure_default_config(config_path)
    assert written == {"enable": True, "scan_validity_days": 14}
    on_disk = json.loads(config_path.read_text(encoding="utf-8"))
    assert on_disk["enable"] is True
    assert on_disk["scan_validity_days"] == 14


def test_existing_config_preserved_on_ensure(tmp_path: Path) -> None:
    """@contract-shape:bounded-change

    Given existing non-default config, when ensure_default_config runs, then values are unchanged.
    """
    from guard import config as tripwire_config

    config_path = tmp_path / "config.json"
    _write_config(config_path, enable=False, scan_validity_days=7)
    result = tripwire_config.ensure_default_config(config_path)
    assert result == {"enable": False, "scan_validity_days": 7}
    on_disk = json.loads(config_path.read_text(encoding="utf-8"))
    assert on_disk == {"enable": False, "scan_validity_days": 7}
