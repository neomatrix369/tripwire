# ADR-0003: Modal for isolated scanner execution

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** compute, isolation, modal, sandbox

## Context

Scanner CLIs execute untrusted skill/MCP trees, pull optional vendor tools, and
need secrets (Supabase service role, Snyk/Tessl/Cisco keys). Running that on the
operator laptop mixes credentials with target code and makes results
non-reproducible across machines.

Live scans also need an ephemeral filesystem and a hard timeout so a hung
scanner cannot block the heatmap forever.

## Decision

Use **Modal** as the Live compute plane.

- App `tripwire-scan` (`sandbox/scan_app.py`): one ephemeral sandbox per
  `scan_run`, 300s hard timeout.
- Image bakes scanner packages (`cisco-ai-skill-scanner`, `cisco-ai-mcp-scanner`,
  `snyk-agent-scan`) plus Node 20 for Tessl; `scanners` is copied into the image
  (`add_local_python_source(..., copy=True)`).
- Secrets sync via `./scripts/setup-modal.sh` (`tripwire-supabase`,
  `tripwire-scan-secrets`).
- Findings and console output are written **directly to Supabase** from the
  sandbox. They are not relayed through the CLI.
- CLI spawns via `modal run sandbox/scan_app.py` (local entrypoint) so host
  directories can be packed; it must not call `scan_item` directly.

`--dry-discover` stays local and never spawns Modal.

## Consequences

- Live path requires a Modal account and CLI auth; Mock / dry-discover do not.
- Cold image builds and `uvx` installs can leave Tessl/Snyk unreachable;
  that is reported, not hidden ([ADR-0009](./0009-fail-closed-incomplete-evidence.md)).
- Host paths are invisible on Modal’s remote FS — local targets must be tarred
  ([ADR-0012](./0012-sandbox-target-acquisition.md)).
- Packaging toward a Monk kit ([ADR-0001](./0001-monk-deployment-and-packaging.md))
  still treats Modal as external SaaS, not a cluster workload.

## Alternatives considered

### A. Local Docker / venv scanners

Rejected for Live: weaker isolation, operator-machine drift, secrets on the
laptop next to target trees.

### B. GitHub Actions as the scan runner

Rejected: scan latency and auth model are operator-driven, not PR-driven.
CI remains for Tripwire’s own quality gates.

## References

- [docs/user-guide/modal-setup.md](../user-guide/modal-setup.md)
- [docs/STATUS.md](../STATUS.md) IMPLEMENTED
- `cli/src/modalClient.js`, `sandbox/scan_app.py`
