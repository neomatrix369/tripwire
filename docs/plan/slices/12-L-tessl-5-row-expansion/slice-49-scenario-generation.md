# Slice 49 — Tessl: Scenario Generation Adapter + Resume Checkpoint (Row 3)

**Wave**: 12-L  
**MoSCoW**: Should  
**Depends on**: 47, 48  
**Status**: 📋 PLANNED  
**Read time**: ~5 min

## Context

Implements the Scenario Generation capability: `tessl scenario generate <plugin> --workspace <ws>` → `tessl scenario download --last` → move scenarios into `<plugin-dir>/evals/`. This is the most fragile step (manual move required; non-deterministic if interrupted). The `resume_checkpoint` jsonb column is essential here.

Design reference: `docs/design/tessl-5-row-expansion.md § (a) resume_checkpoint, § (b) Scenario Generation resume path, § (c) 7(b)`

**Coverage Gap dependency**: If Coverage Gap A (does `tessl scenario generate` print a run ID to stdout?) resolves as No, the adapter must use `tessl scenario view --last` to look up results — and Coverage Gap B (is `view <id>` supported?) affects whether cross-feature lineage can store an explicit ID for scenario gen.

## Acceptance Criteria (GWT)

### Scenario 1 — Successful generation, move, and row update

**Given** Quality Review has completed and `tessl_run_id` is populated  
**When** Scenario Generation runs  
**Then** `tessl scenario generate` is invoked; scenarios are downloaded and moved to `<plugin>/evals/`  
**And** `resume_checkpoint` transitions through `{"stage": "generated"}` → `{"stage": "moved"}` as each step completes  
**And** final row status is `completed` and `resume_checkpoint` is cleared to `null`

### Scenario 2 — Interrupted after generate, before move

**Given** the runner is interrupted after `generate` succeeds but before the move  
**When** the runner resumes  
**Then** `resume_checkpoint.stage == "generated"` is detected  
**And** the generate step is skipped; only the move is retried

### Scenario 3 — upstream_run_ids populated from Quality Review

**Given** Quality Review's `tessl_run_id` is `"rev_abc123"`  
**When** Scenario Generation starts  
**Then** `upstream_run_ids = {"review_quality": "rev_abc123"}` is written to the Scenario Generation row before invocation

### Scenario 4 — Scenario generation failure blocks Eval

**Given** `tessl scenario generate` exits non-zero  
**When** the runner completes the Scenario Generation step  
**Then** Scenario Generation row `status = "failed"`  
**And** Eval row `status` remains `"blocked"` (no auto-chain)

## Files to touch

- `sandbox/scanners.py` — add scenario generation step to `run_tessl()` group runner; implement `resume_checkpoint` write/read; implement `upstream_run_ids` population
- `sandbox/scan_app.py` — verify `resume_checkpoint` is persisted between Modal function invocations (verify Modal timeout handling)

## Open Question dependency

Coverage Gaps A and B must be resolved before implementing the `tessl_run_id` capture for this feature. If `tessl scenario view <id>` is unsupported (Gap B), store `null` and document the limitation.

## Gate evidence fields

`coverage_pct`: target ≥ 80% for new scenario generation code path  
`complexity_tool`: ruff/radon on `sandbox/scanners.py`  
`doc_audit`: design doc § (b) Scenario Generation resume path — mark as implemented
