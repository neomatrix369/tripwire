---
name: tw-disable
description: Disable Tripwire PreToolUse enforcement by setting enable=false in ~/.tripwire/config.json
disable-model-invocation: true
---

# /tw-disable

Toggle **only** the `enable` flag in `~/.tripwire/config.json` to `false`.
Do not call Tripwire scan, guard, or other APIs — config write only.
Preserve `scan_validity_days` and any other keys.

Full bypass at the PreToolUse enforcement layer. Manual `/tw-verify` and
`/tw-scan` remain usable when disabled (they do not no-op solely because
`enable` is false).

## Steps

1. Resolve config path: `$TRIPWIRE_CONFIG` if set, else `~/.tripwire/config.json`.
2. Run from the tripwire repo (or installed package):

```bash
uv run python -c "from guard.control_skills import disable_enforcement; print(disable_enforcement())"
```

3. Confirm the printed JSON has `"enable": false` and other keys unchanged.
4. Tell the operator: PreToolUse enforcement is **off** (approve-all bypass).
   Verify and scan skills remain available.
