# ADR-0015: Horizon A excludes Guard and Drift

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** scope, guard, drift, horizon-a

## Context

The product spec includes later phases: Agent Guard (PreToolUse fail-closed
hook), Drift/trend/diff on `items.identifier`, and a Reconciler for
multi-scanner disagreement. The walking skeleton landed a `guard/` stub and
schema columns that look like those features. Treating stubs as shipped
capabilities produced false README badges (Overmind/Ossprey) and pulled Guard
into C4 diagrams.

Horizon A was locked as Detection + Sandbox (GWT-1/2), not the full platform.

## Decision

**Horizon A production entry points are CLI + Modal sandbox + Supabase +
dashboard.** Everything else is Future or Won't (A).

- `guard/` may exist on disk; it is **not** a shipped production entry. Omit
  from C4 L2 and from coverage bars ([ADR-0013](./0013-ship-path-quality-gates.md)).
- Drift/trend/diff and Reconciler are out of A. `identifier` exists for later
  grouping; do not claim drift behaviour.
- Demo/hackathon film day (VO/Remotion) is Won't (A); reinstate only if a new
  demo need arises.
- Public badges and architecture diagrams show only partners and containers
  that have a reachable path (Gate A trust strip).

Re-opening Guard or Drift requires a new ADR (or an explicit supersede of this
one) plus STATUS evidence, not a stub file.

## Consequences

- Contributors seeing `guard/` must read STATUS/ARCHITECTURE Future, not the
  folder name.
- Schema can be ahead of behaviour (`identifier`, `coverage` table); claims
  stay evidence-labelled.
- Wave G ATDD (slices 18–22) closes CLI/sandbox/dashboard contracts inside
  this Horizon A boundary; it does not revive Guard.

## Alternatives considered

### A. Ship Guard in Horizon A

Rejected: no production hook path; would fake a security control.

### B. Delete the Guard stub

Not required: keeping a stub is fine if docs and coverage treat it as Future.

## References

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) §2 Future
- [docs/STATUS.md](../STATUS.md) Future
- [docs/plan/DECISIONS.md](../plan/DECISIONS.md) demo-hackathon closed; Gate A
  trust strip
