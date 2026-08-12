# ADR-0010: Content-hash idempotency with --force

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** cli, idempotency, hashing

## Context

Modal scans are slow and billable. Re-scanning an unchanged skill on every
`tripwire scan` wastes quota and floods `scan_runs`. Operators still need a
way to re-run after scanner/image changes when bytes on disk did not change.

Git and live MCP targets cannot be hashed on the host the same way as a local
tree (clone happens inside the sandbox; introspection-only has no files).

## Decision

Skip spawn when the target’s **content hash** already exists on `items`.

- Local `source_on_disk`: SHA-256 of file bytes plus path structure
  (`cli/src/hash.js`). Unique on `items.content_hash`.
- Non-disk targets: placeholder `pending:<identifier>` until a better hash
  exists (git after clone is future work).
- Same identifier with a **new** hash updates the existing item row so the
  heatmap does not accumulate duplicate cards.
- `--force` bypasses the skip and always spawns.
- `--dry-discover` never hashes for spawn; it only prints targets.

## Consequences

- Scanner engine upgrades do not invalidate hashes; operators must `--force`.
- Placeholder hashes collapse all non-disk targets with the same identifier
  into one skip key — acceptable for Horizon A, weak for cloneable git URLs.
- Characterization tests lock skip vs `--force` Modal spawn behaviour
  (slice 6).

## Alternatives considered

### A. Always spawn

Rejected: cost and heatmap noise on repeated fixture scans.

### B. Hash scanner versions into the identity

Deferred: would re-scan on every image bump; can be added later without
changing the `--force` escape hatch.

## References

- `cli/src/hash.js`, `cli/src/orchestrator.js` `upsertItem`
- [docs/STATUS.md](../STATUS.md) CLI discovery / hashing / idempotency
- Slice 6 orchestrator characterization
