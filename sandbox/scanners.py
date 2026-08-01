"""Scanner adapters — real subprocess invocations of the upstream CLIs.

Evidence labels (matching docs/research/adapters/scanner-output-adapters.md convention):
RESEARCH = shape taken from primary docs, not yet round-tripped through Supabase on a
real fixture. Everything below is RESEARCH — reconcile against the pinned CLI version's
--help / --json output before this blocks a merge (mcp-scanner especially: current docs
use global --format/--analyzers flags ahead of a mode, while an earlier validation pass
used config/vulnerable-package/behavioral subcommands — pin a version and confirm which
shape it actually emits).
"""
import json
import os
import shutil
import subprocess

SCAN_TIMEOUT = 240  # leaves headroom under the sandbox's 300s hard timeout

# Severity collapse (docs/research/adapters/scanner-output-adapters.md §1, PROPOSED)
_SNYK_CODE_CATEGORY = {
    "E004": "prompt_injection",
    "W008": "hardcoded_secrets",
    # Open: full E*/W* -> Tripwire category table (adapters doc §2 "Open")
}


def _which(binary):
    return shutil.which(binary) is not None


def _run(cmd, timeout=SCAN_TIMEOUT):
    """Never raises on nonzero exit or timeout — callers map that to a
    scan_run_scanners status (unreachable) rather than a crash."""
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as exc:
        return None, exc.stdout or "", "timeout after {}s".format(timeout)
    except FileNotFoundError:
        return None, "", "binary not found: {}".format(cmd[0])


def _skipped(source, reason="skipped_missing_credential"):
    return {"scanner_source": source, "status": reason, "checks_run": 0}


def _unreachable(source, stderr):
    print("[{}] unreachable: {}".format(source, (stderr or "")[:400]))
    return {"scanner_source": source, "status": "unreachable", "checks_run": 0}


def _safe_json(text):
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


# ---- Cisco Skill Scanner ----------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §3
# Capture: skill-scanner scan <path> --format json  (avoid --output: flaky on a tested build)

def run_cisco_skill_scanner(workdir):
    source_static = "Cisco Skill Scanner: static/bytecode/pipeline"
    if not _which("skill-scanner"):
        return [], [_unreachable(source_static, "skill-scanner not installed in image")]

    rows, findings = [], []

    def _invoke(extra_flags, source):
        code, out, err = _run(["skill-scanner", "scan", workdir, "--format", "json", *extra_flags])
        if code != 0:
            return [_unreachable(source, err)], []
        parsed = _safe_json(out) or {}
        return [{
            "scanner_source": source, "status": "completed",
            "checks_run": parsed.get("findings_count", len(parsed.get("findings", [])) or 1)
        }], _map_skill_findings(parsed, source)

    r, f = _invoke([], source_static); rows += r; findings += f

    if os.environ.get("SKILL_SCANNER_LLM_API_KEY"):
        r, f = _invoke(["--use-llm"], "Cisco Skill Scanner: LLM-judge"); rows += r; findings += f
    else:
        rows.append(_skipped("Cisco Skill Scanner: LLM-judge"))

    if os.environ.get("AI_DEFENSE_API_KEY"):
        r, f = _invoke(["--use-aidefense"], "Cisco Skill Scanner: AI Defense"); rows += r; findings += f
    else:
        rows.append(_skipped("Cisco Skill Scanner: AI Defense"))

    return findings, rows


def _map_skill_findings(parsed, source):
    out = []
    for f in parsed.get("findings", []) or []:
        out.append({
            "severity": _collapse_severity(f.get("severity")),
            "category": f.get("category", "unknown"),
            "file_path": f.get("file_path"),
            "location": str(f.get("line_number")) if f.get("line_number") is not None else None,
            "message": (f.get("title", "") + " — " + f.get("description", "")).strip(" —"),
            "snippet": f.get("snippet"),
            "scanner_source": source,
        })
    return out


# ---- Cisco MCP Scanner ------------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §4
# Capture: mcp-scanner --format raw <target> --analyzers yara,llm,api,behavioral

_MCP_ANALYZER_LABEL = {
    "yara_analyzer": "Cisco MCP Scanner: YARA",
    "llm_analyzer": "Cisco MCP Scanner: LLM-judge",
    "api_analyzer": "Cisco MCP Scanner: AI Defense",
    "behavioral_analyzer": "Cisco MCP Scanner: Behavioral Code Scanning",
}


