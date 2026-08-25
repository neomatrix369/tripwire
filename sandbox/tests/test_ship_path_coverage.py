"""
Ship-path coverage uplift for sandbox scanners + scan_item_inner (slice 11).

Author: swami
Created: 2026-08-02
Scope: Snyk/Tessl/MCP parse paths, _run seams, skill deepeners, scan_item_inner
"""

from __future__ import annotations

import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest
import scan_app
import scanners

# ---------------------------------------------------------------------------
# _run / _which / _safe_json edge
# ---------------------------------------------------------------------------


def test_given_binary_on_path_when_which_then_true() -> None:
    """
    Scenario: _which reports installed binaries.
    Slice: slice-11 — _which

    Given shutil.which finds a binary,
    When _which is called,
    Then it returns True.
    """
    ### Given / When / Then
    with patch("scanners.shutil.which", return_value="/usr/bin/true"):
        assert scanners._which("true") is True


def test_given_subprocess_ok_when_run_then_returncode_and_streams() -> None:
    """
    Scenario: Successful subprocess returns code and captured streams.
    Slice: slice-11 — _run happy

    Given subprocess.run returns exit 0 with stdout/stderr,
    When _run is called,
    Then the triple is returned unchanged.
    """
    ### Given
    proc = MagicMock(returncode=0, stdout="out", stderr="err")

    ### When
    with patch("scanners.subprocess.run", return_value=proc):
        code, out, err = scanners._run(["echo"])

    ### Then
    assert (code, out, err) == (0, "out", "err")


def test_given_timeout_when_run_then_none_code() -> None:
    """
    Scenario: Timeouts become unreachable-friendly triples.
    Slice: slice-11 — _run timeout

    Given subprocess.TimeoutExpired,
    When _run is called,
    Then code is None and stderr mentions timeout.
    """
    ### Given
    exc = subprocess.TimeoutExpired(cmd=["slow"], timeout=1, output="partial")

    ### When
    with patch("scanners.subprocess.run", side_effect=exc):
        code, out, err = scanners._run(["slow"], timeout=1)

    ### Then
    assert code is None
    assert "timeout" in err


def test_given_missing_binary_when_run_then_file_not_found() -> None:
    """
    Scenario: FileNotFoundError maps to unreachable detail.
    Slice: slice-11 — _run FileNotFoundError

    Given subprocess.run raises FileNotFoundError,
    When _run is called,
    Then code is None and stderr names the binary.
    """
    ### Given / When
    with patch("scanners.subprocess.run", side_effect=FileNotFoundError()):
        code, _out, err = scanners._run(["missing-tool"])

    ### Then
    assert code is None
    assert "missing-tool" in err


def test_given_invalid_inner_json_when_safe_json_then_none() -> None:
    """
    Scenario: Braces that are not JSON yield None.
    Slice: slice-11 — _safe_json inner failure

    Given text with braces but invalid JSON inside,
    When _safe_json runs,
    Then None is returned.
    """
    ### Given / When / Then
    assert scanners._safe_json("prefix {not-json} trailing") is None


# ---------------------------------------------------------------------------
# Skill deepeners + completed multi-finding detail
# ---------------------------------------------------------------------------


def test_given_llm_key_when_skill_scanner_then_llm_path_invoked() -> None:
    """
    Scenario: SKILL_SCANNER_LLM_API_KEY triggers --use-llm invoke.
    Slice: slice-11 — skill LLM deepener

    Given the LLM key is set and _run returns empty findings JSON,
    When run_cisco_skill_scanner runs,
    Then both static and LLM-judge rows complete.
    """
    ### Given
    payload = json.dumps({"findings_count": 0, "findings": []})
    calls: list[list[str]] = []

    def _fake_run(cmd, timeout=None):
        calls.append(cmd)
        return 0, payload, ""

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", side_effect=_fake_run),
        patch.dict(
            "os.environ",
            {"SKILL_SCANNER_LLM_API_KEY": "k", "AI_DEFENSE_API_KEY": ""},
            clear=False,
        ),
    ):
        _findings, rows = scanners.run_cisco_skill_scanner("/tmp/w")

    ### Then
    sources = [r["scanner_source"] for r in rows]
    assert "Cisco Skill Scanner: LLM-judge" in sources
    assert any("--use-llm" in c for c in calls)


def test_given_aidefense_key_when_skill_scanner_then_aidefense_path() -> None:
    """
    Scenario: AI_DEFENSE_API_KEY triggers --use-aidefense invoke.
    Slice: slice-11 — skill AI Defense deepener

    Given AI Defense key set,
    When run_cisco_skill_scanner runs,
    Then the AI Defense row is completed.
    """
    ### Given
    payload = json.dumps({"findings_count": 0, "findings": []})

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, payload, "")),
        patch.dict(
            "os.environ",
            {"SKILL_SCANNER_LLM_API_KEY": "", "AI_DEFENSE_API_KEY": "k"},
            clear=False,
        ),
    ):
        _f, rows = scanners.run_cisco_skill_scanner("/tmp/w")

    ### Then
    assert any(r["scanner_source"] == "Cisco Skill Scanner: AI Defense" for r in rows)


