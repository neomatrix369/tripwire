"""Tests for the Cargo Audit (RustSec) adapter."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import scanners

SAMPLE_VULN_JSON = json.dumps(
    {
        "vulnerabilities": {
            "found": True,
            "count": 1,
            "list": [
                {
                    "advisory": {
                        "id": "RUSTSEC-2022-0051",
                        "package": "lz4-sys",
                        "title": "Memory corruption in liblz4",
                        "url": "https://rustsec.org/advisories/RUSTSEC-2022-0051",
                        "severity": "high",
                    },
                    "package": {"name": "lz4-sys", "version": "1.9.3"},
                }
            ],
        }
    }
)


def test_given_no_cargo_when_run_cargo_audit_then_not_applicable(tmp_path: Path) -> None:
    findings, rows = scanners.run_cargo_audit(str(tmp_path), "package")
    assert findings == []
    assert len(rows) == 1
    assert rows[0]["status"] == "not_applicable"
    assert "Cargo" in rows[0]["detail"]


def test_given_cargo_lock_and_vuln_json_when_run_then_completed_with_finding(
    tmp_path: Path,
) -> None:
    (tmp_path / "Cargo.lock").write_text("# lock\n", encoding="utf-8")
    (tmp_path / "Cargo.toml").write_text('[package]\nname = "x"\n', encoding="utf-8")

    def _fake_run(cmd, timeout=None, cwd=None):
        assert "--json" in cmd
        return 1, SAMPLE_VULN_JSON, ""

    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", side_effect=_fake_run),
    ):
        findings, rows = scanners.run_cargo_audit(str(tmp_path), "package")

    assert len(findings) == 1
    assert findings[0]["rule_id"] == "RUSTSEC-2022-0051"
    assert findings[0]["severity"] == "red"
    assert rows[0]["status"] == "completed"
    assert rows[0]["scanner_source"] == "Cargo Audit"


def test_given_clean_json_when_run_then_completed_zero_findings(tmp_path: Path) -> None:
    (tmp_path / "Cargo.lock").write_text("# lock\n", encoding="utf-8")
    clean = json.dumps({"vulnerabilities": {"found": False, "count": 0, "list": []}})

    with (
        patch.object(scanners, "_which", side_effect=lambda b: b == "cargo-audit"),
        patch.object(scanners, "_run", return_value=(0, clean, "")),
    ):
        findings, rows = scanners.run_cargo_audit(str(tmp_path), "package")

    assert findings == []
    assert rows[0]["status"] == "completed"


def test_given_missing_binary_when_run_then_unreachable(tmp_path: Path) -> None:
    (tmp_path / "Cargo.toml").write_text('[package]\nname = "x"\n', encoding="utf-8")

    with patch.object(scanners, "_which", return_value=False):
        findings, rows = scanners.run_cargo_audit(str(tmp_path), "package")

    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_registry_when_list_groups_then_cargo_audit_between_depshield_ossprey() -> None:
    sources = [tuple(g["sources"]) for g in scanners.SCANNER_GROUPS]
    assert ("Cargo Audit",) in sources
    dep_i = next(i for i, s in enumerate(sources) if s == ("DepShield",))
    cargo_i = next(i for i, s in enumerate(sources) if s == ("Cargo Audit",))
    oss_i = next(i for i, s in enumerate(sources) if s == ("Ossprey",))
    assert dep_i < cargo_i < oss_i


def test_given_tail_timeouts_when_summed_then_within_scan_timeout() -> None:
    tail = scanners.DEPSHIELD_TIMEOUT + scanners.CARGO_AUDIT_TIMEOUT + scanners.OSSPREY_TIMEOUT
    assert tail <= scanners.SCAN_TIMEOUT
