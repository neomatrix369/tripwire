---
name: tw-enable
description: Enable Tripwire PreToolUse enforcement by setting enable=true in ~/.tripwire/config.json
disable-model-invocation: true
---

# /tw-enable

Toggle **only** the `enable` flag in `~/.tripwire/config.json` to `true`.
Do not call Tripwire scan, guard, or other APIs — config write only.
Preserve `scan_validity_days` and any other keys.

## Steps

1. Resolve config path: `$TRIPWIRE_CONFIG` if set, else `~/.tripwire/config.json`.
2. Run from the tripwire repo (or installed package):

```bash
uv run python -c "from guard.control_skills import enable_enforcement; print(enable_enforcement())"
```

3. Confirm the printed JSON has `"enable": true` and other keys unchanged.
4. Tell the operator: PreToolUse enforcement is **on** (unscanned/RED blocked).

`/tw-verify` and `/tw-scan` are unaffected by this flag — they remain usable either way.
