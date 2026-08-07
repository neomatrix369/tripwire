"""
Tests for Cisco mcp-scanner CLI argv construction and mode selection.

Author: swami
Created: 2026-08-01
Scope: build_mcp_live_cmd / build_mcp_behavioral_cmd / _mcp_mode_args;
       run_cisco_mcp_scanner mode dispatch (no bare-path positional)
"""

from __future__ import annotations

import os
from unittest.mock import patch

import scanners


def test_given_analyzers_and_remote_mode_when_building_live_cmd_then_flags_precede_mode() -> None:
    """
    Scenario: Global flags come before the remote subcommand (mcp-scanner argparse).
    Slice: build_mcp_live_cmd

    Given analyzers and remote mode args,
    When build_mcp_live_cmd assembles the argv,
    Then --format/--analyzers precede `remote --server-url` and no bare path is inserted.
    """
    ### Given
    analyzers = ["yara", "llm"]
    mode_args = ["remote", "--server-url", "https://mcp.example.com/mcp"]

    ### When
    cmd = scanners.build_mcp_live_cmd(analyzers, mode_args)

    ### Then
    assert cmd[0] == "mcp-scanner"
    assert cmd.index("--format") < cmd.index("remote")
    assert cmd.index("--analyzers") < cmd.index("remote")
    assert cmd[cmd.index("--analyzers") + 1] == "yara,llm"
    assert "https://mcp.example.com/mcp" not in cmd[: cmd.index("remote")]
    assert cmd[cmd.index("remote") :] == mode_args


def test_given_workdir_when_building_behavioral_cmd_then_uses_behavioral_subcommand() -> None:
    """
    Scenario: Source-tier scanning uses the behavioral subcommand, not --analyzers.
    Slice: build_mcp_behavioral_cmd

    Given a workdir path,
    When build_mcp_behavioral_cmd assembles the argv,
    Then the command is mcp-scanner … behavioral <workdir>.
    """
    ### Given / When
    cmd = scanners.build_mcp_behavioral_cmd("/tmp/scan-target")

    ### Then
    assert cmd[0] == "mcp-scanner"
    assert "behavioral" in cmd
    assert cmd[-1] == "/tmp/scan-target"
    assert "--analyzers" not in cmd


def test_given_http_target_without_source_when_selecting_mode_then_remote() -> None:
    """
    Scenario: Introspection-only HTTP targets use remote --server-url.
    Slice: _mcp_mode_args

    Given an HTTPS MCP URL and an empty workdir,
    When _mcp_mode_args selects the mode,
    Then the mode is remote with --server-url set to the target.
    """
    ### Given
    workdir = "/tmp/empty-mcp-workdir-does-not-exist-xyz"

    ### When
    mode = scanners._mcp_mode_args(workdir, "https://mcp.example.com/mcp")

    ### Then
    assert mode == ["remote", "--server-url", "https://mcp.example.com/mcp"]


def test_given_local_run_sh_when_selecting_mode_then_stdio(tmp_path) -> None:
    """
    Scenario: Local fixture trees with run.sh launch via stdio.
    Slice: _mcp_mode_args

    Given a workdir containing run.sh,
    When _mcp_mode_args selects the mode,
    Then the mode is stdio with bash + run.sh.
    """
    ### Given
    run_sh = tmp_path / "run.sh"
    run_sh.write_text("#!/bin/bash\n")

    ### When
    mode = scanners._mcp_mode_args(str(tmp_path), str(tmp_path))

    ### Then
    assert mode == ["stdio", "--stdio-command", "bash", "--stdio-arg", str(run_sh)]


def test_given_https_git_url_with_source_when_selecting_mode_then_stdio_not_remote(
    tmp_path,
) -> None:
    """
    Scenario: Cloned HTTPS repos must not be passed as --server-url.
    Slice: _mcp_mode_args

    Given a workdir with server.py and an https://github.com target,
    When _mcp_mode_args selects the mode,
    Then stdio is chosen (source on disk wins over URL shape).
    """
    ### Given
    server = tmp_path / "server.py"
    server.write_text("print('hi')\n")

    ### When
    mode = scanners._mcp_mode_args(str(tmp_path), "https://github.com/example/mcp-server.git")

    ### Then
    assert mode[0] == "stdio"
    assert mode == ["stdio", "--stdio-command", "python", "--stdio-arg", str(server)]


