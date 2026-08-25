---
name: tw-verify
description: Check the Tripwire scan status of Claude Code skills and MCP servers by name. Use when the user runs /tw-verify, or asks whether a skill or MCP server has been scanned by Tripwire, what its RAG (red/amber/green) rating is, whether a scan is stale, or whether a call to it would be blocked.
---

# tw-verify

Report the Tripwire scan status of one or more skills / MCP servers. Single pass over ALL requested names — never stop at the first problem; every requested name gets a row in the Scan Status table. Columns follow the Frontline dual-output contract ([frontline-output-contract.md](../../../docs/user-guide/frontline-output-contract.md)): **Name | Type | Status | Quality | Note**, with Tessl Quality as **`N/100`** when `items.quality_score` is present (else `—`), and the shared blocked phrase once as a **table footer**. Shared helpers: `guard.verify.verify_artifacts` / `format_quality_cell`. Read-only: this skill never submits scans itself (it only offers to, at the end). Do **not** dump the driver's raw JSON (or any fenced `{config, artifacts}` block) to the user — that payload is for you to parse only.

**Hard rule — unscanned/blocked artifacts must not be executed.** If a row is `unscanned` (including errored), `stale`, `changed`, RED (or amber at threshold), or NOT FOUND: do **not** invoke that skill (`Skill` tool), do **not** call its `mcp__*` tools, and do **not** run its `install.sh` / scripts via Bash. Report that Tripwire will block those calls. Only offer `/tw-scan` via AskUserQuestion — never silently submit, and never “work around” a block by scanning so you can run the artifact in the same turn.

## Step 1 — Parse arguments

Names are space- OR comma-separated (e.g. `/tw-verify safe-skill, vuln-tool other-skill`). Split on both, drop empty tokens. If no names were given, ask the user (AskUserQuestion) which skill/MCP names to verify.

## Step 2 — Read Tripwire config

Read `~/.tripwire/config.json` (JSON). You need: `enable`, `scan_validity_days`, `repo_root`, `env_file`, `uv_bin` (and `cli_bin` if a scan is later requested). If the file is missing or unparseable, tell the user Tripwire config is missing/corrupt (the enforcement hook treats this as tampering and denies) and that `tripwire setup-agent-hooks` restores it — then stop; there is no way to query status without it.

## Step 3 — Resolve each name (deterministic — do NOT hand-search loci)

**Hard rule:** never browse `~/.claude/skills`, `.mcp.json`, or `demo-mcp.json` yourself to decide NOT FOUND. Agents miss `~/.tripwire/demo-mcp.json` and emit false negatives for `safe-tool` / `vuln-tool`. Always run this resolve driver once with every requested name:

```bash
cd "<repo_root>" && set -a && source "<env_file>" && set +a && "<uv_bin>" run --extra guard python -c '
import json, os, sys
from guard.entry import resolve_operator_name
cwd = os.getcwd()
out = []
for name in sys.argv[1:]:
    r = resolve_operator_name(name, cwd)
    if r is None:
        out.append({"name": name, "found": False})
    else:
        out.append({"name": name, "found": True, **r})
print(json.dumps({"resolutions": out}))
' <name-1> <name-2> ...
```

Parse the JSON privately. For each entry:

- `found=false` → ❓ NOT FOUND row (do not call the status driver for that name). Note: no match in hook loci (`~/.claude/skills`, `.claude/skills`, `.mcp.json`, `~/.claude.json` incl. `projects["<cwd>"]`, `~/.tripwire/demo-mcp.json`, fixtures MCP manifest) — do **not** repeat the blocked phrase in the Note (it goes in the table footer). Tip: demo skills are `safe-skill` / `vuln-skill` / `amber-skill`; demo MCP keys are `safe-tool` / `vuln-tool` / `amber-tool` (fixture names like `vuln-runtime-download` alias to those when demos are installed).
- `found=true` → use `identifier` (and `kind`) for Step 4. If `alias_of` is set, the Name column still shows the user’s requested name; optionally append `(as <resolved_as>)` in the Note.

An absolute path the user passed that exists as a skill directory is resolved by the driver — do not invent your own path logic.

## Step 4 — Query status (shared status procedure)