def test_given_nonzero_exit_when_skill_invoke_then_unreachable() -> None:
    """
    Scenario: Nonzero skill-scanner exit becomes unreachable.
    Slice: slice-11 — skill invoke failure

    Given _run returns exit 1,
    When run_cisco_skill_scanner runs,
    Then the static row is unreachable.
    """
    ### Given / When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(1, "", "boom")),
        patch.dict(
            "os.environ",
            {"SKILL_SCANNER_LLM_API_KEY": "", "AI_DEFENSE_API_KEY": ""},
            clear=False,
        ),
    ):
        findings, rows = scanners.run_cisco_skill_scanner("/tmp/w")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_findings_when_completed_then_detail_summarises_worst() -> None:
    """
    Scenario: Completed rows summarise worst severity and truncate long messages.
    Slice: slice-11 — _completed multi-finding

    Given mapped findings with red severity and a long message,
    When _completed builds the row,
    Then detail mentions red and truncates the brief.
    """
    ### Given
    findings = [
        {"severity": "red", "message": "x" * 120},
        {"severity": "amber", "message": "other"},
    ]

    ### When
    row = scanners._completed("Snyk", 2, findings)

    ### Then
    assert "red" in row["detail"]
    assert "…" in row["detail"]


# ---------------------------------------------------------------------------
# MCP envelope + runner
# ---------------------------------------------------------------------------


def test_given_mcp_envelope_when_mapped_then_findings_and_rows() -> None:
    """
    Scenario: MCP envelope maps analyzer findings into Tripwire rows.
    Slice: slice-11 — _map_mcp_envelope

    Given a raw envelope with yara HIGH and SAFE entries,
    When _map_mcp_envelope runs,
    Then one red finding is emitted and yara row completes.
    """
    ### Given
    envelope = {
        "requested_analyzers": ["yara"],
        "scan_results": [
            {
                "item_type": "tool",
                "tool_name": "exec",
                "findings": {
                    "yara_analyzer": {
                        "severity": "HIGH",
                        "threat_summary": "shell",
                        "mcp_taxonomies": [{"scanner_category": "command_injection"}],
                    },
                    "llm_analyzer": {"severity": "SAFE"},
                    "broken": "skip-me",
                },
            }
        ],
    }

    ### When
    findings, rows, requested = scanners._map_mcp_envelope(envelope, ["yara"])

    ### Then
    assert requested == ["yara_analyzer"]
    assert len(findings) == 1
    assert findings[0]["severity"] == "red"
    assert findings[0]["category"] == "command_injection"
    assert rows[0]["status"] == "completed"


@pytest.mark.parametrize(
    ("tax", "expected"),
    [
        ([], "unknown"),
        (["raw-cat"], "raw-cat"),
        ([123], "unknown"),
    ],
)
def test_given_taxonomy_shapes_when_categorised_then_label(tax, expected: str) -> None:
    """
    Scenario: Taxonomy helper handles empty, string, and junk entries.
    Slice: slice-11 — _taxonomy_category
    """
    ### Given / When / Then
    assert scanners._taxonomy_category({"mcp_taxonomies": tax}) == expected


def test_given_mcp_installed_when_live_scan_ok_then_findings_returned(tmp_path) -> None:
    """
    Scenario: Live MCP scan with stdio mode maps envelope findings.
    Slice: slice-11 — run_cisco_mcp_scanner happy

    Given mcp-scanner installed, workdir with server.py, and JSON stdout,
    When run_cisco_mcp_scanner runs,
    Then findings include the mapped yara hit.
    """
    ### Given
    (tmp_path / "server.py").write_text("print('hi')\n", encoding="utf-8")
    envelope = {
        "requested_analyzers": ["yara"],
        "scan_results": [
            {
                "item_type": "tool",
                "tool_name": "t",
                "findings": {
                    "yara": {
                        "severity": "MEDIUM",
                        "threat_names": ["rule-a"],
                    }
                },
            }
        ],
    }

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(envelope), "")),
        patch.dict(
            "os.environ", {"MCP_SCANNER_LLM_API_KEY": "", "MCP_SCANNER_API_KEY": ""}, clear=False
        ),
    ):
        findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), "local")

    ### Then
    assert any(f["severity"] == "amber" for f in findings)
    assert any(r["status"] == "completed" for r in rows)


def test_given_mcp_live_fail_when_scanned_then_unreachable_rows(tmp_path) -> None:
    """
    Scenario: Nonzero mcp-scanner exit marks live analyzers unreachable.
    Slice: slice-11 — MCP live failure
    """
    ### Given
    (tmp_path / "run.sh").write_text("#!/bin/bash\n", encoding="utf-8")

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(2, "", "fail")),
        patch.dict(
            "os.environ", {"MCP_SCANNER_LLM_API_KEY": "", "MCP_SCANNER_API_KEY": ""}, clear=False
        ),
    ):
        findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), "local")

    ### Then
    assert findings == []
    assert any(r["status"] == "unreachable" for r in rows)


