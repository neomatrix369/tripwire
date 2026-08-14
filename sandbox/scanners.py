"""Scanner adapters — real subprocess invocations of the upstream CLIs.

Evidence labels (matching docs/research/adapters/scanner-output-adapters.md convention):
RESEARCH = shape taken from primary docs, not yet round-tripped through Supabase on a
real fixture. Everything below is RESEARCH — reconcile against the pinned CLI version's
--help / --json output before this blocks a merge.

mcp-scanner CLI (cisco-ai-mcp-scanner ≥4.x, VERIFIED against upstream README 2026-08-01):
global flags (--format / --analyzers / --log-level) MUST precede a mode subcommand
(remote | stdio | behavioral | …). A bare path/URL as a positional between flags makes
argparse print usage and exit nonzero — Tripwire maps that stderr to status=unreachable.
"""

import json
import os
import shutil
import subprocess

SCAN_TIMEOUT = 240  # leaves headroom under the sandbox's 300s hard timeout
MAX_CONSOLE_CHARS = 3000  # per-scanner console capture limit for Supabase detail

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
        return None, exc.stdout or "", f"timeout after {timeout}s"
    except FileNotFoundError:
        return None, "", f"binary not found: {cmd[0]}"


def _skipped(source, reason="skipped_missing_credential", detail=None, console_output=None):
    row = {"scanner_source": source, "status": reason, "checks_run": 0}
    if detail:
        row["detail"] = str(detail).strip()[:4000]
    if console_output:
        row["console_output"] = console_output
    return row


def _snyk_collect_errors(path_result):
    """Gather path-level and per-server errors from a Snyk path envelope."""
    errors = []
    path_err = path_result.get("error")
    if path_err:
        errors.append(path_err)
    for server in path_result.get("servers") or []:
        if isinstance(server, dict) and server.get("error"):
            errors.append(server["error"])
    return errors


def _snyk_error_is_auth(err):
    """True when Snyk rejected credentials (401 / Unauthorized / SNYK_TOKEN hint)."""
    if isinstance(err, dict):
        msg = str(err.get("message") or "")
        exc = str(err.get("exception") or "")
        return "Unauthorized" in msg or "Unauthorized" in exc or "401" in exc
    text = str(err)
    return "Unauthorized" in text and ("401" in text or "SNYK_TOKEN" in text)


def _snyk_error_message(err):
    if isinstance(err, dict) and err.get("message"):
        return str(err["message"])
    return str(err)


def _unreachable(source, stderr, console_output=None):
    detail = (stderr or "").strip()
    print(f"[{source}] unreachable: {detail[:400]}")
    row = {"scanner_source": source, "status": "unreachable", "checks_run": 0}
    if detail:
        row["detail"] = detail[:4000]
    if console_output:
        row["console_output"] = console_output
    return row