Run the deterministic status driver ONCE with all **found** identifiers as arguments. Substitute `<repo_root>`, `<env_file>`, `<uv_bin>` from config. Do not improvise your own Supabase queries — use exactly this driver:

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
    item = s.get("item") or {}
    q = item.get("quality_score")
    quality_score = float(q) if isinstance(q, (int, float)) else None
    rows.append({
        "identifier": ident,
        "state": state,
        "rag": rag,
        "scanned_at": s.get("scanned_at"),
        "stale": state == "stale",
        "errored": item.get("heatmap_status") == "error",
        "changed": changed,
        "will_be_blocked": blocked,
        "quality_score": quality_score,
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

The driver prints one JSON object `{config, artifacts}` — parse it privately; never paste it into the user-facing reply. Each artifact includes nullable `quality_score` (0–100 from `items.quality_score`); human render owns the `/100` display. NOT FOUND names never reach the driver (they get rows anyway, `quality_score` null). If the driver itself fails, report the failure and still render every row (status "unknown — status query failed"), never a partial silent result.

## Step 5 — Render the human-readable table

One Markdown table, one row per REQUESTED name (selection rows count individually), all in a single pass. Fixed columns: **Name | Type | Status | Quality | Note**. Use exactly these states, emoji, and labels (N = `scan_validity_days`). Quality cell: **`N/100`** when `quality_score` is a number for a skill (Tessl skill-review, 0–100, higher better); otherwise `—` (MCP, unscanned, scanning, not-found, null, or missing). Never a bare integer or `Q N` alone.

| Name | Type | Status | Quality | Note |
|------|------|--------|---------|------|
| `safe-skill` | skill | 🟢 GREEN (fresh) | 91/100 | — |
| `vuln-skill` | skill | 🔴 RED | 12/100 | rated red — at/above threshold |
| `safe-tool` | mcp | 🟠 AMBER | — | Reported but not blocked at current threshold |
| `unknown-skill` | — | ❓ NOT FOUND | — | no match in ~/.claude/skills, .claude/skills, .mcp.json, ~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest |
| `old-skill` | skill | ⚠️ STALE | 80/100 | Last scanned >14 days ago — blocked until rescanned (run /tw-scan old-skill) |
| `pending-skill` | skill | ⏳ SCANNING | — | Scan in progress — check back shortly |
| `new-skill` | skill | 🚫 UNSCANNED | — | Never scanned — offer /tw-scan new-skill |
| `edited-skill` | skill | ✏️ CHANGED | 70/100 | **content changed since last scan — run /tw-scan edited-skill** |

**Blocked footer (de-dupe):** If **any** row has `will_be_blocked=true` (including NOT FOUND / RED / STALE / UNSCANNED / CHANGED / amber-at-threshold), print **once** under the table:

**Will be blocked when Tripwire is enabled**

Do **not** repeat that phrase in every Note. Row Notes keep *distinct* copy only.

Row rules (map driver output → row):

- `changed=true` → `✏️ CHANGED` — this row takes precedence over every state-based row (the hook's tamper deny fires regardless of a green verdict); note is the bold **content changed since last scan — run /tw-scan <name>**, and `will_be_blocked` is `true`.
- `state=fresh, rag=green` → `🟢 GREEN (fresh)`, note `—`.
- `state=fresh, rag=amber` → `🟠 AMBER`; note `Reported but not blocked at current threshold` when `threshold` is `red`, else note `amber at/above threshold` and `will_be_blocked=true` (footer covers the blocked sentence).
- `state=fresh, rag=red` → `🔴 RED`; note `rated red — at/above threshold` (blocked sentence is footer-only).
- `state=stale` → `⚠️ STALE`; note `Last scanned >N days ago — blocked until rescanned (run /tw-scan <name>)`.
- `state=scanning` → `⏳ SCANNING`; note `Scan in progress — check back shortly`; if `rag` is non-null append `(prior verdict: <rag>)`.
- `state=unscanned, errored=false` → `🚫 UNSCANNED`; note `Never scanned — offer /tw-scan <name>`.
- `state=unscanned, errored=true` → `🚫 UNSCANNED`; note `Last scan errored — resubmit (run /tw-scan <name>)`.
- unresolved name → `❓ NOT FOUND`; note `no match in ~/.claude/skills, .claude/skills, .mcp.json, ~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest`. Fail-closed: the hook denies any Skill/mcp__* call it cannot resolve to a known locus (same as unscanned); `will_be_blocked=true` → footer.

The `run /tw-scan <name>` remedy in the STALE, errored, and CHANGED notes actually works because tw-scan always submits with `--force` — without force the CLI would skip unchanged content and a stale/errored state could never clear.

After the table (and after the blocked footer when present):

- If config `enabled` is `false`, add: `Note: Tripwire enforcement is currently DISABLED (/tw-disable) — the blocked footer reports what enforcement would do when enabled; calls are currently bypassed.`
- If `monitoring_enabled` is `false` while local `enable` is `true`, add a warning that the Supabase platform switch (`config.monitoring_enabled`) is OFF and still gates the guard — effective enforcement is local enable AND platform switch.

## Step 6 — Offer scans for blocked-but-fixable rows

If any rows are `unscanned` (including errored), `stale`, or `changed`, offer to submit them for scanning (AskUserQuestion, listing the names). On yes: read and follow the tw-scan skill's procedure (installed at `~/.claude/skills/tw-scan/SKILL.md`) for exactly those names — its submission step always appends `--force`, which is what actually clears stale/errored/changed states (without force the CLI skips unchanged content and the state never clears) — then re-render the Scan Status table only (still no JSON dump) with those rows as ⏳ SCANNING. On no: finish.
