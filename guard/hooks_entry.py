"""Claude Code PreToolUse handler — stdin JSON in, approve/block stdout JSON out.

Contract (always exit 0; decision is in stdout JSON):
- ``{"decision": "approve"}`` when enforcement is disabled or guard allows.
- ``{"decision": "block", "reason": "..."}`` when guard denies or an unexpected
  error occurs (**fail-closed**).

Does not perform synchronous scans. Wraps ``guard.guard_hook.check_call`` by
default; tests inject a fake ``check_call``. CI smoke may set
``TRIPWIRE_CHECK_CALL_FIXTURE`` to ``unscanned`` or ``red`` (unset in production).
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from guard.config import load_config

CheckCall = Callable[[bytes], dict[str, Any]]

_FAIL_CLOSED_REASON = "guard error — fail closed"


def _config_path_from_env() -> Path:
    override = os.environ.get("TRIPWIRE_CONFIG")
    if override:
        return Path(override)
    return Path.home() / ".tripwire" / "config.json"


_SMOKE_FIXTURES: dict[str, dict[str, Any]] = {
    "unscanned": {
        "allow": False,
        "reason": "never scanned — guard fails closed",
        "status": "grey",
    },
    "red": {
        "allow": False,
        "reason": "rated red — at/above threshold",
        "status": "red",
    },
}


def _default_check_call(content_bytes: bytes) -> dict[str, Any]:
    # Lazy import: guard_hook pulls supabase; keep hooks_entry importable without it.
    from guard.guard_hook import check_call

    return check_call(content_bytes)


def _smoke_check_call_from_env() -> CheckCall | None:
    """Optional CI/smoke seam — unset in production. Values: unscanned | red."""
    key = (os.environ.get("TRIPWIRE_CHECK_CALL_FIXTURE") or "").strip().lower()
    if not key:
        return None
    fixture = _SMOKE_FIXTURES.get(key)
    if fixture is None:
        return None

    def _fixed(_content_bytes: bytes) -> dict[str, Any]:
        return dict(fixture)

    return _fixed


def _decision_approve() -> str:
    return json.dumps({"decision": "approve"}, separators=(",", ":"))


def _decision_block(reason: str) -> str:
    return json.dumps({"decision": "block", "reason": reason}, separators=(",", ":"))


def handle_pre_tool_use(
    stdin_bytes: bytes,
    *,
    config_path: Path | str | None = None,
    check_call: CheckCall | None = None,
    target_content: bytes | None = None,
) -> tuple[str, int]:
    """Run PreToolUse decision. Returns (stdout_json, exit_code). Exit is always 0."""
    del stdin_bytes  # reserved for path extraction in later slices
    path = Path(config_path) if config_path is not None else _config_path_from_env()
    config = load_config(path)
    if not config.get("enable", True):
        return _decision_approve(), 0

    if check_call is not None:
        guard_fn = check_call
    else:
        guard_fn = _smoke_check_call_from_env() or _default_check_call
    content = b"" if target_content is None else target_content
    try:
        result = guard_fn(content)
    except Exception:
        return _decision_block(_FAIL_CLOSED_REASON), 0

    if result.get("allow"):
        return _decision_approve(), 0

    reason = str(result.get("reason") or "blocked by Tripwire Guard")
    return _decision_block(reason), 0


def main() -> None:
    """CLI entry for installed ``_guard_entry.py`` (reads stdin, prints decision)."""
    stdout, code = handle_pre_tool_use(sys.stdin.buffer.read())
    sys.stdout.write(stdout)
    if not stdout.endswith("\n"):
        sys.stdout.write("\n")
    raise SystemExit(code)
