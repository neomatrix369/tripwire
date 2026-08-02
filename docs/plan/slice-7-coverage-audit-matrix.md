# Slice 7: Coverage Audit Matrix + Docs Parity

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-7-coverage-audit-matrix
- Files:
  - Public badge/partner strip: `README.md`, `QUICKSTART.md`, `CONTRIBUTING.md`,
    `SECURITY.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `docs/README.md`,
    `prototypes/README.md`, `fixtures/README.md`,
    `prototypes/dc-dashboard/Tripwire.dc.html`,
    `.github/workflows/ci.yml`, `.github/workflows/nightly.yml`,
    `.github/dependabot.yml`
  - Trust one-liners: `docs/ARCHITECTURE.md` (Guard → Future), `CONTRIBUTING.md`
    (Nightly mutmut/Chalk non-gating)
  - Plan refs: `docs/STATUS.md` DECIDED, `docs/plan/PROGRESS.md` Forward
  - Matrix: `docs/plan/coverage-audit.md`, `docs/plan/DECISIONS.md`
- Exit criteria:
  1. Overmind/Ossprey absent from public badges/HTML footer/CI comments (grep clean;
     TRAIL Forward Won't text may remain)
  2. Guard not presented as current C4 L2 container (Future section)
  3. CONTRIBUTING Nightly notes mutmut/Chalk as non-gating (`|| true`)
  4. Stale `plan/coverage-slices-7-14` branch refs fixed (main / per-slice branches)
  5. `coverage-audit.md` exists with ship-path behavior matrix + internal-docs↔docs
     parity deltas + claim themes + altitude notes
  6. No CI floor raise in this slice
- Commit pattern: `docs(slice-7): trust strip + coverage audit matrix`
  (split commits OK on same branch)

## Branch
`slice/7-coverage-audit-matrix`

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md`
- Build gates: `internal-docs/00_build/build-day-decisions.md`
- Adapter research: `internal-docs/00_build/research/scanner-output-adapters.md`
- Demo lens: `internal-docs/01_demo_video/00-tripwire-demo-script.md`
- Public pair: `docs/STATUS.md`, `docs/ARCHITECTURE.md`,
  `docs/research/adapters/scanner-output-adapters.md`, `docs/plan/*`
- Non-SoT: do not use `internal-docs/02_prototypes/import-stash/` as truth

## Spec (GWT / User Story)

**Gate A — public trust (first)**
**Given** Overmind/Ossprey badges and partner strings imply current capability, and
Phase 5/Ossprey are Won't / unwired
**When** slice 7 trust pass runs
**Then** those badges/strings are removed; Guard is Future-only in ARCHITECTURE;
Nightly non-gating is honest in CONTRIBUTING; STATUS/PROGRESS branch refs match main

**Gate B — coverage audit matrix**
**Given** Horizon-A STATUS, slices 1–6 evidence, internal-docs SoT, and measured
coverage (~47% Python; no Node gates)
**When** the coverage audit runs
**Then** `docs/plan/coverage-audit.md` lists each ship-path / Done-when / demo
must-show capability as AT / unit / missing, records internal↔public parity deltas
(incl. Realtime timing, demo Mock vs Live default, prototype vs ship for later
slices), and locks targets (ship-path ~95%; exclude guard/support.js)

## Out of scope (already exists)
- Re-running slice-5 gate-evidence backfill
- Raising `fail_under` or adding Node coverage tools (slices 11–13)
- Full Realtime/demo/prototype prose remediations (slice 16 — matrix only seeds rows)
- Full claim-audit canvas + Live 3B (slice 15)

## Before-Checks [GATE]
- [ ] Branch created (`slice/7-coverage-audit-matrix`)
- [ ] Task file opened
- [ ] Context pack opened (internal-docs 00_build + demo script + docs/STATUS)
- [ ] Confirmed no prior `docs/plan/coverage-audit.md`
- [ ] Inventory Overmind/Ossprey hits (markdown, HTML footer, workflow comments)

## TDD Execution
Docs-only.
1. **Trust strip first** — badges, HTML footer, CI comments, Guard Future, Nightly
   honesty, branch-ref fixes; DECISIONS sync-docs row
2. **Matrix** — seed from spec Done-when + build-day 3-lite + demo must-show +
   STATUS IMPLEMENTED + nw-review claim themes

## After-Checks [GATE]
- [ ] Grep: no public Overmind/Ossprey **badges** / HTML partner lines / CI comment
      partner lists (TRAIL Forward Won't OK)
- [ ] ARCHITECTURE: Guard only under Future (not current L2 container)
- [ ] CONTRIBUTING: Nightly mutmut/Chalk marked non-gating
- [ ] STATUS/PROGRESS: no stale `plan/coverage-slices-7-14` as current execute branch
- [ ] `docs/plan/coverage-audit.md` committed
- [ ] Specification coverage: every matrix row has AT/unit/missing label
- [ ] DECISIONS rows: sync-docs badge strip; 95% / ship-path / Live E2E Won't-for-CI
- [ ] Acceptance criteria met
- [ ] Gate evidence `docs/plan/gate-evidence/slice-7.json` at PASS

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README / public badges | Updated — Overmind/Ossprey removed |
| 2 | ARCHITECTURE | Guard Future; badges removed |
| 3 | CONTRIBUTING | Nightly honesty; badges removed |
| 4 | STATUS / PROGRESS | Branch refs + badges |
| 5–14 | Plan artifact + cross-links | coverage-audit.md ↔ TRAIL/PROGRESS |

## Gate Status
📋 PLANNED — stub amended 2026-08-02 (trust strip = first gate)

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1–2 (~25–50 min) |
| Execution time | — |
| Blockers encountered | — |
| Next-session notes | Execute Gate A then B; then slice 8 |
