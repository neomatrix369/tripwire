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

Skip **sandbox spawn** when the target’s **content hash** already exists on `items`.

- Local `source_on_disk`: SHA-256 of file bytes plus path structure
  (`cli/src/hash.js`). Unique on `items.content_hash`.
- Non-disk / introspection targets: placeholder `pending:<identifier>`.
  GitHub repo fan-out (slice 62) clones on the host first, so those rows are
  hashed as local trees — not `pending:`.
- Same identifier with a **new** hash updates the existing item row so the
  heatmap does not accumulate duplicate cards.
- Display **`name` is always refreshed** on upsert when discovery supplies a
  different title (hash hit or identifier reuse). Spawn may still be skipped;
  card titles stay current after naming-contract changes without `--force`.
- `--force` bypasses the spawn skip and always runs scanners.
- `--dry-discover` never hashes for spawn; it only prints targets.

## Consequences

- Scanner engine upgrades do not invalidate hashes; operators must `--force`
  to re-run scanners. Stale **card titles** alone are fixed by a normal re-scan
  (or a one-shot SQL path update when frontmatter is unavailable).
- Placeholder hashes collapse all non-disk targets with the same identifier
  into one skip key — acceptable for Horizon A.
- Characterization / coverage tests lock skip vs `--force` spawn behaviour
  and name refresh on hash hit (slice 6 + slice 62).

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