def test_given_local_mcp_when_run_cisco_then_invokes_stdio_not_bare_path(tmp_path) -> None:
    """
    Scenario: The broken bare-path argv is never used for local MCP fixtures.
    Slice: run_cisco_mcp_scanner — live CLI dispatch

    Given a workdir with run.sh and mcp-scanner on PATH,
    When run_cisco_mcp_scanner runs,
    Then _run is called with stdio mode args and never with a bare path between flags.
    """
    ### Given
    run_sh = tmp_path / "run.sh"
    run_sh.write_text("#!/bin/bash\n")
    envelope = {
        "server_url": "stdio:bash",
        "scan_results": [],
        "requested_analyzers": ["yara"],
    }
    calls: list[list[str]] = []

    def fake_run(cmd, timeout=None):
        calls.append(list(cmd))
        return 0, __import__("json").dumps(envelope), ""

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", side_effect=fake_run),
        patch.dict(os.environ, {}, clear=False),
    ):
        # Ensure optional keys do not expand the live analyzer set unexpectedly
        os.environ.pop("MCP_SCANNER_LLM_API_KEY", None)
        os.environ.pop("MCP_SCANNER_API_KEY", None)
        os.environ.pop("MCP_SCANNER_ENDPOINT", None)
        findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), str(tmp_path))

    ### Then
    assert calls, "expected at least one mcp-scanner invocation"
    live_cmd = calls[0]
    assert live_cmd[0] == "mcp-scanner"
    assert "stdio" in live_cmd
    fmt_i = live_cmd.index("--format")
    stdio_i = live_cmd.index("stdio")
    assert fmt_i < stdio_i
    # Regression: bare path must not sit between --format and --analyzers
    between = live_cmd[fmt_i + 2 : live_cmd.index("--analyzers")]
    assert str(tmp_path) not in between
    assert any(r["scanner_source"] == "Cisco MCP Scanner: YARA" for r in rows)
    beh = next(
        r for r in rows if r["scanner_source"] == "Cisco MCP Scanner: Behavioral Code Scanning"
    )
    assert beh["status"] == "skipped_missing_credential"
    assert findings == []


def test_given_usage_stderr_when_live_fails_then_behavioral_not_marked_unreachable(
    tmp_path,
) -> None:
    """
    Scenario: Live-mode argparse failure must not poison the behavioral engine row.
    Slice: run_cisco_mcp_scanner — per-engine status isolation

    Given mcp-scanner live mode exits nonzero with usage text,
    When run_cisco_mcp_scanner aggregates rows,
    Then YARA is unreachable and behavioral is skipped_missing_credential (no LLM key),
    not unreachable from the live usage stderr.
    """
    ### Given
    (tmp_path / "server.py").write_text("print('x')\n")
    usage = "usage: mcp-scanner [-h] [--api-key API_KEY] [--analyzersANALYZERS] ..."

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(2, "", usage)),
        patch.dict(os.environ, {}, clear=False),
    ):
        os.environ.pop("MCP_SCANNER_LLM_API_KEY", None)
        _findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), str(tmp_path))

    ### Then
    by_src = {r["scanner_source"]: r for r in rows}
    assert by_src["Cisco MCP Scanner: YARA"]["status"] == "unreachable"
    assert "usage: mcp-scanner" in by_src["Cisco MCP Scanner: YARA"]["detail"]
    assert (
        by_src["Cisco MCP Scanner: Behavioral Code Scanning"]["status"]
        == "skipped_missing_credential"
    )


def test_given_empty_success_envelope_when_live_scan_runs_then_yara_is_not_reported_clean(
    tmp_path,
) -> None:
    """
    Scenario: An empty MCP success response has no scanner evidence.
    Slice: scanner evidence integrity

    Given mcp-scanner exits zero with an empty JSON envelope,
    When the live MCP scan is mapped,
    Then YARA is unreachable and its detail explains that scan results were absent.
    """
    ### Given
    (tmp_path / "run.sh").write_text("#!/bin/bash\n")

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, "{}", "")),
        patch.dict(os.environ, {"MCP_SCANNER_LLM_API_KEY": ""}, clear=False),
    ):
        _findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), str(tmp_path))

    ### Then
    yara = next(row for row in rows if row["scanner_source"] == "Cisco MCP Scanner: YARA")
    assert yara["status"] == "unreachable"
    assert "no parseable scan_results" in yara["detail"]
