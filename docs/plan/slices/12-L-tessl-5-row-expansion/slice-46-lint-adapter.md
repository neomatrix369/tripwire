# Slice 46 — Tessl: Lint Adapter (Row 1)

**Wave**: 12-L
**MoSCoW**: Must
**Depends on**: 45
**Status**: 📋 PLANNED
**Read time**: ~4 min

## Pre-conditions (operator gate — before first live scan)

> **Live Supabase migration required.** Slice 45 CI verified the schema change against `db/schema.sql` only — no live DB was in CI. Before any scan data from this slice reaches the production Supabase instance, the operator must apply the migration manually:
>
> ```sql
> -- Run against the live Supabase instance (SQL editor or psql)
> -- Full idempotent block is in db/schema.sql § scan_run_scanners_status_check
> ```
>
> Without this step, any insert with a new status value (`needs_setup`, `queued`, `running`, etc.) will fail with a Supabase constraint violation. Record the run date in gate evidence under `live_migration_applied`.

## Context

Add `Tessl: Lint` as the first of the 5 new Tessl rows. `tessl skill lint <path>` is deterministic, fast, auth-free, and synchronous — the simplest Tessl capability to implement first.

Today Tripwire does NOT invoke lint (Coverage Gap verified: `sandbox/scanners.py:560–585` only calls `skill review`). This slice adds lint as a separate `scanner_source` row alongside the existing review row.

Design reference: `docs/design/tessl-5-row-expansion.md § (a), (b), (d)`

## Acceptance Criteria (GWT)

### Scenario 1 — Lint row appears in scanner outputs

**Given** a scan_run is triggered for a skill item
**When** TESSL_TOKEN is present (or absent — lint is auth-free)
**Then** a `scan_run_scanners` row with `scanner_source = "Tessl: Lint"` is written
**And** `status` is `completed` or `failed` (lint is synchronous; no queued/running states for the row)

### Scenario 2 — Lint runs without TESSL_TOKEN

**Given** TESSL_TOKEN is absent from the Modal sandbox environment
**When** the Tessl group runner executes
**Then** the Lint row is still attempted (lint has no auth requirement)
**And** Review (Quality) row transitions to `needs_setup` (TESSL_TOKEN absent)

### Scenario 3 — Lint findings persisted

**Given** lint completes with findings
**When** the row is written
**Then** `checks_run` reflects the number of lint checks run
**And** `detail` contains a human-readable summary
**And** `tessl_run_id` is `null` (lint is local/synchronous; no server-side run ID)

### Scenario 4 — Dashboard renders Lint row

**Given** a scan_run has a `Tessl: Lint` row in the DB
**When** the dashboard loads
**Then** the Lint row appears at position 1 in the Tessl block
**And** no `tesslQuality` quality-score badge is shown on the Lint row

## Files to touch

- `sandbox/scanners.py` — extend `run_tessl()` to emit a Lint row (follow Cisco pattern: separate invocation, separate `scanner_source` string)
- `prototypes/dc-dashboard/Tripwire.dc.html` — ensure `tesslQuality` badge is scoped to `"Tessl: Review (Quality)"` only (not `"Tessl: Lint"`)

## Gate evidence fields

`coverage_pct`: target matching existing Tessl adapter test coverage
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: `docs/design/tessl-5-row-expansion.md` — verify Lint row status reflects implemented
