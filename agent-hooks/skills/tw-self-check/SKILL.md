---
name: tw-self-check
description: Verify the scan status of Tripwire's own five tw-* skills as installed under ~/.claude/skills (self-integrity check). Use when the user runs /tw-self-check, or asks whether Tripwire's own skills are scanned, green, or would be blocked by their own hook.
---

# tw-self-check

Self-integrity check: `/tw-verify`'s logic hard-scoped to the five `tw-*` skills as INSTALLED under `~/.claude/skills/` — the installed copies are what enforcement sees, not the repo copies. Never stop at the first problem; all five always get a row.

## Step 1 — Parse arguments

The only accepted argument is force: a literal `--force` flag OR a bare `force` token. It passes through to the rescan offer in Step 5. Ignore any other arguments (mention that scope is fixed to the five tw-* skills).

## Step 2 — Fixed scope, fixed resolution

The artifact list is EXACTLY these five installed skill directories — no name search, no other loci:

- `~/.claude/skills/tw-verify`
- `~/.claude/skills/tw-scan`
- `~/.claude/skills/tw-enable`
- `~/.claude/skills/tw-disable`
- `~/.claude/skills/tw-self-check`

For each: if the directory exists, the identifier is its canonical absolute path (`realpath`, symlinks resolved, no trailing slash). If it does not exist → a ❓ NOT FOUND row with note `Not installed under ~/.claude/skills — run tripwire setup-agent-hooks`.

## Step 3 — Query status (shared status procedure)

Read `~/.tripwire/config.json` for `enable`, `scan_validity_days`, `repo_root`, `env_file`, `uv_bin` (missing/corrupt config: report that the hook treats this as tampering and denies, point at `tripwire setup-agent-hooks`, and stop). Then run the status driver ONCE with all existing identifiers — exactly this driver, no improvised queries:

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

## Step 4 — Report (Scan Status table only)

Render exactly the tw-verify human table — same columns **Name | Type | Status | Quality | Note**, emoji/labels, Quality as **`N/100`** or `—`, blocked-message **footer**, and **Sources** line (Tessl Quality; Cisco/Snyk Status) (see `~/.claude/skills/tw-verify/SKILL.md` §Step 5 and [frontline-output-contract.md](../../../docs/user-guide/frontline-output-contract.md)). Parse the driver's JSON privately; do **not** dump a fenced `{config, artifacts}` block to the user. Summary of the row rules (N = `scan_validity_days`):

- `fresh` + green → `🟢 GREEN (fresh)`, note `—`.
- `fresh` + amber → `🟠 AMBER`; `Reported but not blocked at current threshold` when threshold is `red`, else distinct amber note + footer when blocked.
- `fresh` + red → `🔴 RED`; note `rated red — at/above threshold` (blocked sentence is footer-only).
- `stale` → `⚠️ STALE`; `Last scanned >N days ago — blocked until rescanned (run /tw-scan <name>)`.
- `scanning` → `⏳ SCANNING`; `Scan in progress — check back shortly` (+ prior verdict if rag non-null).
- `unscanned` → `🚫 UNSCANNED`; `Never scanned — offer /tw-scan <name>` (or `Last scan errored — resubmit (run /tw-scan <name>)` when errored).
- `changed=true` → `✏️ CHANGED`; bold **content changed since last scan — run /tw-scan <name>** — takes precedence over every state-based row, `will_be_blocked` true.
- missing install dir → `❓ NOT FOUND`; note `Not installed under ~/.claude/skills — run tripwire setup-agent-hooks` (footer covers blocked).

If any `will_be_blocked`, print **Will be blocked when Tripwire is enabled** once under the table.

If local `enable` is false, add the "currently bypassed" note; if `monitoring_enabled` is false, add the platform-switch warning.

A non-green result here matters: a blocked `tw-*` skill means the hook will block Tripwire's own tooling — the out-of-band remedies are `cd <repo_root> && node <cli_bin> scan <abs path> --no-defaults --force` in a terminal, or hand-editing `~/.tripwire/config.json` to `"enable": false`.

## Step 5 — Rescan offer

If any rows are unscanned, errored, stale, or changed — or if force mode is set (then ALL five installed skills are candidates, fresh ones included) — offer to submit them. On yes: follow the tw-scan procedure (`~/.claude/skills/tw-scan/SKILL.md`) for exactly those installed paths — its submission step always appends `--force`, which is what actually clears stale/errored/changed states (without force the CLI skips unchanged content and the state never clears) — then re-render with those rows as ⏳ SCANNING.