def test_given_mcp_behavioral_key_when_has_source_then_behavioral_runs(tmp_path) -> None:
    """
    Scenario: Behavioral analyzer runs when LLM key + source workdir present.
    Slice: slice-11 — MCP behavioral path
    """
    ### Given
    (tmp_path / "index.js").write_text("console.log(1)\n", encoding="utf-8")
    live = {"requested_analyzers": ["yara"], "scan_results": []}
    beh = {
        "requested_analyzers": ["behavioral"],
        "scan_results": [
            {
                "item_type": "tool",
                "tool_name": "t",
                "findings": {
                    "behavioral_analyzer": {
                        "severity": "LOW",
                        "threat_summary": "soft",
                    }
                },
            }
        ],
    }
    outputs = [(0, json.dumps(live), ""), (0, json.dumps(beh), "")]

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", side_effect=outputs),
        patch.dict(
            "os.environ",
            {
                "MCP_SCANNER_LLM_API_KEY": "k",
                "MCP_SCANNER_API_KEY": "",
                "MCP_SCANNER_ENDPOINT": "",
            },
            clear=False,
        ),
    ):
        findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), "local")

    ### Then
    assert any("Behavioral" in r["scanner_source"] for r in rows)
    assert any(f.get("severity") == "amber" for f in findings)


def test_given_mcp_missing_binary_when_run_then_unreachable() -> None:
    """
    Scenario: Missing mcp-scanner binary yields unreachable YARA row.
    Slice: slice-11 — MCP _which false
    """
    ### Given / When
    with patch.object(scanners, "_which", return_value=False):
        findings, rows = scanners.run_cisco_mcp_scanner("/tmp", "https://example.com")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_remote_url_without_source_when_mode_then_remote_args(tmp_path) -> None:
    """
    Scenario: Remote URL without local source selects remote mode.
    Slice: slice-11 — _mcp_mode_args remote
    """
    ### Given / When
    args = scanners._mcp_mode_args(str(tmp_path), "https://mcp.example/sse")

    ### Then
    assert args == ["remote", "--server-url", "https://mcp.example/sse"]


def test_given_empty_workdir_when_stdio_mode_then_none(tmp_path) -> None:
    """
    Scenario: Empty workdir cannot launch stdio MCP.
    Slice: slice-11 — _mcp_stdio_mode_args None
    """
    ### Given / When / Then
    assert scanners._mcp_stdio_mode_args(str(tmp_path)) is None


def test_given_no_mode_when_mcp_scanner_then_unreachable_for_live(tmp_path) -> None:
    """
    Scenario: No remote URL and no stdio entry → unreachable live analyzers.
    Slice: slice-11 — mode_args None branch
    """
    ### Given — empty dir (no server files); non-URL target
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.dict(
            "os.environ", {"MCP_SCANNER_LLM_API_KEY": "", "MCP_SCANNER_API_KEY": ""}, clear=False
        ),
    ):
        ### When
        findings, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), "not-a-url")

    ### Then
    assert findings == []
    assert any(r["status"] == "unreachable" for r in rows)


# ---------------------------------------------------------------------------
# Snyk + Tessl
# ---------------------------------------------------------------------------


def test_given_snyk_json_when_run_then_e_and_w_findings() -> None:
    """
    Scenario: Snyk Agent Scan JSON maps E*→red and W*→amber.
    Slice: slice-11 — run_snyk happy
    """
    ### Given
    payload = {
        "/tmp/skill": {
            "issues": [
                {"code": "E004", "message": "prompt inject"},
                {"code": "W008", "message": "secret"},
                {"code": "X001", "message": "runtime"},
            ]
        }
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", side_effect=lambda b: b == "snyk-agent-scan"),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp/skill", item_type="skill")

    ### Then
    severities = {f["severity"] for f in findings}
    assert severities == {"red", "amber"}
    assert rows[0]["status"] == "completed"
    assert "--skills" in scanners._snyk_cmd("/tmp/skill", "skill")


def test_given_no_snyk_token_when_run_then_skipped() -> None:
    """
    Scenario: Missing SNYK_TOKEN skips Snyk.
    Slice: slice-11 — run_snyk skip
    """
    ### Given / When
    with patch.dict("os.environ", {"SNYK_TOKEN": ""}, clear=False):
        findings, rows = scanners.run_snyk("/tmp", "mcp_server")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "skipped_missing_credential"


