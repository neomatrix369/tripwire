---
name: tw-disable
description: Turn Tripwire enforcement OFF for Claude Code tool calls. Use when the user runs /tw-disable, or asks to disable, bypass, pause, or turn off Tripwire guard/enforcement/blocking.
---

# tw-disable

Flip the local Tripwire kill switch OFF. This edits ONLY the `enable` key of `~/.tripwire/config.json` — no Supabase writes, no other keys touched.

## Step 0 — Ask before disabling

**Stop and ask the user:** *Do you want to turn Tripwire enforcement OFF?*

**Do not proceed to Step 1 until the user explicitly confirms.** If they decline or are unsure, stop with no config change.

## Step 1 — Set enable=false (python3 JSON round-trip)

Run exactly this (do not hand-edit the file with text tools):

```bash
python3 -c '
import json, os

p = os.path.expanduser("~/.tripwire/config.json")
defaults = {
    "schema_version": 1,
    "enable": True,
    "scan_validity_days": 14,
    "repo_root": "",
    "cli_bin": "",
    "env_file": "",
    "uv_bin": "",
}
try:
    with open(p, encoding="utf-8") as f:
        cfg = json.load(f)
    created = False
except (OSError, ValueError):
    cfg = dict(defaults)
    created = True
os.makedirs(os.path.dirname(p), exist_ok=True)
cfg["enable"] = False
with open(p, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print(json.dumps({"created": created, "enable": cfg["enable"]}))
'
```

If `created` is true, the config file was missing and was recreated with defaults plus `enable: false` — mention that `tripwire setup-agent-hooks` restores the full config (repo paths are unset).

## Step 2 — Confirm

Tell the user, plainly:

- Tripwire enforcement is now **OFF** — the Claude Code hook allows every skill/MCP call without checking scan status. Enforcement is **fully bypassed**, including red-rated and never-scanned artifacts.
- Manual scanning and reporting still work while disabled: `/tw-scan` submits scans and `/tw-verify` reports status (its "will be blocked" column shows what enforcement WOULD do, marked as currently bypassed).
- Re-enable at any time with `/tw-enable`.
