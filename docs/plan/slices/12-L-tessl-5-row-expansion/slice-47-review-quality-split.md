# Slice 47 — Tessl: Review (Quality) Split + `tesslQuality` Scope Fix (Row 2)

**Wave**: 12-L
**MoSCoW**: Must
**Depends on**: 45, 46
**Status**: 🔨 IN PROGRESS · `slice/47-review-quality-split`
**Read time**: ~4 min

> **Pre-condition**: live Supabase 14-state constraint applied 2026-08-24 (shared with slice 46). Re-apply only on an environment that still has the old 6-state constraint.

## Context

Slice 46 already renamed the quality row to `"Tessl: Review (Quality)"` and scoped
`tesslInnerQuality` / Live `quality_score` to that source. This slice owns the
remaining Row 2 contract:

1. Capture `tessl_run_id` + `tessl_run_id_at` after Quality Review completes.
2. Extract `_run_tessl_review(judge_type=…)` so Security Review (slice 51) can share it.
3. Switch the invocation from deprecated `tessl skill review` to
   `tessl review run quality --json --workspace` (live CLI 2026-08-24).

Design reference: `docs/design/tessl-5-row-expansion.md § (a), (d), § Shared Review Mechanic`

## Acceptance Criteria (GWT)

### Scenario 1 — Existing quality review row renamed + run ID captured

**Given** a scan_run triggers the Tessl group runner
**When** the quality review (`tessl review run quality`) completes
**Then** the `scan_run_scanners` row has `scanner_source = "Tessl: Review (Quality)"`
**And** `tessl_run_id` is populated with the Tessl-side run ID (from `tessl review view --last --json`, falling back to `review run --json` `id`)
**And** `tessl_run_id_at` is set to the time of capture

### Scenario 2 — `tesslQuality` badge scoped correctly

**Given** a scan_run has both a `Tessl: Lint` row and a `Tessl: Review (Quality)` row
**When** the dashboard renders the scanner outputs list
**Then** the quality score badge (`Q 59` style) appears only on the `Tessl: Review (Quality)` row
**And** the Lint row shows no quality badge

*(Landed in slice 46; regression tests remain the evidence.)*

### Scenario 3 — `needs_setup` when TESSL_TOKEN or TESSL_WORKSPACE absent

**Given** `TESSL_TOKEN` is absent, **or** `TESSL_WORKSPACE` is absent, from the Modal sandbox
**When** the Tessl runner executes
**Then** the `Tessl: Review (Quality)` row has `status = "needs_setup"`
**And** Lint still runs (auth-free)

### Scenario 4 — Shared review mechanic parameterised

**Given** both Quality and Security review share the same underlying adapter function
**When** the Quality variant is invoked
**Then** the parameterised function is called with `judge_type="quality"`
**And** the CLI is `tessl review run quality --json --workspace <ws> <path>`
**And** the result is written to the `"Tessl: Review (Quality)"` row only

## Files to touch

- `sandbox/scanners.py` — `_run_tessl_review(judge_type, …)`; capture `tessl_run_id` from `tessl review view --last --json`
- `prototypes/dc-dashboard/tripwire-status.js` — quality tooltip source line (`review run quality`, not `skill review`)
- Existing tests referencing `TESSL_TOKEN`-only Review completion — add `TESSL_WORKSPACE` + view `--last` mock
- `docs/user-guide/env-vars.md` — workspace required for `--json`

## Before-Checks

- [x] Slice 45 ✅ (#103) and slice 46 ✅ (#105) on main
- [x] Live CLI probed 2026-08-24: `tessl review run quality --help`, `tessl review view --help`; `skill review` deprecated
- [x] `TESSL_WORKSPACE` already in `.env.example` allowlist / Modal secret split
- [x] Branch `slice/47-review-quality-split` created from main

## After-Checks

- [x] GWT-47.1 — `tessl_run_id` from `review view --last --json` (fallback: run JSON `id`)
- [x] GWT-47.2 — `tesslInnerQuality` still null on Lint (slice 46 regression)
- [x] GWT-47.3 — missing token **or** workspace → Review `needs_setup`
- [x] GWT-47.4 — `_run_tessl_review("quality", …)` argv is `review run quality`
- [x] `pytest sandbox/tests/test_scanners_status.py sandbox/tests/test_ship_path_coverage.py` exit 0
- [x] Specification coverage: every GWT clause has ≥1 test
- [x] `./scripts/quality-gates.sh` passes locally
- [x] Complexity evidence: xenon/radon on `sandbox/scanners.py` (`reporting` unless CI fail-under applies)
- [x] Doc audit: env-vars, STATUS, ARCHITECTURE, CHANGELOG, design Gap 5 / Gap A
- [ ] `/nw-review` APPROVED (mandatory before 🔀 close / ✅)
- [ ] Live persist of `tessl_run_id` (optional operator scan; unit is the gate)

## Gate evidence fields

`coverage_pct`: target ≥ existing Tessl test coverage
`complexity_tool`: ruff/radon/xenon on `sandbox/scanners.py`
`doc_audit`: design doc + user-guide scanner name / CLI command
