---
name: tw-scan
description: Submit one or more skill/MCP/tool names to tripwire scan (supports --force / force)
disable-model-invocation: true
---

# /tw-scan

Submit resolved artifact paths to the existing `tripwire scan` API and return
confirmation with introspected identifiers (`batch_id`, `scan_run_ids`).

Same multi-name resolution rules as `/tw-verify`. Works whether enforcement is
enabled or disabled. Output contract:
[frontline-output-contract.md](../../../docs/user-guide/frontline-output-contract.md).

## Force syntax

Both forms resubmit even over a valid non-stale result:

- `/tw-scan name --force`
- `/tw-scan name force`

## Steps

1. Accept space- or comma-separated names, optionally with `--force` or bare `force`.
2. **Resolve** each name to a filesystem path (Claude Code visibility). Unresolved
   names are reported as not-found and are **not** submitted.
3. Call `guard.scan.scan_artifacts` (or the equivalent one-liner):

```bash
uv run python -c "
from guard.scan import parse_scan_args, scan_artifacts
from guard.verify import ResolvedArtifact

tokens = ['name-a', 'name-b']  # plus '--force' or 'force' when requested
names, force = parse_scan_args(tokens)

def resolve(name: str):
    # Agent fills ResolvedArtifact(...) or returns None when not found.
    raise SystemExit('wire resolve from Claude visibility')

def submit(paths, *, force):
    # Production: invoke existing tripwire scan / runScan for these paths.
    # Return only introspected fields: batch_id, scan_run_ids, failed_targets.
    raise SystemExit('wire submit to tripwire scan API')

result = scan_artifacts(names, resolve=resolve, submit=submit, force=force)
print(result.to_markdown())
print(result.to_machine())
"
```

4. Show the operator **both** the Markdown confirmation and the machine JSON.
   Echo `batch_id` and `scan_run_ids` from the scan API — do not invent fields.

## Notes

- Submit path is the existing `tripwire scan` / `cli/src/orchestrator.js` `runScan`
  stdout shape (slice 26 introspection).
- `/tw-scan` does not toggle the enable flag; use `/tw-enable` / `/tw-disable`.
