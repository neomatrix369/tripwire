"""Frontline agent-hooks local config (`~/.tripwire/config.json`).

Schema (operator-facing keys):
- ``enable`` (bool): when false, PreToolUse handlers approve without calling guard.
  Default on first write: ``true``.
- ``scan_validity_days`` (int): N-day freshness window for `/tw-verify` (later slices).
  Default on first write: ``14``.

First-write owner: ``ensure_default_config``. Slice 24 wires this into
``tripwire setup-agent-hooks``. Missing or unreadable config is treated as
enabled by handlers (fail-open toward enforcement, fail-closed on guard errors).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_ENABLE = True
DEFAULT_SCAN_VALIDITY_DAYS = 14

DEFAULT_CONFIG: dict[str, Any] = {
    "enable": DEFAULT_ENABLE,
    "scan_validity_days": DEFAULT_SCAN_VALIDITY_DAYS,
}


def load_config(path: Path | str) -> dict[str, Any]:
    """Load config JSON; missing/invalid file → defaults (enable true)."""
    config_path = Path(path)
    if not config_path.is_file():
        return dict(DEFAULT_CONFIG)
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return dict(DEFAULT_CONFIG)
    if not isinstance(data, dict):
        return dict(DEFAULT_CONFIG)
    return {
        "enable": bool(data.get("enable", DEFAULT_ENABLE)),
        "scan_validity_days": int(data.get("scan_validity_days", DEFAULT_SCAN_VALIDITY_DAYS)),
    }


def ensure_default_config(path: Path | str) -> dict[str, Any]:
    """Write default schema if absent; preserve existing file contents otherwise."""
    config_path = Path(path)
    if config_path.is_file():
        return load_config(config_path)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    payload = dict(DEFAULT_CONFIG)
    config_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload
