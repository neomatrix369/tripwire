---
name: tw-scan
description: Submit Claude Code skills and MCP servers to Tripwire for security scanning. Use when the user runs /tw-scan, or asks to scan, rescan, or (re)submit a skill or MCP server to Tripwire — including force rescans of already-valid artifacts.
---

# tw-scan

Resolve names to artifacts and submit them to the Tripwire scanner. Single pass over ALL requested names — never stop at the first problem; every requested name gets a row in the report table. Do **not** dump the driver's raw JSON, the CLI result JSON, or any fenced `{config, artifacts}` block to the user — those payloads are for you to parse only.

**Hard rule — scanning ≠ executing.** Submitting a scan does **not** authorize running the artifact. After submit, artifacts stay blocked (`scanning` / prior verdict) until a completed green-below-threshold verdict exists. Never invoke `Skill` / `mcp__*` / skill `install.sh` for still-blocked targets in the same session “to try them now.”

## Step 1 — Parse arguments

Names are space- OR comma-separated. **Force**: both syntaxes work — a literal `--force` flag OR a bare `force` token anywhere in the argument list; strip either from the name list and set force mode. If no names remain, ask the user (AskUserQuestion) what to scan.

## Step 2 — Read Tripwire config

Read `~/.tripwire/config.json`: `scan_validity_days`, `repo_root`, `cli_bin`, `env_file`, `uv_bin`. If missing/unparseable, tell the user config is missing/corrupt and `tripwire setup-agent-hooks` restores it — then stop (submission needs `cli_bin`/`repo_root`).

## Step 3 — Resolve each name (deterministic — do NOT hand-search loci)

**Hard rule:** never browse skills/MCP loci yourself to decide NOT FOUND. Always run this resolve driver once with every requested name (same helper the PreToolUse hook uses, plus demo fixture aliases):

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

Parse privately:

- `found=false` → ❓ NOT FOUND row; tip that demo names are `safe-skill`/`vuln-skill`/`amber-skill` and `safe-tool`/`vuln-tool`/`amber-tool`.
- `found=true` → use `identifier` + `kind` for later steps. Remember Step 5: MCP keys are submitted via a subset manifest file, never as bare CLI args.

An absolute path the user passed that exists as a skill directory is resolved by the driver.

## Step 4 — Check current status (skip-vs-submit)

Run the status driver ONCE with all **found** identifiers (substitute `<repo_root>`, `<env_file>`, `<uv_bin>` from config; do not improvise queries):

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

Decide per artifact:

- `state=fresh` (any rag), `changed=false`, and NOT force → **skip**, note `already valid — use --force`.
- `state=scanning`, `changed=false`, and NOT force → **skip**, note `scan already in progress — check back shortly`.
- `changed=true` (content changed since last scan) → **always submit** — a rescan of the new bytes is exactly the remedy the hook's tamper deny names.
- `state=stale`, `state=unscanned` (including errored) → **always submit**, forced or not.
- force mode → submit everything resolvable.

## Step 5 — Submit

Create a scratch directory via `mktemp` (never fixed `/tmp` paths — they collide across sessions and are symlink-attackable):

```bash
TW_TMP="$(mktemp -d "${TMPDIR:-/tmp}/tw-scan.XXXXXX")"
```

**MCP servers are scanned by passing a MANIFEST FILE path — never a bare key, never a server/fixture directory path.** If any to-submit artifacts are MCP keys, write `$TW_TMP/mcp-subset.json` containing an `mcpServers` object with JUST those keys, each entry copied verbatim from the locus it resolved in, and add that file path to the target list. The CLI's manifest expansion turns each key into an item whose `identifier` is the bare key with `content_hash` `pending:<key>` — exactly the identity the enforcement hook looks up.

One CLI invocation with ALL to-submit skill absolute paths (plus the subset manifest, when present), run with `cwd=<repo_root>` (required for the Modal spawn), stdout/stderr captured to scratch files:

