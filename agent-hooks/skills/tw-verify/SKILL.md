---
name: tw-verify
description: Check the Tripwire scan status of Claude Code skills and MCP servers by name. Use when the user runs /tw-verify, or asks whether a skill or MCP server has been scanned by Tripwire, what its RAG (red/amber/green) rating is, whether a scan is stale, or whether a call to it would be blocked.
---

# tw-verify

Report the Tripwire scan status of one or more skills / MCP servers. Single pass over ALL requested names — never stop at the first problem; every requested name gets a row in both outputs. Read-only: this skill never submits scans itself (it only offers to, at the end).

## Step 1 — Parse arguments

Names are space- OR comma-separated (e.g. `/tw-verify safe-skill, vuln-tool other-skill`). Split on both, drop empty tokens. If no names were given, ask the user (AskUserQuestion) which skill/MCP names to verify.

## Step 2 — Read Tripwire config

Read `~/.tripwire/config.json` (JSON). You need: `enable`, `scan_validity_days`, `repo_root`, `env_file`, `uv_bin` (and `cli_bin` if a scan is later requested). If the file is missing or unparseable, tell the user Tripwire config is missing/corrupt (the enforcement hook treats this as tampering and denies) and that `tripwire setup-agent-hooks` restores it — then stop; there is no way to query status without it.

## Step 3 — Resolve each name to an artifact (shared resolution procedure)

For EACH requested name, search these candidate loci:

- **Skills — user scope**: every directory under `~/.claude/skills/`. A directory matches if its basename equals the name OR its `SKILL.md` frontmatter `name:` equals the name (they can differ — check both).
- **Skills — project scope**: every directory under `./.claude/skills/` (relative to the current working directory), same matching rule.
- **MCP servers**: config keys, searched in the same order as the enforcement hook: `./.mcp.json` (project scope), `~/.claude.json` (user scope — BOTH the top-level `mcpServers` object AND `projects["<cwd>"].mcpServers`), `~/.tripwire/demo-mcp.json` (demo manifest), `<repo_root>/fixtures/mcp/mcp_manifest.json` (fixtures manifest; `repo_root` from config). A key matches if it equals the name. Config-key resolution only — never derive a directory or path from the entry's `command`/`args`.

Then canonicalize:

