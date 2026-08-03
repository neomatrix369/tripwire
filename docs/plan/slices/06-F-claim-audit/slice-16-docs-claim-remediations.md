# Slice 16: Docs Claim Remediations (Realtime / Demo / Prototype)

> Scenario: Brownfield | MoSCoW: **Won't (A)** | Status: 📦 DEFERRED (demo/hackathon over 2026-08-02 — reinstate if needed)

Normal-user Mock-select + setup honesty lives in **slice 17**. Realtime/prototype claim rows may still appear in slice 15 audit without requiring this remediation slice.

## Slice Workflow Bundle
- Slice name: slice-16-docs-claim-remediations
- Files: `docs/STATUS.md`, `QUICKSTART.md`, `prototypes/README.md`, optionally
  `README.md` demo copy
- Exit criteria: Public prose matches code for Realtime poll timing, demo Mock
  selection vs Live default, and prototype vs Horizon A ship-UI wording; badges/
  Guard Future remain as left by slice 7.
- Commit pattern: `docs(slice-16): realtime demo prototype claim sync`

## Branch
`slice/16-docs-claim-remediations`

## Context references (mandatory)
- Code: `prototypes/dc-dashboard/Tripwire.dc.html` (poll 8s / 30s; default `live`)
- Matrix: `docs/plan/coverage-audit.md`
- Findings: slice 15 artifact
- SoT: `internal-docs/00_build/` + DECISIONS (ship UI = dc-dashboard)

## Spec (GWT / User Story)
**Given** slice-15 FAIL/PARTIAL rows for Realtime timing, demo Mock path, prototype
disclaimer vs ship UI
**When** STATUS / QUICKSTART / prototypes README are edited
**Then** docs state: Realtime ~1s + 8s poll fallback + 30s poll while Realtime
connected and items running; Normal users must select Mock (default remains Live);
`prototypes/dc-dashboard` is Horizon A ship UI living under `prototypes/`

## Out of scope (already exists)
- Badge / Guard Future / Nightly honesty — **slice 7 Gate A**
- Coverage floor raise — slices 11–13
- Slice 4 Remotion

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 15 ✅ (or explicit waiver with DECISIONS row)
- [ ] Open Tripwire.dc.html poll + dataSourceMode lines

## TDD Execution
Docs-only. Prefer precise one-line updates over rewrites.

## After-Checks [GATE]
- [ ] STATUS Realtime claim matches code
- [ ] QUICKSTART Demo path tells operator to select Mock
- [ ] prototypes README acknowledges Horizon A ship UI
- [ ] Regression: Overmind/Ossprey badges still absent
- [ ] Gate evidence `docs/plan/gate-evidence/slice-16.json` at PASS

## Gate Status
📦 DEFERRED — not on Horizon A execute path. Reinstate if a new demo or claim-remediation need arises.

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 |
| Next-session notes | No active work; slice 15 audit-only OK without 16 |