def test_given_snyk_path_error_when_run_then_unreachable() -> None:
    """
    Scenario: Path-level Snyk errors without issues → unreachable.
    Slice: slice-11 — run_snyk path error
    """
    ### Given
    payload = {"/tmp/x": {"error": {"message": "parse fail"}, "issues": []}}

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", side_effect=lambda b: b == "uvx"),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp/x", "mcp_server")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_snyk_server_unauthorized_when_run_then_skipped_credential() -> None:
    """
    Scenario: Per-server 401 Unauthorized is a credential skip, not unreachable.
    Slice: run_snyk — servers[].error auth mapping

    Given Snyk JSON with path.error null and servers[].error Unauthorized 401,
    When run_snyk maps the envelope,
    Then status is skipped_missing_credential with the Unauthorized detail.
    """
    ### Given
    payload = {
        "/tmp": {
            "error": None,
            "issues": [],
            "servers": [
                {
                    "name": "scan-target",
                    "error": {
                        "message": (
                            "Unauthorized. Please check your SNYK_TOKEN "
                            "environment variable or your push key."
                        ),
                        "exception": (
                            "401, message='Unauthorized', "
                            "url='https://api.snyk.io/hidden/mcp-scan/cli/analysis-machine'"
                        ),
                        "is_failure": True,
                        "category": "analysis_error",
                    },
                }
            ],
        }
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", side_effect=lambda b: b == "uvx"),
        patch.object(scanners, "_run", return_value=(1, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "skill")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "skipped_missing_credential"
    assert "Unauthorized" in rows[0].get("detail", "")


def test_given_snyk_empty_json_when_run_then_unreachable() -> None:
    """
    Scenario: Empty/non-dict Snyk output is unreachable.
    Slice: slice-11 — run_snyk empty root
    """
    ### Given / When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, "not-json", "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "mcp_server")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_snyk_valid_envelope_with_no_issues_when_run_then_completed() -> None:
    """
    Scenario: Authenticated Snyk response with empty issues is a clean completed scan.
    Slice: run_snyk — zero-issue success

    Given a valid path envelope with servers, issues=[], and no errors,
    When run_snyk maps it,
    Then status is completed (not unreachable) with zero findings.
    """
    ### Given
    payload = {
        "/tmp": {
            "error": None,
            "issues": [],
            "servers": [{"name": "scan-target", "error": None}],
        }
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "skill")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "completed"
    assert rows[0]["checks_run"] >= 1


def test_given_snyk_v06_clean_scan_path_responses_when_run_then_completed() -> None:
    """
    Scenario: Agent Scan v0.6 clean envelope is completed, not unreachable.
    Slice: slice-11 — run_snyk v0.6 clean

    Given SNYK_TOKEN and a scan_path_responses payload with skill_risks but empty risk_indexes,
    When run_snyk maps it,
    Then status is completed with zero findings.
    """
    ### Given
    payload = {
        "scan_path_responses": [
            {
                "client": "/tmp/scan-target",
                "path": "/tmp",
                "server_risks": [],
                "skill_risks": [
                    {
                        "name": "content-distiller",
                        "files": [{"name": "SKILL.md", "type": "instruction"}],
                        "risk_indexes": {},
                    }
                ],
            }
        ]
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "skill")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "completed"
    assert rows[0]["checks_run"] >= 1


def test_given_snyk_v06_risk_indexes_when_run_then_red_and_amber_findings() -> None:
    """
    Scenario: v0.6 risk_indexes map to Tripwire findings by score band.
    Slice: slice-11 — run_snyk v0.6 risks

    Given skill risk score 1000 and server risk score 300,
    When run_snyk maps them,
    Then one red and one amber finding are emitted and status is completed.
    """
    ### Given
    payload = {
        "scan_path_responses": [
            {
                "path": "/tmp",
                "server_risks": [
                    {
                        "name": "github",
                        "entities": [{"name": "search", "type": "tool"}],
                        "risk_indexes": {
                            "dangerous_words": {
                                "score": 300,
                                "evidence": "Manipulative language in tool desc.",
                                "affected_tools": [0],
                            }
                        },
                    }
                ],
                "skill_risks": [
                    {
                        "name": "release-helper",
                        "files": [{"name": "SKILL.md", "type": "instruction"}],
                        "risk_indexes": {
                            "prompt_injection_skill_instructions": {
                                "score": 1000,
                                "evidence": "Hidden directives in SKILL.md.",
                            }
                        },
                    }
                ],
            }
        ]
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "skill")

    ### Then
    assert rows[0]["status"] == "completed"
    assert len(findings) == 2
    by_cat = {f["category"]: f for f in findings}
    assert by_cat["prompt_injection_skill_instructions"]["severity"] == "red"
    assert "Hidden directives" in by_cat["prompt_injection_skill_instructions"]["message"]
    assert by_cat["dangerous_words"]["severity"] == "amber"


def test_given_snyk_v06_skill_unauthorized_when_run_then_skipped_credential() -> None:
    """
    Scenario: v0.6 skill-level Unauthorized is a credential skip.
    Slice: slice-11 — run_snyk v0.6 auth

    Given skill_risks[].error Unauthorized 401 and no risk findings,
    When run_snyk maps it,
    Then status is skipped_missing_credential.
    """
    ### Given
    payload = {
        "scan_path_responses": [
            {
                "path": "/tmp",
                "server_risks": [],
                "skill_risks": [
                    {
                        "name": "scan-target",
                        "error": {
                            "message": (
                                "Unauthorized. Please check your SNYK_TOKEN "
                                "environment variable or your push key."
                            ),
                            "exception": "401, message='Unauthorized'",
                            "is_failure": True,
                            "category": "analysis_error",
                        },
                    }
                ],
            }
        ]
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(1, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "skill")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "skipped_missing_credential"
    assert "Unauthorized" in rows[0].get("detail", "")


def test_given_no_snyk_binaries_when_cmd_then_none() -> None:
    """
    Scenario: Neither snyk-agent-scan nor uvx → no command.
    Slice: slice-11 — _snyk_cmd None
    """
    ### Given / When
    with patch.object(scanners, "_which", return_value=False):
        cmd = scanners._snyk_cmd("/tmp", "mcp_server")

    ### Then
    assert cmd is None


def test_given_tessl_score_shapes_when_extracted_then_numeric() -> None:
    """
    Scenario: Tessl quality score accepts score / review / judge shapes.
    Slice: slice-11 — _tessl_quality_score
    """
    ### Given / When / Then
    assert scanners._tessl_quality_score({"score": 88}) == 88
    assert scanners._tessl_quality_score({"review": {"reviewScore": 70}}) == 70
    assert scanners._tessl_quality_score(
        {"descriptionJudge": {"normalizedScore": 0.5}, "contentJudge": {"normalizedScore": 0.7}}
    ) == pytest.approx(60.0)
    assert scanners._tessl_quality_score("bad") is None
    assert scanners._tessl_quality_score({}) is None


def test_given_tessl_token_when_run_ok_then_quality_score() -> None:
    """
    Scenario: Tessl review JSON yields quality_score and completed row.
    Slice: slice-11 — run_tessl happy
    """
    ### Given
    payload = json.dumps({"score": 91})

    ### When
    with (
        patch.dict(
            "os.environ",
            {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"},
            clear=False,
        ),
        patch.object(scanners, "_resolve_tessl_workspace", return_value=("engteam", "")),
        patch.object(scanners, "_which", return_value=True),
        patch.object(
            scanners,
            "_run",
            side_effect=[
                (0, "1 check", ""),
                (0, payload, ""),
                (0, '{"id": "rev_ship", "score": 91}', ""),
            ],
        ),
    ):
        score, rows = scanners.run_tessl("/tmp/skill")

    ### Then
    assert score == 91
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert rows[1]["status"] == "completed"
    assert "91" in rows[1]["detail"]
    assert rows[1]["tessl_run_id"] == "rev_ship"


def test_given_no_tessl_token_when_run_then_skipped() -> None:
    """
    Scenario: Missing TESSL_TOKEN — Lint completes; Review and Scenario Gen are needs_setup.
    Slice: slice-11 updated for slice-46/49 — run_tessl three-row credential gate
    """
    ### Given / When
    with (
        patch.dict("os.environ", {"TESSL_TOKEN": ""}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, "0 checks — 0 findings", "")),
    ):
        score, rows = scanners.run_tessl("/tmp")

    ### Then
    assert score is None
    assert len(rows) == 4
    assert rows[0]["scanner_source"] == "Tessl: Lint"
    assert rows[0]["status"] == "completed"
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert rows[1]["status"] == "needs_setup"
    assert rows[2]["scanner_source"] == "Tessl: Scenario Generation"
    assert rows[2]["status"] == "needs_setup"
    assert rows[3]["scanner_source"] == "Tessl: Eval"
    assert rows[3]["status"] == "blocked"


def test_given_tessl_npx_missing_when_run_then_unreachable() -> None:
    """
    Scenario: Missing npx marks Tessl unreachable.
    Slice: slice-11 — run_tessl npx missing
    """
    ### Given / When
    with (
        patch.dict(
            "os.environ",
            {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"},
            clear=False,
        ),
        patch.object(scanners, "_resolve_tessl_workspace", return_value=("engteam", "")),
        patch.object(scanners, "_which", return_value=False),
    ):
        score, rows = scanners.run_tessl("/tmp")

    ### Then
    assert score is None
    assert rows[0]["status"] == "unreachable"


def test_given_tessl_nonzero_when_run_then_unreachable() -> None:
    """
    Scenario: Nonzero Review exit is unreachable; lint row is unaffected.
    Slice: slice-11 updated for slice-46 — run_tessl two-row: review fails
    """
    ### Given / When
    with (
        patch.dict(
            "os.environ",
            {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"},
            clear=False,
        ),
        patch.object(scanners, "_resolve_tessl_workspace", return_value=("engteam", "")),
        patch.object(scanners, "_which", return_value=True),
        patch.object(
            scanners, "_run", side_effect=[(0, "0 checks — 0 findings", ""), (1, "", "fail")]
        ),
    ):
        score, rows = scanners.run_tessl("/tmp")

    ### Then
    assert score is None
    assert rows[0]["scanner_source"] == "Tessl: Lint"
    assert rows[0]["status"] == "completed"
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert rows[1]["status"] == "unreachable"


# ---------------------------------------------------------------------------
# scan_item_inner
# ---------------------------------------------------------------------------


def _supabase_chain(data=None):
    """Build a MagicMock supabase client with table update/insert chains."""
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    update_eq = MagicMock()
    update_eq.execute.return_value = MagicMock(data=data if data is not None else [{"id": "1"}])
    table.update.return_value.eq.return_value.eq.return_value = update_eq
    table.update.return_value.eq.return_value = update_eq
    table.insert.return_value.execute.return_value = MagicMock(data=[{"ok": True}])
    sb.rpc.return_value.execute.return_value = MagicMock(data=[])
    return sb


def test_given_scanners_complete_when_scan_item_inner_then_completed_status() -> None:
    """
    Scenario: scan_item_inner persists running rows, findings, and completed status.
    Slice: slice-11 — _scan_item_inner happy

    Given mocked acquire + run_all_scanners returning completed,
    When _scan_item_inner runs,
    Then scan_runs is updated to completed and findings insert is attempted.
    """
    ### Given
    sb = _supabase_chain(data=[{"id": "1"}])
    results = {
        "overall_status": "completed",
        "findings": [{"severity": "red", "message": "x", "scanner_source": "Snyk"}],
        "scanner_rows": [{"scanner_source": "Snyk", "status": "completed", "checks_run": 1}],
        "quality_score": 80,
    }

    def _fake_all(**kwargs):
        kwargs["on_scanner_start"](["Snyk"])
        kwargs["on_scanner_done"](
            results["findings"], results["scanner_rows"], results["quality_score"]
        )
        return results

    ### When
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)

    ### Then
    assert sb.table.called
    assert sb.rpc.called


def test_given_scenario_checkpoint_when_scan_item_inner_then_resume_and_progress_wired() -> None:
    """
    Scenario: scan_item_inner loads Tessl resume_checkpoint and Eval prior row.
    Slice: 49/50 — scan_app mid-scan persist

    Given an existing Scenario Generation resume_checkpoint and Eval row in Supabase,
    When _scan_item_inner runs,
    Then run_all_scanners receives tessl_scenario_resume, tessl_prior_eval,
    and on_scanner_progress writes.
    """
    ### Given
    checkpoint = {"stage": "generated", "gen_id": "gen_persisted"}
    prior_eval = {
        "status": "interrupted",
        "tessl_run_id": "eval_resume",
        "tessl_run_id_at": "2026-08-25T00:00:00+00:00",
        "completed_at": None,
        "upstream_run_ids": {"review_quality": "rev_1", "scenario_gen": "gen_1"},
        "detail": "detached",
        "checks_run": 0,
    }
    sb = _supabase_chain(data=[{"id": "1"}])
    select_results = iter(
        [
            MagicMock(data=[{"resume_checkpoint": checkpoint}]),
            MagicMock(data=[prior_eval]),
        ]
    )

    def _select_side_effect(*_args, **_kwargs):
        chain = MagicMock()
        chain.eq.return_value.eq.return_value.limit.return_value.execute.side_effect = lambda: next(
            select_results
        )
        return chain

    sb.table.return_value.select.side_effect = _select_side_effect
    captured: dict = {}

    def _fake_all(**kwargs):
        captured["resume"] = kwargs.get("tessl_scenario_resume")
        captured["prior_eval"] = kwargs.get("tessl_prior_eval")
        assert kwargs["on_scanner_progress"] is not None
        kwargs["on_scanner_progress"](
            {
                "scanner_source": "Tessl: Eval",
                "status": "blocked",
                "checks_run": 0,
            }
        )
        kwargs["on_scanner_start"](["Tessl: Scenario Generation", "Tessl: Eval"])
        kwargs["on_scanner_done"]([], [], None)
        return {
            "overall_status": "complete",
            "findings": [],
            "scanner_rows": [],
            "quality_score": None,
        }

    ### When
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)

    ### Then
    assert captured["resume"] == checkpoint
    assert captured["prior_eval"] == prior_eval
    assert sb.table.called


def test_given_resume_select_errors_when_scan_item_inner_then_continues() -> None:
    """
    Scenario: Tessl resume/prior select failures are non-fatal warnings.
    Slice: 50 — scan_app load resilience

    Given Supabase select for Scenario/Eval resume rows raises,
    When _scan_item_inner runs,
    Then run_all_scanners is still invoked with None resume/prior values.
    """
    ### Given
    sb = _supabase_chain(data=[{"id": "1"}])
    sb.table.return_value.select.side_effect = RuntimeError("db down")
    captured: dict = {}

    def _fake_all(**kwargs):
        captured["resume"] = kwargs.get("tessl_scenario_resume")
        captured["prior_eval"] = kwargs.get("tessl_prior_eval")
        return {
            "overall_status": "complete",
            "findings": [],
            "scanner_rows": [],
            "quality_score": None,
        }

    ### When
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)

    ### Then
    assert captured["resume"] is None
    assert captured["prior_eval"] is None


def test_given_acquire_fails_when_scan_item_inner_then_mark_failed() -> None:
    """
    Scenario: Acquire failure marks scan_run failed and re-raises.
    Slice: slice-11 — _scan_item_inner acquire fail
    """
    ### Given
    sb = _supabase_chain()

    ### When / Then
    with (
        patch.object(scan_app, "_acquire_target", side_effect=RuntimeError("pack fail")),
        pytest.raises(RuntimeError, match="pack fail"),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)


def test_given_scanners_raise_when_scan_item_inner_then_mark_failed() -> None:
    """
    Scenario: Scanner orchestration failure marks failed and re-raises.
    Slice: slice-11 — _scan_item_inner scanners fail
    """
    ### Given
    sb = _supabase_chain()

    ### When / Then
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=RuntimeError("scan boom")),
        pytest.raises(RuntimeError, match="scan boom"),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)


