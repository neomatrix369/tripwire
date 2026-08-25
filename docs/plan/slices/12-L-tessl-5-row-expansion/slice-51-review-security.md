# Slice 51 — Tessl: Review (Security) Adapter (Row 5)

**Wave**: 12-L
**MoSCoW**: Could
**Depends on**: 47
**Status**: 🔨 IN PROGRESS
**Read time**: ~3 min

## Context

Implements `tessl review run security <path> --workspace <ws>` as a separate row from Quality Review. Shares the `_run_tessl_review(judge_type, ...)` parameterised function introduced in slice 47. Populates `upstream_run_ids.review_quality` from in-process `_TesslIdContext` (seeded by slice 47) so the UI can show cross-linked findings.

Design reference: `docs/design/tessl-5-row-expansion.md § (a) Shared Review Mechanic, § (c) 7(a), § ID carry-forward contract`

**ID carry-forward**: Security runs after Eval in the pipeline order. At step start, `_attach_upstream_run_ids(row, ctx, "review_quality")` snapshots Quality's ID from `ctx` (not a DB join). After Security completes, `_stamp_tessl_run_id` persists Security's own review run ID.

## Acceptance Criteria (GWT)

### Scenario 1 — Security review row written separately from Quality

**Given** a scan_run has a completed `Tessl: Review (Quality)` row
**When** the Tessl runner executes the Security Review step
**Then** a separate `scan_run_scanners` row with `scanner_source = "Tessl: Review (Security)"` is written
**And** the Quality Review row is unchanged

### Scenario 2 — Shared adapter parameterised correctly

**Given** `_run_tessl_review(judge_type="security", ...)` is called
**When** the underlying CLI invocation runs
**Then** the command is `tessl review run security <path> --workspace <ws>`
**And** the result is written to the Security row only

### Scenario 3 — upstream_run_ids links to Quality Review via ctx

**Given** `ctx["review_quality"] = "rev_abc123"` from the same `run_tessl()` invocation
**When** Security Review starts
**Then** `_attach_upstream_run_ids(row, ctx, "review_quality")` writes `upstream_run_ids = {"review_quality": "rev_abc123"}` **before** `review run security`
**And** after Security completes, `_stamp_tessl_run_id` writes Security's own `tessl_run_id`
**And** the dashboard can display Quality findings alongside Security findings for human prioritisation

### Scenario 4 — Security review proceeds without prior Quality Review ID

**Given** Quality Review did not produce a run ID (`ctx["review_quality"]` is null)
**When** Security Review runs
**Then** Security Review proceeds without the cross-read
**And** `upstream_run_ids = {"review_quality": null}` is written before invocation

## Files to touch

- `sandbox/scanners.py` — add security review step using `_run_tessl_review(judge_type="security", …)`; `_attach_upstream_run_ids(row, ctx, "review_quality")` before invoke; `_stamp_tessl_run_id` after success
- `prototypes/dc-dashboard/Tripwire.dc.html` — UI: show Quality findings alongside Security findings when `upstream_run_ids.review_quality` is populated (UI-level traceability, not CLI behavior)

## Before-Checks

- [x] Slice 47 ✅ (#109) on main; `_run_tessl_review(judge_type=…)` exists
- [x] Slice 50 merged (#113) — Security runs after Eval in `run_tessl()`
- [x] Branch `slice/51-review-security` created from main

## After-Checks

- [x] GWT-51.1 — separate `"Tessl: Review (Security)"` row; Quality unchanged
- [x] GWT-51.2 — `_run_tessl_review("security")` argv is `review run security`
- [x] GWT-51.3 — `upstream_run_ids.review_quality` attached before invoke; Security `tessl_run_id` stamped
- [x] GWT-51.4 — Security proceeds when Quality ID is null; explicit null in `upstream_run_ids`
- [x] Dashboard: Quality findings shown alongside Security when the Quality ID is populated
- [x] `pytest sandbox/tests/test_scanners_status.py sandbox/tests/test_ship_path_coverage.py` exit 0
- [x] Specification coverage: every GWT clause has ≥1 test
- [x] `./scripts/quality-gates.sh` passes locally
- [x] `/nw-review` APPROVED (mandatory before 🔀 close / ✅)

## Gate evidence fields

`coverage_pct`: target ≥ 80% for security review adapter code
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (c) 7(a) — mark as implemented

## Review & Approval

**Date**: 2026-08-25
**Reviewer**: nw-software-crafter-reviewer
**Verdict**: ✅ APPROVED

### Findings

**GWT Acceptance Criteria Coverage**:
- **GWT-51.1** — Separate `"Tessl: Review (Security)"` row; Quality row unchanged — ✅ PASS
- **GWT-51.2** — CLI parameterisation: `_run_tessl_review("security")` yields `tessl review run security <path> --workspace <ws>` — ✅ PASS
- **GWT-51.3** — upstream_run_ids carry-forward: `_attach_upstream_run_ids(row, ctx, "review_quality")` before invoke; `_stamp_tessl_run_id` after success — ✅ PASS (adversarial verified: progress callback validates attach point before _run)
- **GWT-51.4** — Null-safe execution: Security proceeds when Quality ID is null; explicit `{"review_quality": null}` written — ✅ PASS

**Dashboard UI Integration**:
- `securityQualityLink()` extracts Quality run ID from `upstream_run_ids.review_quality` — ✅ PASS
- `linkedQualityFindingsForSecurity()` filters findings to Quality source when link populated — ✅ PASS
- HTML template wires both functions (Tripwire.dc.html lines 938–939, 1740–1744) — ✅ PASS (regex validated in test line 687)
- 4 unit tests + 4 UI tests = 8 total; budget for 4 AC = 8 max — ✅ PASS

**Quality Gates**:
- Coverage: sandbox 95.6% / scanners.py 96.0% (fail-under 95) — ✅ PASS
- Complexity: xenon scanners.py max-absolute D (exit 0) — ✅ PASS
- pytest: 142 tests passed — ✅ PASS
- ruff/mypy/bandit/pip-audit/gitleaks — ✅ PASS
- Test modification (G9): CLEAN — ✅ PASS
- Testing theater: NONE DETECTED — ✅ PASS

**Adversarial Refutation (5 Lenses)**:
1. **Correctness**: Removing `_attach_upstream_run_ids` → test assertion at line 2816 fails; removing `finished["upstream_run_ids"] = upstream` → final row carries no link. **SURVIVED**.
2. **Wiring**: Security row is present at index [4]; row is emitted to callback before CLI invoke. **SURVIVED**.
3. **Oracle Soundness**: All assertions verify observable behavior (row structure, IDs, command args, filtering); no tautologies. **SURVIVED**.
4. **Guard Consistency**: Null checks present in `securityQualityLink()` line 466 and preflight line 1719; nulls explicitly written. **SURVIVED**.
5. **Scope Creep**: Declared GWT + UI + filter function is minimal and on-spec. **SURVIVED**.

### No Blocking Issues

✅ All four GWT scenarios implemented and tested
✅ All acceptance criteria met
✅ No test modifications (G9 clean)
✅ No testing theater (zero-assertion, tautological, mock-dominated, circular patterns: NONE)
✅ Port-to-port entry via `run_tessl()`
✅ External validity confirmed (feature is reachable and wired)
✅ Test budget respected (8/8)
✅ Coverage above threshold (96.0% vs 95%)
✅ Design spec implemented (§(c) 7(a))

---
