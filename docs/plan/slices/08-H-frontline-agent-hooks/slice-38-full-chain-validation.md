# Slice 38: Full-Chain Validation

> Scenario: Brownfield | MoSCoW: Should | Phase: H6 | Depends on: 34; 36 if access; 37

## Outcome

The Frontline agent-hooks chain is validated end-to-end: setup → enforce → scan
→ verify → optional DepShield/Ossprey dispatch → CLI monitoring → live
`/tw-self-check` as an explicit validation step — proving Phase H4–H6 pieces
compose, not only unit paths.

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS`.

1. **Operator can run the full validation chain** `@contract-shape:bounded-change`
   - Given slices 34 and 37 PASS, and 36 PASS when Ossprey access was available
     (else Ossprey steps skipped per DECISIONS),
     when the operator executes the documented full-chain checklist/script,
     then each stage records an observable pass/fail and the chain exits with a
     single accountable overall result.
2. **Live `/tw-self-check` is an explicit validation step** `@contract-shape:bounded-change`
   - Given the five `/tw-*` skills are installed,
     when the full-chain validation reaches the self-check stage,
     then `/tw-self-check` is invoked live (not mocked away) and its tabular/
     JSON outcome is recorded in gate evidence.
3. **Skipped Ossprey path is explicit when access absent** `@contract-shape:unbounded-preservation`
   - Given slice 35 remained BLOCKED / Ossprey not PASSed,
     when full-chain runs,
     then evidence records `ossprey: SKIPPED (access)` rather than false PASS.

## Design / test treatment

- Prefer a scripted checklist under `scripts/` or docs-plan evidence commands;
  keep AT budget ≤7 (parametrized stages count as one where applicable).
- **Must** include live `/tw-self-check` as a named step (main_prompt Phase 5 /
  SEQUENCE 13 expectation).
- Depends: **34** required; **37** required; **36** required only if Ossprey
  access was confirmed (else document skip).
- Coverage: validation harness may be docs/script-heavy; product-code changes
  still enforce complexity; otherwise N/A with reason.

**Test inventory (≤7 acceptance tests):** chain happy path; self-check live step;
Ossprey skip-when-blocked; DepShield stage present; monitoring stage present;
failure-at-stage accountability (optional).

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] `docs/plan/gate-evidence/slice-34.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] `docs/plan/gate-evidence/slice-37.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] Ossprey: `docs/plan/gate-evidence/slice-36.json` has `"verdict": "PASS"` **or** DECISIONS records skip because access never confirmed
- [ ] Branch `slice/38-full-chain-validation` created from Wave H integration branch
- [ ] Full-chain checklist/script path named in evidence before execution

## TDD execution

RED: encode checklist stages as failing until each observable stage is wired.
GREEN: implement only glue/script/assertions required for the chain.
REFACTOR: keep stage skips explicit in evidence JSON.

## After-Checks [GATE]

- [ ] Full-chain checklist/script exit recorded; every stage has PASS/FAIL/SKIP
- [ ] Live `/tw-self-check` invocation and output captured in `docs/plan/gate-evidence/slice-38.json`
- [ ] Ossprey stage is PASS or explicit SKIP with DECISIONS reference
- [ ] `./scripts/quality-gates.sh` exit 0 if product code changed; else N/A with reason
- [ ] Coverage/complexity policy applied per product vs docs/script delta
- [ ] Review APPROVED; evidence verdict `PASS`

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README / operator docs | Link full-chain validation |
| 2 | Inline comments | Script stage labels |
| 3 | Function signatures | N/A unless harness module |
| 4 | Error paths | Stage-failure messaging |
| 5 | CHANGELOG | If public validation command ships |
| 6 | Architecture | End-to-end sequence note |
| 7 | API / CLI | Validation entrypoint if any |
| 8 | Config/env vars | Prerequisites listed |
| 9 | Examples | Full-chain command/checklist |
| 10 | Deprecated features | N/A |
| 11 | Migration guide | N/A |
| 12 | Troubleshooting | SKIP vs FAIL semantics |
| 13 | Related links | 34/36/37 → 38 → 39 |
| 14 | No orphaned file references | OK |

## Gate Status

📋 PLANNED