def test_given_update_empty_when_on_scanner_done_then_insert_fallback() -> None:
    """
    Scenario: Empty update response falls back to insert for scanner rows.
    Slice: slice-11 — on_scanner_done insert fallback
    """
    ### Given
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    # .eq().eq().execute() returns empty data → triggers insert fallback
    empty = MagicMock(data=[])
    table.update.return_value.eq.return_value.eq.return_value.execute.return_value = empty
    table.insert.return_value.execute.return_value = MagicMock(data=[{"ok": True}])
    sb.rpc.return_value.execute.return_value = MagicMock(data=[])
    safe_insert = MagicMock()

    def _fake_all(**kwargs):
        kwargs["on_scanner_done"](
            [],
            [{"scanner_source": "Snyk", "status": "completed", "checks_run": 0}],
            None,
        )
        return {
            "overall_status": "completed",
            "findings": [],
            "scanner_rows": [],
            "quality_score": None,
        }

    ### When
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
        patch.object(scan_app, "_safe_insert", safe_insert),
    ):
        scan_app._scan_item_inner(sb, "t", "mcp_server", "run-1", "item-1", None)

    ### Then
    assert safe_insert.called
    assert any(c.args[1] == "scan_run_scanners" for c in safe_insert.call_args_list)


def test_given_update_raises_when_on_scanner_done_then_insert_fallback() -> None:
    """
    Scenario: Update exception falls back to _safe_insert for scanner rows.
    Slice: slice-11 — on_scanner_done exception fallback
    """
    ### Given
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    table.update.return_value.eq.return_value.eq.return_value.execute.side_effect = RuntimeError(
        "update fail"
    )
    table.insert.return_value.execute.return_value = MagicMock(data=[{"ok": True}])
    sb.rpc.return_value.execute.return_value = MagicMock(data=[])
    safe_insert = MagicMock()

    def _fake_all(**kwargs):
        kwargs["on_scanner_start"](["Snyk"])
        kwargs["on_scanner_done"](
            [],
            [{"scanner_source": "Snyk", "status": "completed", "checks_run": 0}],
            None,
        )
        return {
            "overall_status": "completed",
            "findings": [],
            "scanner_rows": [],
            "quality_score": None,
        }

    ### When
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
        patch.object(scan_app, "_safe_insert", safe_insert),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)

    ### Then
    assert safe_insert.called


