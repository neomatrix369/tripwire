# Slice 45 — DB Schema Migration: Tessl 5-Row Expansion

**Wave**: 12-L
**MoSCoW**: Must
**Depends on**: 44 (docs current)
**Status**: ✅ PASSED ([#103](https://github.com/neomatrix369/tripwire/pull/103))
**Read time**: ~3 min

## Context

Tripwire's `scan_run_scanners` table uses a 6-state status enum and has no per-feature Tessl run-ID columns. This slice extends it to support the 12-state enum and 4 new columns required by the Tessl 5-row design.

Design reference: `docs/design/tessl-5-row-expansion.md § (a)`

## Acceptance Criteria (GWT)

### Scenario 1 — Status enum extended

**Given** a Supabase instance with the existing 6-state `scan_run_scanners_status_check` constraint
**When** the migration runs
**Then** the check constraint is replaced with the 12-state list: `not_started, needs_setup, blocked, queued, running, retrying, interrupted, completed, stale, failed, timed_out`
**And** `not_available_yet` is NOT in the constraint (UI-only state, never stored)
**And** all existing rows with the old status values remain valid (old values are a subset of new)

### Scenario 2 — New columns added

**Given** the migration runs successfully
**When** the schema is inspected
**Then** these columns exist on `scan_run_scanners`: `tessl_run_id text`, `tessl_run_id_at timestamptz`, `resume_checkpoint jsonb`, `upstream_run_ids jsonb`
**And** all four columns are nullable
**And** all existing rows have `NULL` values for the four new columns

### Scenario 3 — Backward compatibility

**Given** the migration has run
**When** the existing Cisco/Snyk/DepShield scanner adapter code writes a row with no new columns
**Then** the insert/update succeeds (new columns default to NULL)

### Scenario 4 — upstream_run_ids enables cross-step lineage (contract)

**Given** slices 47–51 populate `upstream_run_ids` at step start from in-process `_TesslIdContext`
**When** slice 52 reads persisted rows from Supabase
**Then** each downstream row's `upstream_run_ids` JSON contains the snapshot keys `review_quality` and/or `scenario_gen` (nullable per key)
**And** slice 52 can call `tessl <cmd> view <id> --json` without re-deriving IDs from sibling row queries

Design reference for carry-forward: `docs/design/tessl-5-row-expansion.md § ID carry-forward contract`

## Files to touch

- `db/schema.sql` — add ALTER TABLE statements (or integrate into initial CREATE TABLE if schema is always applied fresh)
- `db/migrations/` — if migration files are tracked separately (verify against repo)

## Gate evidence fields

`coverage_pct`: N/A (migration only, no new Python code)
`complexity_tool`: N/A
`doc_audit`: Update `docs/design/tessl-5-row-expansion.md` status to "Schema: Implemented" if applicable
