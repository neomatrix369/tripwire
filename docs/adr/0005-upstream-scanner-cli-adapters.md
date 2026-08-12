# ADR-0005: Wrap upstream scanner CLIs; normalize findings

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** scanners, adapters, cisco, snyk, tessl

## Context

Tripwire is an assessment orchestrator, not a replacement for Cisco Skill/MCP
Scanner, Snyk Agent Scan, or Tessl. Reimplementing those engines would fork
their detection quality and lag their CLI flags. The dashboard, however, needs
one severity model (`red` / `amber` / `green`) and one `findings` table.

Upstream JSON shapes differ and are marked experimental in places (Snyk).
Adapters must tolerate prefixed stdout, missing binaries, and missing vendor
keys without crashing the sandbox.

## Decision

Treat each engine as a **subprocess adapter** in `sandbox/scanners.py`.

- Shell out with real flags (`skill-scanner`, `mcp-scanner`, `snyk-agent-scan`,
  `tessl`); parse documented JSON; map into `findings` + `scan_run_scanners`.
- Collapse upstream severities into Tripwire `red` / `amber` / `green`.
- Missing vendor credentials → `skipped_missing_credential`, not a silent
  “configured and clean” result.
- Nonzero exit, timeout, missing binary, or empty/malformed JSON →
  `unreachable` (never a crash). Cisco findings from engines that did complete
  are still persisted.
- Incremental `on_scanner_done` so the dashboard can show progress
  scanner-by-scanner.
- Keep [scanner-output-adapters.md](../research/adapters/scanner-output-adapters.md)
  in sync with `scanners.py`. Exact JSON field names remain RESEARCH until
  fixture-round-tripped against the pinned CLI.

Skill scans run Cisco + Tessl + Snyk. MCP scans run Cisco MCP + Snyk.

## Consequences

- Image and secrets must include each vendor the operator wants; absent keys
  skip that engine rather than blocking the whole Live path.
- Adapter tests lock parse fixtures; they do not replace pinning CLI versions
  in the Modal image when upstream output is experimental.
- Dual-write of raw blobs to Storage is specified, not shipped
  ([ADR-0004](./0004-supabase-system-of-record.md)).

## Alternatives considered

### A. Reimplement detection in-process

Rejected: quality and maintenance cost; product value is orchestration +
normalized review.

### B. Call vendor SaaS HTTP APIs only

Rejected: the shipped engines are CLIs that need the target tree (or MCP
endpoint) inside the sandbox.

## References

- `sandbox/scanners.py`
- [docs/STATUS.md](../STATUS.md) IMPLEMENTED / RESEARCH
- [docs/user-guide/prerequisites.md](../user-guide/prerequisites.md) five-vendor map