def test_given_start_insert_fails_when_scan_inner_then_warns_and_continues() -> None:
    """
    Scenario: Running-row insert failures are warnings, not fatal.
    Slice: slice-11 — on_scanner_start exception
    """
    ### Given
    sb = _supabase_chain()
    sb.table.return_value.insert.return_value.execute.side_effect = RuntimeError("insert fail")

    def _fake_all(**kwargs):
        kwargs["on_scanner_start"](["Snyk"])
        return {
            "overall_status": "completed",
            "findings": [],
            "scanner_rows": [],
            "quality_score": None,
        }

    ### When / Then — does not raise
    with (
        patch.object(scan_app, "_acquire_target"),
        patch.object(scan_app, "run_all_scanners", side_effect=_fake_all),
    ):
        scan_app._scan_item_inner(sb, "t", "skill", "run-1", "item-1", None)


def test_given_snyk_token_but_no_cmd_when_run_then_unreachable() -> None:
    """
    Scenario: SNYK_TOKEN set but no binary/uvx → unreachable.
    Slice: slice-11 — run_snyk cmd None
    """
    ### Given / When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_snyk_cmd", return_value=None),
    ):
        findings, rows = scanners.run_snyk("/tmp", "mcp_server")

    ### Then
    assert findings == []
    assert rows[0]["status"] == "unreachable"


