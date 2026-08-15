"""
Tests for live enforce smoke after tripwire setup-agent-hooks (slice 25).

Author: swami
Created: 2026-08-15
Scope: installed PreToolUse enable→block (unscanned|RED), disable→approve;
       docs install-event gap claim (separate assertion in same module)
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
TRIPWIRE_BIN = REPO_ROOT / "cli" / "bin" / "tripwire.js"
SETUP_COMMANDS = REPO_ROOT / "docs" / "user-guide" / "setup-commands.md"

FIXTURE_STDIN = json.dumps(
    {
        "tool_name": "Skill",
        "tool_input": {"skill": "demo-unscanned"},
        "session_id": "slice-25-smoke",
    }
).encode()

BLOCK_FIXTURE_TO_REASON_SNIPPET = (
    ("unscanned", "never scanned"),
    ("red", "rated red"),
)


def _write_config(path: Path, *, enable: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"enable": enable, "scan_validity_days": 14}),
        encoding="utf-8",
    )


def _run_setup(home: Path) -> Path:
    """Install hooks into fixture HOME; return path to pre-tool-use.sh."""
    assert TRIPWIRE_BIN.is_file(), f"missing tripwire CLI: {TRIPWIRE_BIN}"
    settings = home / ".claude" / "settings.json"
    settings.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [
            "node",
            str(TRIPWIRE_BIN),
            "setup-agent-hooks",
            "--home",
            str(home),
            "--claude-settings",
            str(settings),
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "HOME": str(home)},
    )
    assert proc.returncode == 0, f"setup-agent-hooks failed: {proc.stderr or proc.stdout}"
    payload = json.loads(proc.stdout.strip().splitlines()[-1])
    pre_tool_use = Path(payload["preToolUseSh"])
    assert pre_tool_use.is_file(), f"installed hook missing: {pre_tool_use}"
    return pre_tool_use


def _invoke_installed_hook(
    *,
    home: Path,
    pre_tool_use: Path,
    fixture: str | None,
) -> subprocess.CompletedProcess[bytes]:
    env = os.environ.copy()
    env["HOME"] = str(home)
    env["TRIPWIRE_CONFIG"] = str(home / ".tripwire" / "config.json")
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    if fixture:
        env["TRIPWIRE_CHECK_CALL_FIXTURE"] = fixture
    else:
        env.pop("TRIPWIRE_CHECK_CALL_FIXTURE", None)
    return subprocess.run(
        ["bash", str(pre_tool_use)],
        input=FIXTURE_STDIN,
        capture_output=True,
        env=env,
        check=False,
        cwd=str(REPO_ROOT),
    )


@pytest.mark.parametrize(
    ("fixture", "reason_snippet"),
    BLOCK_FIXTURE_TO_REASON_SNIPPET,
    ids=["unscanned", "red"],
)
def test_given_setup_and_enabled_when_pre_tool_use_targets_bad_artifact_then_block(
    tmp_path: Path,
    fixture: str,
    reason_snippet: str,
) -> None:
    """
    Scenario: Installed hooks block unscanned or RED when enable=true.
    Slice: 25 — enabled blocks unscanned / RED

    Given setup-agent-hooks installed and enable=true with a smoke guard fixture,
    When the installed PreToolUse handler runs,
    Then stdout decision is block with a matching reason and exit 0.
    """
    ### Given
    home = tmp_path / "home"
    home.mkdir()
    pre_tool_use = _run_setup(home)
    _write_config(home / ".tripwire" / "config.json", enable=True)

    ### When
    proc = _invoke_installed_hook(home=home, pre_tool_use=pre_tool_use, fixture=fixture)

    ### Then
    assert proc.returncode == 0, f"hook exit: {proc.stderr.decode()}"
    payload = json.loads(proc.stdout.decode())
    assert payload["decision"] == "block", f"expected block, got {payload}"
    assert reason_snippet in payload.get("reason", "").lower(), payload


def test_given_setup_and_disabled_when_same_pre_tool_use_then_approve(
    tmp_path: Path,
) -> None:
    """
    Scenario: Installed hooks approve when enable=false (bypass).
    Slice: 25 — disabled approves same call

    Given the same install with enable=false,
    When the installed PreToolUse handler runs with the same stdin,
    Then stdout decision is approve and exit 0.
    """
    ### Given
    home = tmp_path / "home"
    home.mkdir()
    pre_tool_use = _run_setup(home)
    _write_config(home / ".tripwire" / "config.json", enable=False)

    ### When
    proc = _invoke_installed_hook(home=home, pre_tool_use=pre_tool_use, fixture="red")

    ### Then
    assert proc.returncode == 0, f"hook exit: {proc.stderr.decode()}"
    payload = json.loads(proc.stdout.decode())
    assert payload["decision"] == "approve", f"expected approve, got {payload}"


def test_given_operator_docs_when_searched_then_install_event_gap_documented() -> None:
    """
    Scenario: Docs state no native install-event hook; setup-agent-hooks is workaround.
    Slice: 25 — install-event gap documented

    Given operator-facing setup-commands.md,
    When searching for install-event / setup workaround language,
    Then the file states there is no native install-event hook and names
    tripwire setup-agent-hooks.
    """
    ### Given
    assert SETUP_COMMANDS.is_file()
    text = SETUP_COMMANDS.read_text(encoding="utf-8").lower()

    ### When / Then
    assert "no native install-event" in text or "no native install event" in text, (
        "docs must state Claude Code has no native install-event hook"
    )
    assert "setup-agent-hooks" in text, "docs must name tripwire setup-agent-hooks"
    # Ensure node is available for setup smokes in this environment.
    assert shutil.which("node"), "node required for setup-agent-hooks smoke"