def run_cisco_mcp_scanner(workdir, target):
    if not _which("mcp-scanner"):
        return [], [_unreachable("Cisco MCP Scanner: YARA", "mcp-scanner not installed in image")]

    analyzers = ["yara"]
    if os.environ.get("MCP_SCANNER_LLM_API_KEY"):
        analyzers.append("llm")
    if os.environ.get("MCP_SCANNER_API_KEY") and os.environ.get("MCP_SCANNER_ENDPOINT"):
        analyzers.append("api")
    has_source = os.path.isdir(workdir) and any(os.scandir(workdir))
    if has_source:
        analyzers.append("behavioral")

    code, out, err = _run(["mcp-scanner", "--format", "raw", target, "--analyzers", ",".join(analyzers)])
    if code != 0:
        return [], [_unreachable(label, err) for label in _MCP_ANALYZER_LABEL.values()]

    envelope = _safe_json(out) or {}
    findings, seen_analyzers, checks = [], set(), {}
    for result in envelope.get("scan_results", []) or []:
        entity_kind = result.get("item_type")
        entity_name = result.get("tool_name") or result.get("prompt_name") or result.get("resource_uri")
        for analyzer_key, entry in (result.get("findings") or {}).items():
            if not isinstance(entry, dict):
                continue
            seen_analyzers.add(analyzer_key)
            checks[analyzer_key] = checks.get(analyzer_key, 0) + 1
            severity = _collapse_severity(entry.get("severity"))
            if severity is None:  # SAFE — no finding row
                continue
            findings.append({
                "severity": severity,
                "category": (entry.get("mcp_taxonomies") or ["unknown"])[0],
                "entity_kind": entity_kind, "entity_name": entity_name,
                "message": entry.get("threat_summary") or ", ".join(entry.get("threat_names", [])) or "flagged",
                "scanner_source": _MCP_ANALYZER_LABEL.get(analyzer_key, analyzer_key),
            })

    rows = []
    requested = envelope.get("requested_analyzers") or [a + "_analyzer" for a in analyzers]
    for analyzer_key in requested:
        label = _MCP_ANALYZER_LABEL.get(analyzer_key, analyzer_key)
        rows.append({"scanner_source": label, "status": "completed", "checks_run": checks.get(analyzer_key, 1)})
    for missing_key, label in _MCP_ANALYZER_LABEL.items():
        if missing_key not in requested:
            reason = "not_applicable" if missing_key == "behavioral_analyzer" and not has_source else "skipped_missing_credential"
            rows.append(_skipped(label, reason))

    return findings, rows


# ---- Snyk Agent Scan ---------------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §2
# Capture: uvx snyk-agent-scan@latest --ci --dangerously-run-mcp-servers --json <path>

def run_snyk(workdir):
    source = "Snyk"
    if not os.environ.get("SNYK_TOKEN"):
        return [], [_skipped(source)]
    if not _which("uvx"):
        return [], [_unreachable(source, "uvx not available (uv missing from image)")]

    code, out, err = _run(["uvx", "snyk-agent-scan@latest", "--ci", "--dangerously-run-mcp-servers", "--json", workdir])
    if code != 0:
        return [], [_unreachable(source, err)]

    root = _safe_json(out) or {}
    findings, checks = [], 0
    for abs_path, path_result in root.items():
        if not isinstance(path_result, dict):
            continue
        if path_result.get("error"):
            continue  # path-level failure — does not fabricate a finding
        for issue in path_result.get("issues", []) or []:
            checks += 1
            code_ = issue.get("code", "")
            severity = "red" if code_.startswith("E") else ("amber" if code_.startswith("W") else None)
            if severity is None:  # X* runtime/engine codes are not security findings
                continue
            findings.append({
                "severity": severity,
                "category": _SNYK_CODE_CATEGORY.get(code_, "unknown"),
                "message": issue.get("message"),
                "scanner_source": source,
            })
    return findings, [{"scanner_source": source, "status": "completed", "checks_run": checks or 1}]


# ---- Tessl (skills quality axis only, never findings) -----------------------

def run_tessl(workdir):
    if not os.environ.get("TESSL_TOKEN"):
        return None, [_skipped("Tessl")]
    if not _which("npx"):
        return None, [_unreachable("Tessl", "npx not available (node/npm missing from image)")]
    workspace = os.environ.get("TESSL_WORKSPACE", "default")
    code, out, err = _run(["npx", "tessl@latest", "review", "run", workdir, "--workspace", workspace, "--json"])
    if code != 0:
        return None, [_unreachable("Tessl", err)]
    parsed = _safe_json(out) or {}
    return parsed.get("score"), [{"scanner_source": "Tessl", "status": "completed", "checks_run": 1}]


def _collapse_severity(raw):
    if not raw:
        return None
    r = raw.upper()
    if r in ("CRITICAL", "HIGH"):
        return "red"
    if r == "MEDIUM":
        return "amber"
    if r in ("LOW", "INFO"):
        return "green"
    return None  # SAFE / empty — no finding row


def run_all_scanners(workdir, item_type, target):
    findings, scanner_rows = [], []
    quality_score = None

    if item_type == "skill":
        f, r = run_cisco_skill_scanner(workdir); findings += f; scanner_rows += r
        quality_score, r = run_tessl(workdir); scanner_rows += r
    else:
        f, r = run_cisco_mcp_scanner(workdir, target); findings += f; scanner_rows += r

    f, r = run_snyk(workdir); findings += f; scanner_rows += r

    any_unreachable = any(row["status"] == "unreachable" for row in scanner_rows)
    overall_status = "partial-failed" if any_unreachable else "complete"

    return {
        "findings": findings,
        "scanner_rows": scanner_rows,
        "quality_score": quality_score,
        "overall_status": overall_status,
    }
