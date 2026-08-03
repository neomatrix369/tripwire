# Slice 13: Live ACL Coverage Gate ≥95% (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-13-live-acl-coverage-gate-95
- Files: `prototypes/dc-dashboard/package.json`, `tripwire-live.js`, `tripwire-status.js`, `tripwire-realtime.js`, `tripwire-data.js`, `test/*`, CI if dashboard tests run in CI
- Exit criteria: Coverage on Live ACL modules only ≥95%; **not** `support.js` / Mock chrome; hole-fill only.
- Commit pattern: `ci(slice-13): live acl coverage gate 95`

## Branch
`slice/13-live-acl-coverage-gate-95`

## Context references (mandatory)
- Demo lens: private references (Detection + Sandbox must-show)
- Spec: private references
- Audit: `docs/plan/coverage-audit.md`
- Existing ATs: slices 2–3 (`tripwire-live.test.js`, status tests)

## Spec (GWT / User Story)
**Given** GWT-1/2 mapping tests and no coverage gate on ACL modules
**When** coverage is gated on the four Live ACL files
**Then** CI (or documented npm script enforced in CI) fails below 95%; support.js excluded

## Out of scope (already exists)
- Rewriting GWT-1/2 acceptance mapping tests
- Covering `support.js` / `Tripwire.dc.html` presentation
- Live Modal/Supabase E2E as CI Must (Won't)

## Before-Checks [GATE]
- [x] Branch created
- [x] Slices 2–3 ✅
- [x] Confirm no coverage gate in dc-dashboard package.json

## TDD Execution
Instrument ACL modules → measure → fill holes → gate ≥95%.
VERIFY: `cd prototypes/dc-dashboard && npm test` (with coverage)

## After-Checks [GATE]
- [x] `cd prototypes/dc-dashboard && npm test` (with coverage) exit 0
- [x] Measured ≥95% on Live ACL file set; `%` + file list in evidence
- [x] `support.js` excluded from the 95% denominator (config or evidence note)
- [x] CI or package script enforces the gate (command/job named in evidence)
- [x] `docs/plan/gate-evidence/slice-13.json` has `"verdict": "PASS"` + `commands[]`
- [x] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
✅ PASSED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
