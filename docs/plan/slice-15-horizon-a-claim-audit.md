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
- Remediating FAIL rows (slice 16 / coverage wave)
- Phase 4/5 product implementation
- Raising coverage floors

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 7 ✅ (matrix + trust strip)
- [ ] Context pack + coverage-audit.md opened

## TDD Execution
Docs/audit-only. Findings canvas or `docs/plan/claim-audit.md`.

## After-Checks [GATE]
- [ ] Claim inventory closed with evidence paths
- [ ] Unit suite results recorded
- [ ] Live 3B attempt logged or 3C asked
- [ ] Gate evidence `docs/plan/gate-evidence/slice-15.json` at PASS

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1–2 |
| Next-session notes | Slice 16 remediates remaining FAIL docs |
