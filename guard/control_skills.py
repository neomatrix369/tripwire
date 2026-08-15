"""Manual Tripwire control-skill helpers (slice 27+).

``/tw-enable`` / ``/tw-disable`` flip config only via ``set_enable``.
``/tw-verify`` lives in ``guard.verify.verify_artifacts`` (slice 28).
``manual_skill_probe`` remains for scan independence until slice 29.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

from guard.config import load_config, set_enable

ManualSkill = Literal["verify", "scan"]

DEFAULT_CONFIG_PATH = Path.home() / ".tripwire" / "config.json"


def config_path_from_env() -> Path:
    """Resolve config path: ``TRIPWIRE_CONFIG`` override or ``~/.tripwire/config.json``."""
    override = os.environ.get("TRIPWIRE_CONFIG")
    if override:
        return Path(override)
    return DEFAULT_CONFIG_PATH


def enable_enforcement(path: Path | str | None = None) -> dict[str, Any]:
    """``/tw-enable`` — set ``enable=true`` only."""
    return set_enable(path or config_path_from_env(), True)


def disable_enforcement(path: Path | str | None = None) -> dict[str, Any]:
    """``/tw-disable`` — set ``enable=false`` only."""
    return set_enable(path or config_path_from_env(), False)


def manual_skill_probe(
    skill: ManualSkill,
    *,
    config_path: Path | str,
    name: str,
) -> dict[str, Any]:
    """Prove verify/scan remain usable when ``enable`` is false.

    Does **not** early-return on ``enable=false``. Slices 28–29 replace this
    probe with real status/submit behaviour while keeping the same invariant.
    """
    cfg = load_config(config_path)
    return {
        "ok": True,
        "skill": skill,
        "name": name,
        "enable": cfg["enable"],
        "output": {
            "kind": skill,
            "name": name,
            "note": "manual skills ignore enable — enforcement bypass only",
        },
    }