def test_given_behavioral_fail_when_mcp_then_unreachable(tmp_path) -> None:
    """
    Scenario: Behavioral analyzer nonzero exit → unreachable.
    Slice: slice-11 — MCP behavioral fail
    """
    ### Given
    (tmp_path / "server.py").write_text("x\n", encoding="utf-8")
    live = {"requested_analyzers": ["yara"], "scan_results": []}
    outputs = [(0, json.dumps(live), ""), (1, "", "beh fail")]

    ### When
    with (
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", side_effect=outputs),
        patch.dict("os.environ", {"MCP_SCANNER_LLM_API_KEY": "k"}, clear=False),
    ):
        _f, rows = scanners.run_cisco_mcp_scanner(str(tmp_path), "local")

    ### Then
    beh = [r for r in rows if "Behavioral" in r["scanner_source"]]
    assert beh and beh[0]["status"] == "unreachable"


def test_given_normalize_empty_when_key_then_passthrough() -> None:
    """
    Scenario: Empty analyzer names pass through normalize unchanged.
    Slice: slice-11 — _normalize_analyzer_key empty
    """
    ### Given / When / Then
    assert scanners._normalize_analyzer_key("") == ""
    assert scanners._normalize_analyzer_key("yara") == "yara_analyzer"


def test_given_unknown_requested_analyzer_when_mapped_then_skipped() -> None:
    """
    Scenario: Unknown requested analyzers are ignored in row building.
    Slice: slice-11 — _map_mcp_envelope unknown key
    """
    ### Given
    envelope = {"requested_analyzers": ["nope"], "scan_results": []}

    ### When
    findings, rows, requested = scanners._map_mcp_envelope(envelope, ["nope"])

    ### Then
    assert requested == ["nope_analyzer"]
    assert rows == []
    assert findings == []


def test_given_non_dict_path_result_when_snyk_then_skipped() -> None:
    """
    Scenario: Non-dict Snyk path results are ignored.
    Slice: slice-11 — run_snyk skip non-dict
    """
    ### Given
    payload = {"/tmp/x": "bad", "/tmp/y": {"issues": [{"code": "E001", "message": "e"}]}}

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "mcp_server")

    ### Then
    assert len(findings) == 1
    assert rows[0]["status"] == "completed"


