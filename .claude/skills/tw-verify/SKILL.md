---
name: tw-verify
description: Report Tripwire scan status for one or more skill/MCP/tool names (dual Markdown+JSON output)
disable-model-invocation: true
---

# /tw-verify

Report scan status for one or more names in **one pass** (do not stop at the
first issue). Output must follow the Frontline dual-audience contract:
[frontline-output-contract.md](../../../docs/user-guide/frontline-output-contract.md)
— human Markdown table **and** machine JSON with the same per-artifact facts.

Works whether enforcement is enabled or disabled (`/tw-enable` / `/tw-disable`).

## Steps

1. Accept space- or comma-separated names from the user.
2. **Resolve** each name to a filesystem path using Claude Code visibility into
   installed skills / MCP config / tools. If there is no match, still include
   that name in the report as `not-found` with a useful human message (do not
   abort the whole run).
3. For each resolved name, call:

```bash
uv run python -c "
from datetime import UTC, datetime
from guard.verify import ResolvedArtifact, StatusRecord, verify_artifacts

# Replace resolve/fetch_status with real Supabase lookups in production wiring.
# For a dry smoke with fixtures, inject StatusRecord values as below.

def resolve(name: str):
    # Agent fills ResolvedArtifact(name=..., artifact_type=..., resolved_path=...)
    # or returns None when not found.
    raise SystemExit('wire resolve from Claude visibility')

def fetch_status(resolved):
    # Query Supabase items.heatmap_status + latest scan_runs (see guard_hook.py).
    raise SystemExit('wire fetch_status from Supabase')

result = verify_artifacts(
    ['name-a', 'name-b'],
    resolve=resolve,
    fetch_status=fetch_status,
)
print(result.to_markdown())
print(result.to_machine())
"
```

Prefer importing and calling `guard.verify.verify_artifacts` from a short
helper once resolve + Supabase fetch are wired; keep the dual-output helpers
shared for `/tw-scan` and `/tw-self-check`.

4. Show the operator **both** the Markdown table and the JSON `artifacts` array.
5. RED rows must include **Will be blocked when Tripwire is enabled**.
6. Unscanned rows must offer `/tw-scan <name>` for that artifact.
7. If the operator accepts a scan offer, invoke `/tw-scan` for those names.

## Notes

- Status comes from Supabase (`items.heatmap_status` + scan timestamps / in-flight
  runs), not from a synchronous `tripwire` status CLI.
- Staleness uses `scan_validity_days` from `~/.tripwire/config.json` (default 14).
