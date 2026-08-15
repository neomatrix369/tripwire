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
import re
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

# Path-like tokens in a Bash command that may point into a skills directory.
# Absolute, ~/…, ./…, ../…, or any token containing a slash / ending in a
# common script extension. Broad on purpose for token discovery; attribution
# itself is narrowed in ``_extract_bash_skill_target`` so a skill *directory*
# passed only as data (``/tw-verify`` / ``/tw-scan`` status drivers) is not
# gated — otherwise unscanned skills deadlock their own remediation path.
_BASH_PATH_TOKEN = (
    r"(?:~|/|\./|\.\./)[^\s;|&\"']+"
    r"|(?:[^\s;|&\"']+/)+[^\s;|&\"']+"
    r"|[^\s;|&\"']+\.(?:sh|py|js|mjs|ts|bash)"
)

# Shell-script invocation shapes: ``bash install.sh``, ``source ./x``, ``./run.sh``.
# Used with a skill-directory mention to catch ``cd <skill> && bash install.sh``.
_BASH_SCRIPT_EXEC = re.compile(
    r"(?:^|[\n;|&])\s*(?:bash|sh|zsh|dash|source|\.)\s+"
    r"|(?:^|[\n;|&])\s*\./[^\s;|&]+"
)


# ─── stdin payload → target artifact ─────────────────────────────────────────


