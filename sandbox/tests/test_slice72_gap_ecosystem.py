"""
Tests for Slice 72 gap-ecosystem scanner acceptance (Rust/Cargo).

Author: swami
Created: 2026-09-20
Scope: GWT-72.2 registry runner via production entry point; GWT-72.4 named
       tool identity observed on run_cargo_audit rows (not constant-only)
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import scanners

_CLEAN_JSON = json.dumps({"vulnerabilities": {"found": False, "count": 0, "list": []}})


def test_gwt_72_2_registered_cargo_audit_runner_completes_via_entry_point(
    tmp_path: Path,
) -> None:
    """
    Scenario: Gap fill extends SCANNER_GROUPS — the registered runner is the
    production entry point (no orphan stack).
    Slice: GWT-72.2 — Prefer extend existing adapter

    Given Cargo Audit is registered between DepShield and Ossprey,
    When the registered group runner executes against a Cargo.lock workdir,
    Then it returns Cargo Audit completed rows (entry point, not constant-only).
    """
    ### Given
    sources = [tuple(g["sources"]) for g in scanners.SCANNER_GROUPS]
    dep_i = next(i for i, s in enumerate(sources) if s == ("DepShield",))
    cargo_i = next(i for i, s in enumerate(sources) if s == ("Cargo Audit",))
    oss_i = next(i for i, s in enumerate(sources) if s == ("Ossprey",))
    assert dep_i < cargo_i < oss_i, (
        f"expected DepShield < Cargo Audit < Ossprey, got "
        f"dep={dep_i} cargo={cargo_i} oss={oss_i}"
    )
    cargo_group = scanners.SCANNER_GROUPS[cargo_i]
    assert cargo_group["applies_to"] == "both"
    assert callable(cargo_group["runner"])

    (tmp_path / "Cargo.lock").write_text("# lock\n", encoding="utf-8")
    (tmp_path / "Cargo.toml").write_text('[package]\nname = "gap"\n', encoding="utf-8")

    ### When
    with (
        patch.object(scanners, "_which", side_effect=lambda b: b == "cargo-audit"),
        patch.object(scanners, "_run", return_value=(0, _CLEAN_JSON, "")),
    ):
        findings, rows, quality = cargo_group["runner"](str(tmp_path), "package", None)

    ### Then
    assert findings == []
    assert quality is None or isinstance(quality, (dict, type(None)))
    assert len(rows) == 1
    assert rows[0]["scanner_source"] == "Cargo Audit"
    assert rows[0]["status"] == "completed"


def test_gwt_72_4_run_cargo_audit_names_tool_on_completed_row(tmp_path: Path) -> None:
    """
    Scenario: The gap scanner names itself Cargo Audit on completed scan rows.
    Slice: GWT-72.4 — Example: Rust/Cargo

    Given a Cargo.lock workdir and a successful cargo-audit JSON response,
    When run_cargo_audit executes,
    Then the status row scanner_source is exactly "Cargo Audit".
    """
    ### Given
    (tmp_path / "Cargo.lock").write_text("# lock\n", encoding="utf-8")
    (tmp_path / "Cargo.toml").write_text('[package]\nname = "named"\n', encoding="utf-8")

    ### When
    with (
        patch.object(scanners, "_which", side_effect=lambda b: b == "cargo-audit"),
        patch.object(scanners, "_run", return_value=(0, _CLEAN_JSON, "")),
    ):
        findings, rows = scanners.run_cargo_audit(str(tmp_path), "package")

    ### Then
    assert findings == []
    assert len(rows) == 1
    assert rows[0]["scanner_source"] == "Cargo Audit"
    assert rows[0]["status"] == "completed"
