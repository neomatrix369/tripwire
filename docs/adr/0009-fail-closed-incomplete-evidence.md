# ADR-0009: Fail closed on incomplete evidence

- **Status:** Accepted
- **Date:** 2026-08-07
- **Deciders:** Tripwire maintainers
- **Tags:** honesty, scanning, status, evidence

## Context

A scan that exits 0 with an empty heatmap looks “green” even when scanners
never ran, JSON was malformed, schema probe failed for auth reasons, or a
sandbox spawn died. That is worse than a noisy failure: operators and demos
treat absence of findings as safety.

Coverage-audit acceptance tests later made this explicit: empty successful
scans, malformed scanner payloads, and schema probes that cannot see the
database must not certify success.

## Decision

**Fail closed.** Incomplete evidence is never a clean `complete` scan.

- Scanner adapters: zero-exit empty/malformed JSON, timeout, or missing binary
  → `unreachable`, not `completed` with zero findings.
- Any `unreachable` engine → scan_run `partial-failed`; completed engines’
  findings still persist and roll up.
- CLI: invalid concurrency / no targets / dispatch failure → nonzero exit;
  failed targets are listed; the run is marked `failed` and rolled up.
- Schema probe: non-schema errors (auth, network) abort; they do not report
  the database as ready.
- Missing vendor keys → `skipped_missing_credential` (honest skip), distinct
  from unreachable. README: do not call the scan complete for that engine.
- Rollup: `failed` / `running` / empty `partial-failed` paint heatmap `error`,
  not green.

## Consequences

- Live demos can show `partial-failed` / unreachable copy (“n out of m
  scanners unreachable”) when Tessl/Snyk cold-install fails — that is
  correct, not a dashboard bug.
- Operators must distinguish skip (no key) from unreachable (engine broke).
- CI Must Live E2E remains Won’t; unit/characterization tests encode the
  fail-closed contract instead.

## Alternatives considered

### A. Best-effort complete (ignore broken engines)

Rejected: silent green is a trust defect.

### B. Fail the whole run if any engine is missing

Rejected: optional vendor keys are part of the five-vendor map; skip is
allowed, lying about completion is not.

## References

- `fix(scanning): fail closed on incomplete evidence` (2026-08-07, PR #58)
- [docs/plan/coverage-audit.md](../plan/coverage-audit.md) acceptance catalog
- `sandbox/scanners.py` `overall_status`; `cli/src/orchestrator.js`
