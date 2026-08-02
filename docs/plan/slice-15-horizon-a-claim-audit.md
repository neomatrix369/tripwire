# Slice 15: Horizon A Factual Claim Audit

> Scenario: Brownfield | MoSCoW: Should

## Slice Workflow Bundle
- Slice name: slice-15-horizon-a-claim-audit
- Files: canvases / findings artifact (or `docs/plan/claim-audit.md`), gate-evidence
- Exit criteria: Claim PASS/FAIL/PARTIAL table closed for Horizon A public claims vs
  code/config/SoT; Bugbot+Security on branch diff attempted; unit suites run; Live 3B
  attempted or blocked→3C requested. **Findings only** — no claim remediations here.
- Commit pattern: `docs(slice-15): horizon A claim audit findings`

## Branch
`slice/15-horizon-a-claim-audit`

## Priority note
Should-tier. Prefer after **slice 17** (onboarding docs) so claim audit sees user-guide paths; still depends on slice 7 for Gate A trust strip.

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md`
- Build gates: `internal-docs/00_build/build-day-decisions.md`
- Matrix seed: `docs/plan/coverage-audit.md` (slice 7)
- Public: `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `README.md`, `QUICKSTART.md`,
  `CONTRIBUTING.md`, `prototypes/README.md`

## Spec (GWT / User Story)
**Given** slice-7 coverage-audit.md and Gate A trust strip landed
**When** auditors run Bugbot + Security on branch changes, unit suites, Live 3B attempt,
and whole-repo claim close-out
**Then** a findings artifact marks each Horizon A claim PASS/FAIL/PARTIAL with path
evidence; Live result logged or 3C requested

## Out of scope
- Remediating FAIL rows (slice 16 📦 deferred with demo/hackathon; reinstate if needed)
- Phase 4/5 product implementation
- Raising coverage floors
- VO/Remotion / film-day claims (slice 4 📦)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 7 ✅ (matrix + trust strip)
- [ ] Context pack + coverage-audit.md opened

## TDD Execution
Docs/audit-only. Findings canvas or `docs/plan/claim-audit.md`.

## After-Checks [GATE]
- [ ] Findings artifact exists (`docs/plan/claim-audit.md` or canvas path) with every inventoried claim marked PASS/FAIL/PARTIAL + evidence path
- [ ] Unit suite command + result recorded in evidence (e.g. `npm test` / `pytest` counts)
- [ ] Live 3B attempt logged in evidence **or** 3C ask recorded in DECISIONS/PROGRESS
- [ ] No remediations required for ✅ (slice 16 📦); FAIL rows may remain documented
- [ ] `docs/plan/gate-evidence/slice-15.json` has `"verdict": "PASS"` + `commands[]`
- [ ] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1–2 |
| Next-session notes | Audit-only; slice 16 deferred — log FAIL rows; fix via 17 or reinstate 16 if needed |