- Skill match → identifier is the **canonical absolute path** of the skill directory: `realpath` with symlinks resolved, no trailing slash.
- MCP match → identifier is **the config key string itself, always** (key-only identity: an MCP server's identity is its config key, never a path derived from `command`/`args`). Known accepted consequence: MCP items store `content_hash` `pending:<key>`, so MCP verdicts carry no content binding, and same-named keys in different projects share one identity row — this matches the plan §5.4 manifest-only rule, now uniform for all MCP servers.

Outcomes per name:

- **No match** → a friendly per-name miss report (becomes a ❓ NOT FOUND row): state the name, list the loci searched (`~/.claude/skills`, `./.claude/skills`, `./.mcp.json`, `~/.claude.json` (incl. `projects["<cwd>"]`), `~/.tripwire/demo-mcp.json`, `<repo_root>/fixtures/mcp/mcp_manifest.json`), and note that `/tw-scan <absolute-path>` works with an explicit path even when name resolution fails. Never a bare error.
- **Multiple matches** → present the list (path + type for each) via AskUserQuestion and let the user pick one or more; EACH selection proceeds as its own artifact row.
- **One match** → proceed with the identifier.

## Step 4 — Query status (shared status procedure)

Run the deterministic status driver ONCE with all resolved identifiers as arguments. Substitute `<repo_root>`, `<env_file>`, `<uv_bin>` from config. Do not improvise your own Supabase queries — use exactly this driver:

```bash
cd "<repo_root>" && set -a && source "<env_file>" && set +a && "<uv_bin>" run --extra guard python -c '
import json, os, sys

from guard.status import content_changed, get_item_status, make_client

cfg = json.load(open(os.path.expanduser("~/.tripwire/config.json"), encoding="utf-8"))
days = int(cfg.get("scan_validity_days", 14))
client = make_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
threshold = "red"
monitoring = True
rows = []
for ident in sys.argv[1:]:
    s = get_item_status(client, ident, days)
    threshold = s.get("threshold") or threshold
    monitoring = bool(s.get("monitoring_enabled", True))
    state = s["state"]
    rag = s.get("rag")
    # Tamper truthfulness: directory-resolved artifacts are re-hashed and
    # compared against the stored content hash, exactly like the hook. MCP
    # identifiers are bare keys, never paths (their pending:<key> hashes are
    # exempt inside content_changed anyway).
    changed = os.path.isdir(ident) and content_changed(ident, s.get("stored_content_hash"))
    if changed:
        blocked = True
    elif state == "fresh":
        blocked = rag == "red" or (rag == "amber" and threshold != "red")
    elif state == "scanning":
        blocked = not (rag == "green" or (rag == "amber" and threshold == "red"))
    else:
        blocked = True
    rows.append({
        "identifier": ident,
        "state": state,
        "rag": rag,
        "scanned_at": s.get("scanned_at"),
        "stale": state == "stale",
        "errored": (s.get("item") or {}).get("heatmap_status") == "error",
        "changed": changed,
        "will_be_blocked": blocked,
    })
print(json.dumps({
    "config": {
        "enabled": bool(cfg.get("enable", True)),
        "scan_validity_days": days,
        "threshold": threshold,
        "monitoring_enabled": monitoring,
    },
    "artifacts": rows,
}))
' <identifier-1> <identifier-2> ...
```

The driver prints one JSON object `{config, artifacts}`. NOT FOUND names never reach the driver (they get rows anyway). If the driver itself fails, report the failure and still render every row (status "unknown — status query failed"), never a partial silent result.

## Step 5 — Render the human-readable table

One Markdown table, one row per REQUESTED name (selection rows count individually), all in a single pass. Use exactly these states, emoji, and labels (N = `scan_validity_days`):

| Name | Type | Status | Note |
|------|------|--------|------|
| `safe-changelog-writer` | skill | 🟢 GREEN (fresh) | — |
| `vuln-runtime-download` | skill | 🔴 RED | **Will be blocked when Tripwire is enabled** |
| `vuln-command-injection-server` | mcp | 🟠 AMBER | Reported but not blocked at current threshold |
| `unknown-skill` | — | ❓ NOT FOUND | No match in ~/.claude/skills, .claude/skills, .mcp.json, ~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest |
| `old-skill` | skill | ⚠️ STALE | Last scanned >14 days ago — blocked until rescanned |
| `pending-skill` | skill | ⏳ SCANNING | Scan in progress — check back shortly |
| `new-skill` | skill | 🚫 UNSCANNED | Never scanned — blocked when Tripwire is enabled |
| `edited-skill` | skill | ✏️ CHANGED | **content changed since last scan — run /tw-scan <name>** |

Row rules (map driver output → row):

- `changed=true` → `✏️ CHANGED` — this row takes precedence over every state-based row (the hook's tamper deny fires regardless of a green verdict); note is the bold **content changed since last scan — run /tw-scan <name>**, and `will_be_blocked` is `true`.
- `state=fresh, rag=green` → `🟢 GREEN (fresh)`, note `—`.
- `state=fresh, rag=amber` → `🟠 AMBER`; note `Reported but not blocked at current threshold` when `threshold` is `red`, else **Will be blocked when Tripwire is enabled** (bold).
- `state=fresh, rag=red` → `🔴 RED`; note is ALWAYS the bold **Will be blocked when Tripwire is enabled** — never omitted, no exceptions.
- `state=stale` → `⚠️ STALE`; note `Last scanned >N days ago — blocked until rescanned (run /tw-scan <name>)`.
- `state=scanning` → `⏳ SCANNING`; note `Scan in progress — check back shortly`; if `rag` is non-null append `(prior verdict: <rag>)`.
- `state=unscanned, errored=false` → `🚫 UNSCANNED`; note `Never scanned — blocked when Tripwire is enabled`.
- `state=unscanned, errored=true` → `🚫 UNSCANNED`; note `Last scan errored — resubmit (run /tw-scan <name>)`.
- unresolved name → `❓ NOT FOUND`; note `No match in ~/.claude/skills, .claude/skills, .mcp.json, ~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest`.

The `run /tw-scan <name>` remedy in the STALE, errored, and CHANGED notes actually works because tw-scan always submits with `--force` — without force the CLI would skip unchanged content and a stale/errored state could never clear.

After the table:

- If config `enabled` is `false`, add: `Note: Tripwire enforcement is currently DISABLED (/tw-disable) — "will be blocked" reports what enforcement would do when enabled; calls are currently bypassed.`
- If `monitoring_enabled` is `false` while local `enable` is `true`, add a warning that the Supabase platform switch (`config.monitoring_enabled`) is OFF and still gates the guard — effective enforcement is local enable AND platform switch.

## Step 6 — Emit the machine-readable JSON

Immediately after the table, a fenced json block, same info (§6.3 shape):

```json
{
  "config": { "enabled": true, "scan_validity_days": 14, "threshold": "red" },
  "artifacts": [
    {
      "name": "vuln-runtime-download",
      "resolved_path": "/abs/path/to/skill",
      "type": "skill",
      "state": "fresh",
      "rag": "red",
      "scanned_at": "2026-08-01T10:00:00Z",
      "stale": false,
      "changed": false,
      "will_be_blocked": true,
      "note": "rated red — at/above threshold"
    }
  ]
}
```

Per row: `name` = requested name; `resolved_path` = identifier (null for NOT FOUND); `type` = `skill` / `mcp` (null for NOT FOUND); `state` = `fresh|stale|scanning|unscanned|not-found`; `rag` = driver rag for fresh states, null otherwise; `scanned_at`, `stale`, `changed`, `will_be_blocked` from the driver (NOT FOUND: `scanned_at` null, `changed` false, `will_be_blocked` null); `note` = the table's note text (unbolded). Both outputs always — table first, then JSON.

## Step 7 — Offer scans for blocked-but-fixable rows

If any rows are `unscanned` (including errored), `stale`, or `changed`, offer to submit them for scanning (AskUserQuestion, listing the names). On yes: read and follow the tw-scan skill's procedure (installed at `~/.claude/skills/tw-scan/SKILL.md`) for exactly those names — its submission step always appends `--force`, which is what actually clears stale/errored/changed states (without force the CLI skips unchanged content and the state never clears) — then re-render the table and JSON with those rows as ⏳ SCANNING. On no: finish.
