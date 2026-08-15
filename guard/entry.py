"""Claude Code PreToolUse hook entry (plan §4.3.3).

``main()`` reads the hook payload JSON on stdin, resolves the intercepted tool
call to a scanned artifact, asks the guard for a verdict
(``check_call_by_identifier``), prints exactly ONE decision JSON line in the
dual shape of §4.3.4, and ALWAYS exits 0 — in Claude Code a plain non-zero
exit is a *non-blocking* error (the call proceeds), so fail-closed means
"exit 0 with an explicit deny", never "crash" (§0.2).

The shell wrapper (~/.tripwire/hooks/pre-tool-use.sh) already gated on the
config ``enable`` flag; this module re-reads the config defensively — a
missing/corrupt config is a tamper signal and denies (§3).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, TextIO

from guard.guard_hook import check_call_by_identifier
from guard.status import DEFAULT_VALIDITY_DAYS

DEFAULT_CONFIG_PATH = "~/.tripwire/config.json"

# entry.py lives at <repo_root>/guard/entry.py; the demo MCP manifest ships in
# the repo, so derive its location from this file rather than hardcoding.
_REPO_ROOT = Path(__file__).resolve().parent.parent
_FIXTURES_MANIFEST = _REPO_ROOT / "fixtures" / "mcp" / "mcp_manifest.json"

_GUARD_ERROR_REASON = (
    "Tripwire guard error — fail closed. Remedies: /tw-disable in-session, "
    'or hand-edit ~/.tripwire/config.json to "enable": false.'
)
_CONFIG_TAMPER_REASON = (
    "Tripwire config missing/corrupt — re-run `tripwire setup-agent-hooks`, "
    'or set "enable": false in ~/.tripwire/config.json by hand to bypass.'
)

# Skill-name keys tried in order against tool_input.
# Empirically confirmed (2026-08-15, Claude Code 2.1.220, logging-stub probe):
# Skill calls arrive as tool_name "Skill" with tool_input {"skill": "<name>"},
# and mcp__<server>__<tool> server segments match mcpServers config keys.
# The trailing keys stay as defensive fallbacks for other harness versions.
_SKILL_NAME_KEYS = ("skill", "command", "name", "skillName")


# ─── stdin payload → target artifact ─────────────────────────────────────────


def extract_target(payload: dict) -> dict | None:
    """Map a PreToolUse payload to ``{"kind": "skill"|"mcp", "name": str}``.

    Returns None for tools outside the enforcement triad, and for Skill
    payloads whose input carries no recognizable name (the caller denies that
    case — the tool *was* matched, so an unresolvable shape must fail closed).
    """
    tool_name = str(payload.get("tool_name") or "")
    if tool_name == "Skill":
        tool_input = payload.get("tool_input")
        if not isinstance(tool_input, dict):
            return None
        for key in _SKILL_NAME_KEYS:
            value = tool_input.get(key)
            if isinstance(value, str) and value.strip():
                # A `command`-style value may carry args ("/tw-scan foo") —
                # the skill name is the first token, sans any slash prefix.
                name = value.strip().split()[0].lstrip("/")
                if name:
                    return {"kind": "skill", "name": name}
        return None
    if tool_name.startswith("mcp__"):
        # mcp__<server>__<tool>; server names may themselves contain "__",
        # so strip only the trailing tool segment.
        server = tool_name[len("mcp__") :].rsplit("__", 1)[0]
        if server:
            return {"kind": "mcp", "name": server}
        return None
    return None


# ─── target → items.identifier ───────────────────────────────────────────────


def _frontmatter_name(skill_md_path: str) -> str | None:
    """Read the ``name:`` field of a SKILL.md YAML frontmatter block."""
    try:
        with open(skill_md_path, encoding="utf-8", errors="replace") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return None
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith("name:"):
            return line[len("name:") :].strip().strip("'\"") or None
    return None


def _skill_roots(cwd: str) -> list[str]:
    return [
        os.path.expanduser(os.path.join("~", ".claude", "skills")),
        os.path.join(cwd, ".claude", "skills"),
    ]


def _safe_skill_name(name: str) -> bool:
    """A skill name must be a single path segment — anything that could climb
    out of the skills root (separators, '..' sequences) is rejected before it
    is ever joined onto a root (traversal defense, §5.1 curated-loci rule)."""
    if not name or name == ".":
        return False
    if ".." in name:
        return False
    seps = {"/", "\\", os.sep}
    if os.altsep:
        seps.add(os.altsep)
    return not any(sep in name for sep in seps)


def _contained_realpath(candidate: str, root: str) -> str | None:
    """realpath(candidate) iff it stays inside realpath(root), else None.

    Defense-in-depth behind ``_safe_skill_name``: even a well-formed name must
    not resolve (e.g. via symlink) to a directory outside the skills root —
    that would let an invocation borrow an unrelated artifact's verdict."""
    resolved = os.path.realpath(candidate)
    root_resolved = os.path.realpath(root)
    try:
        if os.path.commonpath([root_resolved, resolved]) != root_resolved:
            return None
    except ValueError:  # mixed absolute/relative or cross-drive paths
        return None
    return resolved