def extract_target(payload: dict, *, cwd: str | None = None) -> dict | None:
    """Map a PreToolUse payload to ``{"kind": "skill"|"mcp", "name": str}``.

    Returns None for tools outside the enforcement set, for ordinary Bash
    that does not touch a skills path, and for Skill payloads whose input
    carries no recognizable name (the caller denies that Skill case — the
    tool *was* matched, so an unresolvable shape must fail closed).

    Bash is attributed when the command *executes* under
    ``~/.claude/skills/<name>/`` or ``<project>/.claude/skills/<name>/``
    (cwd inside the skill, a file under it, or ``cd <skill> && bash …``) —
    closing the slash-command gap where ``/vuln-skill`` injects instructions
    and the agent runs ``install.sh`` via Bash without a Skill tool event.
    Skill directories passed only as data arguments are not attributed.
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
    if tool_name == "Bash":
        return _extract_bash_skill_target(payload, cwd if cwd is not None else os.getcwd())
    if tool_name.startswith("mcp__"):
        # mcp__<server>__<tool>; server names may themselves contain "__",
        # so strip only the trailing tool segment.
        server = tool_name[len("mcp__") :].rsplit("__", 1)[0]
        if server:
            return {"kind": "mcp", "name": server}
        return None
    return None


def _payload_cwd(payload: dict, fallback: str) -> str:
    raw = payload.get("cwd")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return fallback


def _bash_path_tokens(command: str) -> list[str]:
    return re.findall(_BASH_PATH_TOKEN, command)


def _skill_name_for_resolved_path(resolved: str, cwd: str) -> str | None:
    """If ``resolved`` lies under a skills root, return the skill dir basename."""
    for root in _skill_roots(cwd):
        if not os.path.isdir(root):
            continue
        root_resolved = os.path.realpath(root)
        try:
            if os.path.commonpath([root_resolved, resolved]) != root_resolved:
                continue
        except ValueError:
            continue
        rel = os.path.relpath(resolved, root_resolved)
        parts = [p for p in rel.split(os.sep) if p and p not in (".",)]
        if not parts or parts[0] == "..":
            continue
        skill_name = parts[0]
        skill_dir = os.path.join(root_resolved, skill_name)
        if os.path.isdir(skill_dir):
            return skill_name
    return None


def _resolve_candidate_path(token: str, cwd: str) -> str | None:
    """Expand ``token`` relative to cwd / ``~`` and realpath it when possible."""
    expanded = os.path.expanduser(token)
    if not os.path.isabs(expanded):
        expanded = os.path.join(cwd, expanded)
    try:
        return os.path.realpath(expanded)
    except OSError:
        return None


def _extract_bash_skill_target(payload: dict, cwd: str) -> dict | None:
    """Attribute Bash to a skill only when the command *executes* under it.

    Gated shapes (unscanned/RED ⇒ deny):
    - payload cwd inside a skill directory
    - a *file* under a skill directory is referenced (e.g. ``…/install.sh``)
    - a skill directory is named and the command invokes a shell script
      (``cd …/vuln-skill && bash install.sh``)

    Not gated: skill directories passed only as data args (status/scan drivers).
    """
    tool_input = payload.get("tool_input")
    command = ""
    if isinstance(tool_input, dict):
        raw_cmd = tool_input.get("command")
        if isinstance(raw_cmd, str):
            command = raw_cmd

    effective_cwd = _payload_cwd(payload, cwd)
    cwd_resolved = _resolve_candidate_path(effective_cwd, effective_cwd)
    if cwd_resolved is not None:
        cwd_skill = _skill_name_for_resolved_path(cwd_resolved, effective_cwd)
        if cwd_skill:
            return {"kind": "skill", "name": cwd_skill}

    skill_dirs_mentioned: list[str] = []
    for token in _bash_path_tokens(command):
        resolved = _resolve_candidate_path(token, effective_cwd)
        if resolved is None:
            continue
        name = _skill_name_for_resolved_path(resolved, effective_cwd)
        if not name:
            continue
        if os.path.isfile(resolved):
            return {"kind": "skill", "name": name}
        skill_dirs_mentioned.append(name)

    if skill_dirs_mentioned and _BASH_SCRIPT_EXEC.search(command):
        return {"kind": "skill", "name": skill_dirs_mentioned[0]}
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


# Fixture basename → demo install name (scripts/install-demo-artifacts.sh).
# Used only by /tw-verify and /tw-scan operator resolution — the PreToolUse
# hook never sees fixture names (Claude registers the rewritten demo name).
_OPERATOR_ALIASES = {
    "vuln-runtime-download": "vuln-skill",
    "safe-changelog-writer": "safe-skill",
    "disagreement-naive-domain-check": "amber-skill",
}


def resolve_operator_name(name: str, cwd: str) -> dict[str, str] | None:
    """Resolve a /tw-verify or /tw-scan name the same way the hook would.

    Order: explicit path with ``SKILL.md`` → skill locus → MCP config key
    (incl. ``~/.tripwire/demo-mcp.json``) → demo fixture alias. Returns
    ``{"identifier", "kind"}`` plus optional ``resolved_as`` / ``alias_of``,
    or ``None`` when nothing matches (caller reports NOT FOUND).
    """
    if not isinstance(name, str):
        return None
    token = name.strip()
    if not token:
        return None

    # Explicit path (absolute or containing a separator) → skill dir if present.
    if (
        os.path.isabs(token)
        or (os.path.sep in token)
        or (os.path.altsep and os.path.altsep in token)
    ):
        candidate = token if os.path.isabs(token) else os.path.join(cwd, token)
        if os.path.isdir(candidate) and os.path.isfile(os.path.join(candidate, "SKILL.md")):
            return {
                "identifier": os.path.realpath(candidate),
                "kind": "skill",
                "resolved_as": token,
            }

    skill = _resolve_skill(token, cwd)
    if skill is not None:
        return {"identifier": skill, "kind": "skill", "resolved_as": token}

    mcp = _resolve_mcp_server(token, cwd)
    if mcp is not None:
        return {"identifier": mcp, "kind": "mcp", "resolved_as": token}

    alias = _OPERATOR_ALIASES.get(token)
    if alias and alias != token:
        skill = _resolve_skill(alias, cwd)
        if skill is not None:
            return {
                "identifier": skill,
                "kind": "skill",
                "resolved_as": alias,
                "alias_of": token,
            }
        mcp = _resolve_mcp_server(alias, cwd)
        if mcp is not None:
            return {
                "identifier": mcp,
                "kind": "mcp",
                "resolved_as": alias,
                "alias_of": token,
            }
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
    enforced = tool_name == "Skill" or tool_name == "Bash" or tool_name.startswith("mcp__")
    if not enforced:
        # Matcher should only route Skill|Bash|mcp__* here; anything else is a
        # misconfiguration — allowing avoids bricking ordinary tools.
        return {"allow": True, "reason": f"tool '{tool_name}' not subject to tripwire guard"}

    target = extract_target(payload, cwd=cwd)
    if target is None:
        if tool_name == "Bash":
            # Ordinary Bash (no skills-path touch) is not gated.
            return {
                "allow": True,
                "reason": "bash command does not reference a tripwire-scanned skill path",
            }
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
            payload_cwd = payload.get("cwd")
            decision = decide(
                payload,
                config,
                cwd=payload_cwd if isinstance(payload_cwd, str) and payload_cwd.strip() else None,
            )
    except Exception:
        decision = {"allow": False, "reason": _GUARD_ERROR_REASON}
    print(json.dumps(format_decision(decision)), file=stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