```bash
cd "<repo_root>" && node "<cli_bin>" scan <abs-skill-path-1> <abs-skill-path-2> ... "$TW_TMP/mcp-subset.json" --no-defaults --force > "$TW_TMP/stdout.txt" 2> "$TW_TMP/stderr.txt"
```

**ALWAYS append `--force`** — not only in force mode. Rationale: everything that reaches submission is either unscanned (force is harmless — there is nothing to skip), stale or errored (force is REQUIRED — without it the CLI matches the unchanged content hash, prints `[skip] … content unchanged since last scan`, creates no scan run, and the stale/errored state never clears), or explicitly user-forced.

IMPORTANT: stdout is MIXED — `[skip]` lines can precede a pretty-printed JSON result object and `[route]`/`[sie]` lines follow it; the exit code can be 1 while the JSON is still valid. Never parse the whole stream, and never brace-count lines (braces inside JSON string values break that). Use `json.JSONDecoder().raw_decode` over the raw text from each `{` offset, accepting only a dict that carries `batch_id`:

```bash
python3 -c '
import json, sys

text = open(sys.argv[1], encoding="utf-8").read()
decoder = json.JSONDecoder()
result = {}
idx = text.find("{")
while idx != -1:
    try:
        obj, _ = decoder.raw_decode(text[idx:])
    except json.JSONDecodeError:
        pass
    else:
        if isinstance(obj, dict) and "batch_id" in obj:
            result = obj
    idx = text.find("{", idx + 1)
print(json.dumps(result))
' "$TW_TMP/stdout.txt"
```

The result is `{"batch_id": ..., "scan_run_ids": [...], "failed_targets": [{"target", "error"}, ...]}`. Mapping run ids to artifacts: `scan_run_ids` lists run ids in the order the targets were passed on the command line — the subset manifest expands in place into one target per key (targets are the bare keys, in the manifest's key order) — minus any targets the CLI itself skipped (defensive: `--force` is always passed, so `[skip] <target> — content unchanged since last scan` lines should not occur) and minus failures that never got a run. Use the `[skip]` lines and `failed_targets` to attribute; if attribution is ambiguous, report the shared `batch_id` and say the per-run mapping is ambiguous rather than guessing.

## Step 6 — Report (table only)

One Markdown table, one row per requested name. Parse status-driver and CLI JSON privately; never paste them into the user-facing reply.

| Name | Type | Action | Details |
|------|------|--------|---------|
| `new-skill` | skill | 🚀 SUBMITTED | batch `<batch_id>`, run `<scan_run_id>` |
| `safe-skill` | skill | ⏭️ SKIPPED | already valid — use --force |
| `pending-skill` | skill | ⏳ SCANNING | scan already in progress — check back shortly |
| `cli-skipped` | skill | ⏭️ SKIPPED (by CLI) | content unchanged since last scan (defensive — should not occur since `--force` is always passed) |
| `broken-target` | mcp | ❌ FAILED | `<error from failed_targets>` |
| `unknown-skill` | — | ❓ NOT FOUND | No match in ~/.claude/skills, .claude/skills, .mcp.json, ~/.claude.json, ~/.tripwire/demo-mcp.json, fixtures manifest |

Row mapping: `submitted` → 🚀 SUBMITTED (include `batch_id` / `scan_run_id` in Details when known); `skipped` → ⏭️ SKIPPED; `skipped_by_cli` → ⏭️ SKIPPED (by CLI); `failed` → ❌ FAILED with the `failed_targets` error; `not_found` → ❓ NOT FOUND. Post-submission state for submitted rows is `scanning`.

If anything failed, say plainly that those artifacts remain blocked until a scan completes green, and that the out-of-band remedy is `cd <repo_root> && node <cli_bin> scan <target> --no-defaults --force` in a terminal — where `<target>` is the skill's absolute path, or for an MCP server a manifest `.json` file containing that key (never the bare key, never a server directory).