def _resolve_skill(name: str, cwd: str) -> str | None:
    if not _safe_skill_name(name):
        return None
    roots = _skill_roots(cwd)
    for root in roots:
        candidate = os.path.join(root, name)
        if os.path.isdir(candidate):
            resolved = _contained_realpath(candidate, root)
            if resolved is not None:
                return resolved
    # Directory-name miss: frontmatter `name:` can differ from the dir name
    # (§5.1) — scan each root's SKILL.md frontmatter.
    for root in roots:
        if not os.path.isdir(root):
            continue
        for entry_name in sorted(os.listdir(root)):
            skill_dir = os.path.join(root, entry_name)
            skill_md = os.path.join(skill_dir, "SKILL.md")
            if os.path.isfile(skill_md) and _frontmatter_name(skill_md) == name:
                resolved = _contained_realpath(skill_dir, root)
                if resolved is not None:
                    return resolved
    return None


def _read_json_object(path: str) -> dict[str, Any]:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _mcp_server_keys(config_path: str) -> set[str]:
    """Config keys of a ``{"mcpServers": {...}}`` file (empty on any error)."""
    servers = _read_json_object(config_path).get("mcpServers")
    return set(servers) if isinstance(servers, dict) else set()


def _claude_json_keys(config_path: str, cwd: str) -> set[str]:
    """MCP keys in ``~/.claude.json``: top-level ``mcpServers`` plus the
    per-project block ``projects[<cwd>].mcpServers`` for this cwd."""
    data = _read_json_object(config_path)
    keys: set[str] = set()
    servers = data.get("mcpServers")
    if isinstance(servers, dict):
        keys.update(servers)
    projects = data.get("projects")
    if isinstance(projects, dict):
        for project_dir in {cwd, os.path.realpath(cwd)}:
            project = projects.get(project_dir)
            if not isinstance(project, dict):
                continue
            project_servers = project.get("mcpServers")
            if isinstance(project_servers, dict):
                keys.update(project_servers)
    return keys


def _resolve_mcp_server(name: str, cwd: str) -> str | None:
    """An MCP server's identity is its CONFIG KEY — never a path derived from
    the entry's command/args. Those strings are attacker-controlled (any repo
    can ship a ``.mcp.json``), and deriving a filesystem identity from them
    fails OPEN: a crafted entry pointing an arg into an already-green-scanned
    directory would borrow that directory's verdict for a never-scanned
    server. The scan side stores the same bare key (discovery's manifest
    expansion emits ``items.identifier = <key>`` with content_hash
    ``pending:<key>``), so key-only lookup matches every scanned MCP row.

    Known accepted consequences (plan §5.4 manifest-only rule, now uniform
    for all MCP): same-named keys in different projects share one identity
    row, and MCP verdicts carry no content binding (``pending:`` hashes are
    exempt from the tamper check).

    Loci searched in order; unknown key ⇒ None (caller denies by name).
    """
    if name in _mcp_server_keys(os.path.join(cwd, ".mcp.json")):
        return name
    if name in _claude_json_keys(os.path.expanduser(os.path.join("~", ".claude.json")), cwd):
        return name
    if name in _mcp_server_keys(
        os.path.expanduser(os.path.join("~", ".tripwire", "demo-mcp.json"))
    ):
        return name
    if name in _mcp_server_keys(str(_FIXTURES_MANIFEST)):
        return name
    return None


def resolve_artifact(target: dict, cwd: str) -> str | None:
    """Resolve an extracted target to its ``items.identifier``.

    Skills → canonical realpath of the installed skill directory (contained
    in a skills root); MCP servers → the bare config key (key-only identity —
    see ``_resolve_mcp_server``). None when nothing matches (caller denies).
    """
    kind = target.get("kind")
    name = target.get("name")
    if not isinstance(name, str) or not name:
        return None
    if kind == "skill":
        return _resolve_skill(name, cwd)
    if kind == "mcp":
        return _resolve_mcp_server(name, cwd)
    return None


# ─── verdict → decision ──────────────────────────────────────────────────────


