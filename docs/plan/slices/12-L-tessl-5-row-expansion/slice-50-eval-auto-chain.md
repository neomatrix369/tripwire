# Slice 50 — Tessl: Eval Adapter + Scenario→Eval Auto-Chain (Row 4)

**Wave**: 12-L
**MoSCoW**: Should
**Depends on**: 49
**Status**: 📋 PLANNED
**Read time**: ~4 min

## Context

Implements the Eval capability: `tessl eval run <plugin> --runs 3`. The critical design constraint is the first-run auto-chain: Eval must auto-transition from `blocked` → `queued` when Scenario Generation completes with a zero exit code AND scenarios are confirmed in `<plugin>/evals/`. If Scenario Generation is re-run after Eval has already completed once, Eval transitions to `stale` (no auto-cascade).

Design reference: `docs/design/tessl-5-row-expansion.md § (b) auto-chain, § (b) Stale non-cascade`

## Acceptance Criteria (GWT)

### Scenario 1 — First-run auto-chain from Scenario Generation

**Given** Scenario Generation just completed with status `completed`
**And** `resume_checkpoint` confirms `stage == "moved"` (scenarios in evals/)
**And** Eval row has status `blocked`
**When** the auto-chain check runs
**Then** Eval row transitions to `queued` within the same Run Scan execution
**And** `tessl eval run` is invoked with `--runs 3`

### Scenario 2 — Eval completes; tessl_run_id captured

**Given** `tessl eval run --runs 3` completes
**When** results are persisted
**Then** `tessl_run_id` is populated (from `tessl eval view --last --json`)
**And** `tessl_run_id_at` is set
**And** `checks_run` reflects the number of evaluated scenarios
**And** `status = "completed"`

### Scenario 3 — Scenario Generation re-run marks Eval as Stale

**Given** Eval has `status = "completed"` with a `tessl_run_id`
**When** Scenario Generation is re-run (new `tessl_run_id_at` for Scenario Gen row is newer than Eval's `completed_at`)
**Then** Eval row `status` transitions to `"stale"`
**And** no new Eval run is triggered automatically

### Scenario 4 — upstream_run_ids populated

**Given** Quality Review's `tessl_run_id` is available
**When** Eval starts
**Then** `upstream_run_ids = {"review_quality": "<id>", "scenario_gen": null}` is written
(scenario_gen ID may be null per Coverage Gap B)

### Scenario 5 — Non-deterministic score handling

**Given** `tessl eval run --runs 3` produces a non-deterministic score (LLM-graded)
**When** the result is written
**Then** the raw score and run count are persisted in `detail`
**And** the row is not marked `failed` solely due to score variance (only failed on non-zero exit)

## Files to touch

- `sandbox/scanners.py` — add eval step to `run_tessl()` group runner; implement auto-chain detection; implement Stale transition logic

## Gate evidence fields

`coverage_pct`: target ≥ 80% for new eval + auto-chain code path
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (b) auto-chain and Stale — mark as implemented
