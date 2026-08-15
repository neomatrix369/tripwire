# Slice 39: FE/BE Rearchitecture

> Scenario: Brownfield | MoSCoW: Could | Phase: H6 | Depends on: 38

## Outcome

**Hackathon-too-large (flagged):** redesign the Frontline integration layer’s
FE/BE boundaries only if explicitly pulled into scope after full-chain
validation. Default posture is deferred — Wave H success does **not** require
this slice.

## GWT acceptance specification

> Thin scaffolds — expand only if this Could is explicitly pulled in before
> `IN PROGRESS`.

1. **Operator-facing integration remains coherent after rearchitecture** `@contract-shape:bounded-change`
   - Given slice 38 PASS and an explicit pull-in decision in DECISIONS,
     when FE/BE boundaries are redrawn,
     then hooks, `/tw-*` skills, and dispatch adapters remain behaviourally
     equivalent under a recorded characterization suite.
2. **No silent behaviour change without evidence** `@contract-shape:unbounded-preservation`
   - Given the rearchitecture lands,
     when Phase H1–H6 regression (including `/tw-self-check`) runs,
     then full-chain validation still PASSes or deltas are DECISIONS-waived.

## Design / test treatment

- **Default: do not execute.** Treat as backlog architecture spike unless
  DECISIONS records pull-in with owner and time-box.
- If pulled in: split into smaller Must/Should follow-ons rather than one
  mega-slice; prefer strangler seams over big-bang rewrite.
- Coverage/complexity: enforcing for product-code if activated; N/A while deferred.

**Test inventory (≤7):** only if activated — characterization of hooks + skills
+ dispatch before/after.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] `docs/plan/gate-evidence/slice-38.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] **Pull-in required:** DECISIONS row explicitly activates slice 39 (otherwise remain 📦 DEFERRED)
- [ ] Branch created only after pull-in; hackathon time-box recorded

## TDD execution

N/A while 📦 DEFERRED. After pull-in: characterization RED before structural moves.

## After-Checks [GATE]

- [ ] Only applicable after pull-in: characterization + full-chain re-PASS
- [ ] Evidence records architecture delta paths and review APPROVED
- [ ] Complexity enforcing for product-code; coverage target set at AT design
- [ ] While deferred: no After-Checks claimed; evidence stays `DEFERRED` / `NOT_RUN`

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README | No FE/BE rewrite claims while deferred |
| 2 | Inline comments | N/A while deferred |
| 3 | Function signatures | N/A while deferred |
| 4 | Error paths | N/A while deferred |
| 5 | CHANGELOG | N/A while deferred |
| 6 | Architecture | Update only if pull-in ships |
| 7 | API doc | N/A while deferred |
| 8 | Config/env vars | N/A while deferred |
| 9 | Examples | N/A while deferred |
| 10 | Deprecated features | Mark old seams if rewrite ships |
| 11 | Migration guide | Required if pull-in ships |
| 12 | Troubleshooting | N/A while deferred |
| 13 | Related links | TRAIL Could / DEFERRED |
| 14 | No orphaned file references | OK |

## Gate Status

📦 DEFERRED (default) — hackathon-too-large; reinstate only via explicit DECISIONS pull-in after slice 38