def _safe_json(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    # CLIs sometimes prefix progress/npm notices before the JSON object.
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except (json.JSONDecodeError, TypeError):
            return None
    return None


def _truncate_console(text, max_chars=MAX_CONSOLE_CHARS):
    """Truncate raw console text, preserving head and tail for context."""
    if not text or len(text) <= max_chars:
        return text or None
    half = max_chars // 2 - 30
    omitted = len(text) - 2 * half
    return f"{text[:half]}\n…[{omitted} chars omitted]…\n{text[-half:]}"


def _build_console(stdout, stderr):
    """Build a truncated console capture from scanner subprocess output."""
    parts = []
    if stdout and stdout.strip():
        parts.append(stdout.strip())
    if stderr and stderr.strip():
        prefix = "--- stderr ---\n" if parts else ""
        parts.append(f"{prefix}{stderr.strip()}")
    return _truncate_console("\n".join(parts)) if parts else None


# ---- Cisco Skill Scanner ----------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §3
# Capture: skill-scanner scan <path> --format json  (avoid --output: flaky on a tested build)


def _completed(source, checks_run, findings_for_scanner, console_output=None):
    """Build a completed scanner row with a human-readable detail summary."""
    n_findings = len(findings_for_scanner)
    if n_findings == 0:
        detail = f"{checks_run} checks passed — no findings"
    else:
        severities = [f.get("severity", "unknown") for f in findings_for_scanner]
        worst = (
            "red" if "red" in severities else ("amber" if "amber" in severities else severities[0])
        )
        brief = findings_for_scanner[0].get("message", "flagged")
        if len(brief) > 80:
            brief = brief[:77] + "…"
        detail = f"{checks_run} checks — {n_findings} finding{'s' if n_findings != 1 else ''} ({worst}): {brief}"
    row = {
        "scanner_source": source,
        "status": "completed",
        "checks_run": checks_run,
        "detail": detail,
    }
    if console_output:
        row["console_output"] = console_output
    return row


def run_cisco_skill_scanner(workdir):
    source_static = "Cisco Skill Scanner: static/bytecode/pipeline"
    if not _which("skill-scanner"):
        return [], [_unreachable(source_static, "skill-scanner not installed in image")]

    rows, findings = [], []

    def _invoke(extra_flags, source):
        code, out, err = _run(["skill-scanner", "scan", workdir, "--format", "json", *extra_flags])
        console = _build_console(out, err)
        if code != 0:
            return [_unreachable(source, err, console_output=console)], []
        parsed = _safe_json(out)
        if not isinstance(parsed, dict) or not parsed:
            return [
                _unreachable(
                    source, "scanner returned no parseable JSON results", console_output=console
                )
            ], []
        mapped = _map_skill_findings(parsed, source)
        checks = parsed.get("findings_count", len(parsed.get("findings", [])) or 1)
        return [_completed(source, checks, mapped, console_output=console)], mapped

    r, f = _invoke([], source_static)
    rows += r
    findings += f

    if os.environ.get("SKILL_SCANNER_LLM_API_KEY"):
        r, f = _invoke(["--use-llm"], "Cisco Skill Scanner: LLM-judge")
        rows += r
        findings += f
    else:
        rows.append(_skipped("Cisco Skill Scanner: LLM-judge"))

    if os.environ.get("AI_DEFENSE_API_KEY"):
        r, f = _invoke(["--use-aidefense"], "Cisco Skill Scanner: AI Defense")
        rows += r
        findings += f
    else:
        rows.append(_skipped("Cisco Skill Scanner: AI Defense"))

    return findings, rows


def _map_skill_findings(parsed, source):
    out = []
    for f in parsed.get("findings", []) or []:
        out.append(
            {
                "severity": _collapse_severity(f.get("severity")),
                "category": f.get("category", "unknown"),
                "file_path": f.get("file_path"),
                "location": str(f.get("line_number")) if f.get("line_number") is not None else None,
                "message": (f.get("title", "") + " — " + f.get("description", "")).strip(" —"),
                "snippet": f.get("snippet"),
                "scanner_source": source,
            }
        )
    return out


# ---- Cisco MCP Scanner ------------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §4
# Live engines:  mcp-scanner --format raw --analyzers yara[,llm][,api] <mode> …
#   remote → remote --server-url <url>
#   local  → stdio --stdio-command … --stdio-arg …
# Source tier: mcp-scanner --format raw behavioral <workdir>  (needs LLM key)

_MCP_ANALYZER_LABEL = {
    "yara_analyzer": "Cisco MCP Scanner: YARA",
    "llm_analyzer": "Cisco MCP Scanner: LLM-judge",
    "api_analyzer": "Cisco MCP Scanner: AI Defense",
    "behavioral_analyzer": "Cisco MCP Scanner: Behavioral Code Scanning",
}

_MCP_LIVE_KEYS = ("yara_analyzer", "llm_analyzer", "api_analyzer")


def _has_workdir_source(workdir):
    return os.path.isdir(workdir) and any(os.scandir(workdir))


def _mcp_live_analyzers():
    analyzers = ["yara"]
    if os.environ.get("MCP_SCANNER_LLM_API_KEY"):
        analyzers.append("llm")
    if os.environ.get("MCP_SCANNER_API_KEY") and os.environ.get("MCP_SCANNER_ENDPOINT"):
        analyzers.append("api")
    return analyzers


def _mcp_stdio_mode_args(workdir):
    """Return stdio subcommand argv for a local MCP server tree, or None."""
    run_sh = os.path.join(workdir, "run.sh")
    if os.path.isfile(run_sh):
        return ["stdio", "--stdio-command", "bash", "--stdio-arg", run_sh]
    for name, cmd in (
        ("server.py", "python"),
        ("main.py", "python"),
        ("server.js", "node"),
        ("index.js", "node"),
    ):
        path = os.path.join(workdir, name)
        if os.path.isfile(path):
            return ["stdio", "--stdio-command", cmd, "--stdio-arg", path]
    return None


def _mcp_mode_args(workdir, target):
    """Pick remote vs stdio mode. Prefer stdio when the sandbox has source on disk."""
    has_source = _has_workdir_source(workdir)
    if isinstance(target, str) and target.startswith(("http://", "https://")) and not has_source:
        return ["remote", "--server-url", target]
    return _mcp_stdio_mode_args(workdir)


def build_mcp_live_cmd(analyzers, mode_args):
    """Global flags before mode — required by mcp-scanner argparse."""
    return [
        "mcp-scanner",
        "--log-level",
        "error",
        "--format",
        "raw",
        "--analyzers",
        ",".join(analyzers),
        *mode_args,
    ]


def build_mcp_behavioral_cmd(workdir):
    return [
        "mcp-scanner",
        "--log-level",
        "error",
        "--format",
        "raw",
        "behavioral",
        workdir,
    ]


def _normalize_analyzer_key(name):
    if not name:
        return name
    return name if name.endswith("_analyzer") else f"{name}_analyzer"


def _taxonomy_category(entry):
    tax = entry.get("mcp_taxonomies") or []
    if not tax:
        return "unknown"
    first = tax[0]
    if isinstance(first, dict):
        return first.get("scanner_category") or "unknown"
    if isinstance(first, str):
        return first
    return "unknown"


def _map_mcp_envelope(envelope, analyzers_fallback):
    findings, checks = [], {}
    for result in envelope.get("scan_results", []) or []:
        entity_kind = result.get("item_type")
        entity_name = (
            result.get("tool_name") or result.get("prompt_name") or result.get("resource_uri")
        )
        for analyzer_key, entry in (result.get("findings") or {}).items():
            if not isinstance(entry, dict):
                continue
            key = _normalize_analyzer_key(analyzer_key)
            checks[key] = checks.get(key, 0) + 1
            severity = _collapse_severity(entry.get("severity"))
            if severity is None:  # SAFE — no finding row
                continue
            findings.append(
                {
                    "severity": severity,
                    "category": _taxonomy_category(entry),
                    "entity_kind": entity_kind,
                    "entity_name": entity_name,
                    "message": entry.get("threat_summary")
                    or ", ".join(entry.get("threat_names", []))
                    or "flagged",
                    "scanner_source": _MCP_ANALYZER_LABEL.get(key, key),
                }
            )

    raw_requested = envelope.get("requested_analyzers") or analyzers_fallback
    requested = [_normalize_analyzer_key(a) for a in raw_requested]
    rows = []
    for key in requested:
        if key not in _MCP_ANALYZER_LABEL:
            continue
        source = _MCP_ANALYZER_LABEL[key]
        scanner_findings = [f for f in findings if f.get("scanner_source") == source]
        rows.append(_completed(source, checks.get(key, 1), scanner_findings))
    return findings, rows, requested


def run_cisco_mcp_scanner(workdir, target):
    if not _which("mcp-scanner"):
        return [], [
            _unreachable(
                _MCP_ANALYZER_LABEL["yara_analyzer"],
                "mcp-scanner not installed in image",
            )
        ]

    findings, rows = [], []
    live = _mcp_live_analyzers()
    has_source = _has_workdir_source(workdir)
    mode_args = _mcp_mode_args(workdir, target)

    if mode_args is None:
        detail = (
            "no mcp-scanner mode: need remote --server-url or stdio launch "
            "(run.sh / server.py / main.py / server.js / index.js in workdir)"
        )
        for name in live:
            rows.append(_unreachable(_MCP_ANALYZER_LABEL[_normalize_analyzer_key(name)], detail))
    else:
        code, out, err = _run(build_mcp_live_cmd(live, mode_args))
        console = _build_console(out, err)
        if code != 0:
            for name in live:
                rows.append(
                    _unreachable(
                        _MCP_ANALYZER_LABEL[_normalize_analyzer_key(name)],
                        err,
                        console_output=console,
                    )
                )
        else:
            envelope = _safe_json(out)
            if not isinstance(envelope, dict) or not isinstance(envelope.get("scan_results"), list):
                for name in live:
                    rows.append(
                        _unreachable(
                            _MCP_ANALYZER_LABEL[_normalize_analyzer_key(name)],
                            "scanner returned no parseable scan_results",
                            console_output=console,
                        )
                    )
            else:
                f, r, _requested = _map_mcp_envelope(envelope, live)
                for row in r:
                    row["console_output"] = console
                findings += f
                rows += r

    reported = {row["scanner_source"] for row in rows}
    for key in _MCP_LIVE_KEYS:
        label = _MCP_ANALYZER_LABEL[key]
        if label not in reported:
            rows.append(_skipped(label))

    beh_label = _MCP_ANALYZER_LABEL["behavioral_analyzer"]
    if not has_source:
        rows.append(_skipped(beh_label, "not_applicable"))
    elif not os.environ.get("MCP_SCANNER_LLM_API_KEY"):
        rows.append(_skipped(beh_label))
    else:
        code, out, err = _run(build_mcp_behavioral_cmd(workdir))
        beh_console = _build_console(out, err)
        if code != 0:
            rows.append(_unreachable(beh_label, err, console_output=beh_console))
        else:
            envelope = _safe_json(out)
            if not isinstance(envelope, dict) or not isinstance(envelope.get("scan_results"), list):
                rows.append(
                    _unreachable(
                        beh_label,
                        "scanner returned no parseable scan_results",
                        console_output=beh_console,
                    )
                )
            else:
                if not envelope.get("requested_analyzers"):
                    envelope = {**envelope, "requested_analyzers": ["behavioral"]}
                f, r, _ = _map_mcp_envelope(envelope, ["behavioral"])
                findings += f
                beh_rows = [row for row in r if row["scanner_source"] == beh_label]
                for row in beh_rows:
                    row["console_output"] = beh_console
                rows += beh_rows or [_completed(beh_label, 1, [], console_output=beh_console)]

    return findings, rows


# ---- Snyk Agent Scan ---------------------------------------------------------
# docs/research/adapters/scanner-output-adapters.md §2
# Prefer image-preinstalled `snyk-agent-scan` (uv tool install); fall back to uvx.


def _snyk_cmd(workdir, item_type):
    # --ci always requires --dangerously-run-mcp-servers (Snyk Agent Scan policy).
    # Skills additionally need --skills so the path is treated as SKILL.md, not MCP config.
    flags = ["--ci", "--dangerously-run-mcp-servers", "--json", workdir]
    if item_type == "skill":
        flags = ["--ci", "--dangerously-run-mcp-servers", "--skills", "--json", workdir]
    if _which("snyk-agent-scan"):
        return ["snyk-agent-scan", *flags]
    if _which("uvx"):
        return ["uvx", "snyk-agent-scan@latest", *flags]
    return None


def run_snyk(workdir, item_type="mcp_server"):
    source = "Snyk"
    if not os.environ.get("SNYK_TOKEN"):
        return [], [_skipped(source)]
    cmd = _snyk_cmd(workdir, item_type)
    if cmd is None:
        return [], [
            _unreachable(source, "snyk-agent-scan not installed and uvx missing from image")
        ]

    code, out, err = _run(cmd)
    console = _build_console(out, err)
    root = _safe_json(out) or _safe_json(err) or {}
    if not isinstance(root, dict) or not root:
        return [], [_unreachable(source, err or out or f"exit {code}", console_output=console)]

    findings, checks = [], 0
    collected_errors = []
    for _abs_path, path_result in root.items():
        if not isinstance(path_result, dict):
            continue
        path_errs = _snyk_collect_errors(path_result)
        if path_errs:
            collected_errors.extend(path_errs)
        for issue in path_result.get("issues", []) or []:
            checks += 1
            code_ = issue.get("code", "")
            severity = (
                "red" if code_.startswith("E") else ("amber" if code_.startswith("W") else None)
            )
            if severity is None:
                continue
            findings.append(
                {
                    "severity": severity,
                    "category": _SNYK_CODE_CATEGORY.get(code_, "unknown"),
                    "message": issue.get("message"),
                    "scanner_source": source,
                }
            )

    if collected_errors:
        detail = "; ".join(_snyk_error_message(e) for e in collected_errors)
        auth_only = all(_snyk_error_is_auth(e) for e in collected_errors) and not findings
        if auth_only:
            return [], [_skipped(source, detail=detail, console_output=console)]
        return findings, [_unreachable(source, detail, console_output=console)]
    if findings or checks:
        return findings, [_completed(source, checks or 1, findings, console_output=console)]
    return findings, [
        _unreachable(
            source,
            err or out or f"exit {code}",
            console_output=console,
        )
    ]


# ---- Tessl (skills quality axis only, never findings) -----------------------


def _tessl_quality_score(parsed):
    """Extract Tessl quality score (0–100) from current CLI --json shape."""
    if not isinstance(parsed, dict):
        return None
    if isinstance(parsed.get("score"), int | float):
        return parsed["score"]
    review = parsed.get("review")
    if isinstance(review, dict) and isinstance(review.get("reviewScore"), int | float):
        return review["reviewScore"]
    scores = []
    for key in ("descriptionJudge", "contentJudge"):
        node = parsed.get(key)
        if isinstance(node, dict) and isinstance(node.get("normalizedScore"), int | float):
            scores.append(float(node["normalizedScore"]) * 100.0)
    if scores:
        return sum(scores) / len(scores)
    return None


def run_tessl(workdir):
    if not os.environ.get("TESSL_TOKEN"):
        return None, [_skipped("Tessl")]
    if not _which("npx"):
        return None, [_unreachable("Tessl", "npx not available (node/npm missing from image)")]
    code, out, err = _run(["npx", "--yes", "tessl@latest", "skill", "review", "--json", workdir])
    console = _build_console(out, err)
    if code != 0:
        return None, [_unreachable("Tessl", err or out, console_output=console)]
    parsed = _safe_json(out)
    score = _tessl_quality_score(parsed)
    if score is None:
        return None, [
            _unreachable(
                "Tessl",
                "scanner returned no parseable quality score",
                console_output=console,
            )
        ]
    detail = f"quality_score = {score}"
    row = {"scanner_source": "Tessl", "status": "completed", "checks_run": 1, "detail": detail}
    if console:
        row["console_output"] = console
    return score, [row]


def _collapse_severity(raw):
    if not raw:
        return None
    r = raw.upper()
    if r in ("CRITICAL", "HIGH"):
        return "red"
    # MEDIUM and LOW are actionable vulns → amber. INFO soft-findings → green.
    # Aggregate "green" (no vuln) is absence of red/amber findings, not a LOW row.
    if r in ("MEDIUM", "LOW"):
        return "amber"
    if r in ("INFO", "INFORMATIONAL"):
        return "green"
    return None  # SAFE / empty — no finding row


SKILL_SCANNER_SOURCES = [
    "Cisco Skill Scanner: static/bytecode/pipeline",
    "Cisco Skill Scanner: LLM-judge",
    "Cisco Skill Scanner: AI Defense",
]

MCP_SCANNER_SOURCES = list(_MCP_ANALYZER_LABEL.values())

TESSL_SOURCES = ["Tessl"]
SNYK_SOURCES = ["Snyk"]


def run_all_scanners(workdir, item_type, target, on_scanner_done=None, on_scanner_start=None):
    """Run all applicable scanners, optionally relaying results incrementally.

    When *on_scanner_start* is provided it is called before each scanner group
    with the list of scanner_source names about to run.  This lets the caller
    insert ``status='running'`` placeholder rows so the dashboard has something
    to display immediately (within one poll cycle).

    When *on_scanner_done* is provided it is called after each scanner group
    finishes with ``(findings, scanner_rows, quality_score)``.  This lets the
    caller (scan_app) persist rows/findings to Supabase as they arrive so the
    dashboard shows progress scanner-by-scanner.
    """
    findings, scanner_rows = [], []
    quality_score = None

    def _relay(f, r, qs=None):
        if on_scanner_done:
            on_scanner_done(f, r, qs)

    def _signal_start(sources):
        if on_scanner_start:
            on_scanner_start(sources)

    if item_type == "skill":
        _signal_start(SKILL_SCANNER_SOURCES)
        f, r = run_cisco_skill_scanner(workdir)
        findings += f
        scanner_rows += r
        _relay(f, r)
        _signal_start(TESSL_SOURCES)
        qs, r = run_tessl(workdir)
        if qs is not None:
            quality_score = qs
        scanner_rows += r
        _relay([], r, qs)
    else:
        _signal_start(MCP_SCANNER_SOURCES)
        f, r = run_cisco_mcp_scanner(workdir, target)
        findings += f
        scanner_rows += r
        _relay(f, r)

    _signal_start(SNYK_SOURCES)
    f, r = run_snyk(workdir, item_type)
    findings += f
    scanner_rows += r
    _relay(f, r)

    any_unreachable = any(row["status"] == "unreachable" for row in scanner_rows)
    overall_status = "partial-failed" if any_unreachable else "complete"

    return {
        "findings": findings,
        "scanner_rows": scanner_rows,
        "quality_score": quality_score,
        "overall_status": overall_status,
    }