def test_given_mixed_snyk_path_results_when_one_path_errors_then_scan_is_partial_not_clean() -> (
    None
):
    """
    Scenario: Partial Snyk evidence cannot be certified as a clean scan.
    Slice: scanner evidence integrity

    Given one Snyk path has findings and another returns an error,
    When the Snyk adapter maps the response,
    Then findings are retained but the scanner status is unreachable for roll-up.
    """
    ### Given
    payload = {
        "/tmp/ok": {"issues": [{"code": "E004", "message": "prompt injection"}]},
        "/tmp/error": {"error": "permission denied"},
    }

    ### When
    with (
        patch.dict("os.environ", {"SNYK_TOKEN": "t"}, clear=False),
        patch.object(scanners, "_which", return_value=True),
        patch.object(scanners, "_run", return_value=(0, json.dumps(payload), "")),
    ):
        findings, rows = scanners.run_snyk("/tmp", "mcp_server")

    ### Then
    assert len(findings) == 1
    assert rows[0]["status"] == "unreachable"
    assert "permission denied" in rows[0]["detail"]


def test_given_tessl_no_console_when_completed_then_no_console_key() -> None:
    """
    Scenario: Empty Tessl console omits console_output key.
    Slice: slice-11 — run_tessl no console
    """
    ### Given / When
    with (
        patch.dict(
            "os.environ",
            {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"},
            clear=False,
        ),
        patch.object(scanners, "_resolve_tessl_workspace", return_value=("engteam", "")),
        patch.object(scanners, "_which", return_value=True),
        patch.object(
            scanners, "_run", return_value=(0, json.dumps({"score": 1, "id": "rev_c"}), "")
        ),
        patch.object(scanners, "_build_console", return_value=None),
    ):
        score, rows = scanners.run_tessl("/tmp")

    ### Then
    assert score == 1
    assert "console_output" not in rows[0]


def test_given_tessl_empty_success_output_when_run_then_not_reported_completed() -> None:
    """
    Scenario: Tessl Review needs a parseable quality score to certify completion.
    Slice: scanner evidence integrity (updated for slice-46 two-row behavior)

    Given Tessl exits zero for lint (normal) and for review with an empty JSON object,
    When the quality adapter maps the response,
    Then the review row is unreachable instead of a one-check clean result.
    """
    ### Given / When
    with (
        patch.dict(
            "os.environ",
            {"TESSL_TOKEN": "t", "TESSL_WORKSPACE": "engteam"},
            clear=False,
        ),
        patch.object(scanners, "_resolve_tessl_workspace", return_value=("engteam", "")),
        patch.object(scanners, "_which", return_value=True),
        patch.object(
            scanners, "_run", side_effect=[(0, "0 checks — 0 findings", ""), (0, "{}", "")]
        ),
    ):
        score, rows = scanners.run_tessl("/tmp")

    ### Then
    assert score is None
    assert rows[1]["scanner_source"] == "Tessl: Review (Quality)"
    assert rows[1]["status"] == "unreachable"
    assert "no parseable quality score" in rows[1]["detail"]


def test_given_on_scanner_start_when_run_all_skill_then_signalled() -> None:
    """
    Scenario: run_all_scanners signals start for skill scanner sources.
    Slice: slice-11 — run_all_scanners start relay
    """
    ### Given
    started: list[list[str]] = []

    ### When
    with (
        patch.object(scanners, "run_cisco_skill_scanner", return_value=([], [])),
        patch.object(scanners, "run_snyk", return_value=([], [])),
        patch.object(scanners, "run_tessl", return_value=(None, [])),
    ):
        scanners.run_all_scanners(
            "/tmp",
            "skill",
            "t",
            on_scanner_start=lambda s: started.append(list(s)),
        )

    ### Then
    assert started
    assert "Cisco Skill Scanner: static/bytecode/pipeline" in started[0]


def test_given_local_dir_when_maybe_pack_then_archive_bytes(tmp_path) -> None:
    """
    Scenario: Local directory targets are tar-packed for Modal.
    Slice: slice-11 — _maybe_pack_local_target
    """
    ### Given
    skill = tmp_path / "skill"
    skill.mkdir()
    (skill / "SKILL.md").write_text("# hi\n", encoding="utf-8")

    ### When
    archive = scan_app._maybe_pack_local_target(str(skill))

    ### Then
    assert archive is not None
    assert len(archive) > 0


def test_given_http_target_when_maybe_pack_then_none() -> None:
    """
    Scenario: HTTP targets are not packed on the host.
    Slice: slice-11 — _maybe_pack_local_target skip
    """
    ### Given / When / Then
    assert scan_app._maybe_pack_local_target("https://example.com/repo.git") is None


def test_given_unreachable_detail_without_stderr_when_built_then_no_detail_key() -> None:
    """
    Scenario: Empty stderr omits detail key on unreachable rows.
    Slice: slice-11 — _unreachable empty detail
    """
    ### Given / When
    row = scanners._unreachable("Snyk", "   ")

    ### Then
    assert "detail" not in row


def test_given_mcp_analyzers_env_when_live_then_llm_and_api_included() -> None:
    """
    Scenario: MCP live analyzer list grows with LLM and API keys.
    Slice: slice-11 — _mcp_live_analyzers
    """
    ### Given / When
    with patch.dict(
        "os.environ",
        {
            "MCP_SCANNER_LLM_API_KEY": "k",
            "MCP_SCANNER_API_KEY": "a",
            "MCP_SCANNER_ENDPOINT": "https://e",
        },
        clear=False,
    ):
        actual = scanners._mcp_live_analyzers()

    ### Then
    assert actual == ["yara", "llm", "api"]