def _block_reason(core: str, name: str, config: dict) -> str:
    """Compose a §4.3.6 block reason: names the artifact, and always carries
    both in-session and out-of-band remedies (the in-session /tw-* skills are
    themselves enforced and may deadlock — the reason must never leave the
    user without an executable way out)."""
    cli_bin = str(config.get("cli_bin") or "<repo_root>/cli/bin/tripwire.js")
    return (
        f"Tripwire blocked this call: {core}. "
        f"Remedies — in-session: /tw-scan {name} to (re)scan, /tw-disable to switch "
        f"enforcement off; out-of-band: `node {cli_bin} scan <abs-path> --no-defaults` "
        'in a terminal, or hand-edit ~/.tripwire/config.json to "enable": false.'
    )


def decide(
    payload: dict,
    config: dict,
    *,
    cwd: str | None = None,
    check_fn: Any = None,
) -> dict[str, Any]:
    """Turn a hook payload + local config into ``{"allow": bool, "reason": str}``.

    ``check_fn`` is an injectable seam for tests (defaults to
    ``check_call_by_identifier``).
    """
    cwd = cwd if cwd is not None else os.getcwd()
    check = check_fn if check_fn is not None else check_call_by_identifier

    tool_name = str(payload.get("tool_name") or "")
    enforced = tool_name == "Skill" or tool_name.startswith("mcp__")
    if not enforced:
        # The matcher only routes Skill|mcp__* here; anything else is a
        # misconfiguration — allowing avoids bricking ordinary tools, and the
        # matcher (not this branch) is the enforcement boundary.
        return {"allow": True, "reason": f"tool '{tool_name}' not subject to tripwire guard"}

    target = extract_target(payload)
    if target is None:
        return {
            "allow": False,
            "reason": _block_reason(
                f"could not determine the artifact behind tool '{tool_name}' "
                "(unrecognized tool_input shape)",
                "<name>",
                config,
            ),
        }

    identifier = resolve_artifact(target, cwd)
    if identifier is None:
        kind_label = "skill" if target["kind"] == "skill" else "MCP server"
        return {
            "allow": False,
            "reason": _block_reason(
                f"{kind_label} '{target['name']}' not found in any known locus "
                "(~/.claude/skills, <project>/.claude/skills, .mcp.json, "
                "~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest)",
                target["name"],
                config,
            ),
        }

    # Skills resolve to a real directory and get the content-hash tamper
    # check. MCP identifiers are bare config keys: content_path is ALWAYS
    # None — never probe the key as a path (a key that happens to name a
    # local directory must not acquire a filesystem identity). MCP rows store
    # 'pending:<key>' hashes, which the tamper predicate already exempts.
    content_path = identifier if target["kind"] == "skill" else None
    validity_days = config.get("scan_validity_days", DEFAULT_VALIDITY_DAYS)
    result = check(identifier, validity_days, content_path=content_path)
    if result.get("allow"):
        return {"allow": True, "reason": str(result.get("reason") or "allowed")}
    return {
        "allow": False,
        "reason": _block_reason(
            f"{result.get('reason') or 'denied'} [{target['name']}]",
            target["name"],
            config,
        ),
    }


def format_decision(decision: dict[str, Any]) -> dict[str, Any]:
    """Dual-shape decision JSON (§4.3.4): modern hookSpecificOutput field wins
    on current Claude Code; legacy decision/reason kept for older versions."""
    if decision.get("allow"):
        return {
            "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow"},
            "decision": "approve",
        }
    reason = str(decision.get("reason") or _GUARD_ERROR_REASON)
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        },
        "decision": "block",
        "reason": reason,
    }


def _load_config(path: str) -> dict | None:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def main(*, stdin: TextIO | None = None, stdout: TextIO | None = None) -> int:
    """Hook entry: one decision JSON line on stdout, exit 0 — ALWAYS."""
    stdin = stdin if stdin is not None else sys.stdin
    stdout = stdout if stdout is not None else sys.stdout
    decision: dict[str, Any] = {"allow": False, "reason": _GUARD_ERROR_REASON}
    try:
        config_path = os.environ.get("TRIPWIRE_CONFIG") or os.path.expanduser(DEFAULT_CONFIG_PATH)
        config = _load_config(config_path)
        if config is None:
            # §3: the wrapper only runs because setup registered it, and setup
            # wrote config.json first — an unreadable config is tampering.
            decision = {"allow": False, "reason": _CONFIG_TAMPER_REASON}
        elif config.get("enable") is False:
            decision = {"allow": True, "reason": "tripwire enforcement disabled (enable=false)"}
        else:
            payload = json.loads(stdin.read() or "{}")
            if not isinstance(payload, dict):
                raise ValueError("hook payload is not a JSON object")
            decision = decide(payload, config)
    except Exception:
        decision = {"allow": False, "reason": _GUARD_ERROR_REASON}
    print(json.dumps(format_decision(decision)), file=stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
