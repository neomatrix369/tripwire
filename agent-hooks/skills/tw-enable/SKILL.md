---
name: tw-enable
description: Turn Tripwire enforcement ON for Claude Code tool calls. Use when the user runs /tw-enable, or asks to enable, re-enable, re-arm, or turn on Tripwire guard/enforcement/blocking.
---

# tw-enable

Flip the local Tripwire kill switch ON. This edits ONLY the `enable` key of `~/.tripwire/config.json` — no Supabase writes, no other keys touched.

## Step 1 — Set enable=true (python3 JSON round-trip)

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
cfg["enable"] = True
with open(p, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print(json.dumps({"created": created, "enable": cfg["enable"]}))
'
```

If `created` is true, the config file was missing (a tamper signal to the hook) and was recreated with defaults — warn the user that `repo_root`/`cli_bin`/`env_file`/`uv_bin` are unset, the hook will fail closed (deny) until they run `tripwire setup-agent-hooks` to restore them.

## Step 2 — Check the platform switch

Effective enforcement = local `enable` AND the Supabase platform switch `config.monitoring_enabled` — the guard still honors the platform switch even when local enforcement is on. Check it via the status driver (any probe identifier works; only the `config` object of its output matters). Substitute `<repo_root>`, `<env_file>`, `<uv_bin>` from `~/.tripwire/config.json`:

```bash
cd "<repo_root>" && set -a && source "<env_file>" && set +a && "<uv_bin>" run --extra guard python -c '
import json, os, sys

from guard.status import get_item_status, make_client

cfg = json.load(open(os.path.expanduser("~/.tripwire/config.json"), encoding="utf-8"))
days = int(cfg.get("scan_validity_days", 14))
client = make_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
s = get_item_status(client, sys.argv[1], days)
print(json.dumps({
    "config": {
        "enabled": bool(cfg.get("enable", True)),
        "scan_validity_days": days,
        "threshold": s.get("threshold"),
        "monitoring_enabled": bool(s.get("monitoring_enabled", True)),
    },
}))
' tw-enable-probe
```

If the probe fails (missing env, network), say the platform switch could not be checked — the hook itself remains fail-closed either way.

## Step 3 — Confirm

Tell the user:

- Tripwire enforcement is now **ON** — unscanned, stale, red-rated (and amber, when threshold is `red_and_amber`), and tampered artifacts will be blocked at call time.
- If `monitoring_enabled` came back `false`: warn plainly that the Supabase platform switch is OFF and **still gates the guard** — local enable alone will not block until the platform switch is re-enabled (that switch is managed on the platform side, not by this skill).
- `/tw-verify <name>` shows what will be blocked; `/tw-disable` turns enforcement back off.
