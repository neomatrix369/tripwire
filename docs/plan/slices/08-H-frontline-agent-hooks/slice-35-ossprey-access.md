# Slice 35: Ossprey Access Provisioning

> Scenario: Brownfield | MoSCoW: Should | Phase: H5 | Depends on: 32

## Outcome

Ossprey credentials/access are confirmed and recorded so Tripwire may later
dispatch to Ossprey (slice 36). Until access is confirmed in `DECISIONS.md`,
this slice stays blocked — no secret material is invented in plan stubs.

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS` **after unblock**.

1. **Operator has confirmed Ossprey access** `@contract-shape:bounded-change`
   - Given Ossprey access is OPEN,
     when credentials/endpoints are provisioned and validated,
     then `DECISIONS.md` records confirmation (date, owner, non-secret proof)
     and evidence notes how validation was performed (without storing secrets).
2. **Slice 36 remains gated until confirmation** `@contract-shape:unbounded-preservation`
   - Given access is not yet confirmed,
     when planners review Phase H5,
     then slice 36 Before-Checks stay unmet and no Ossprey dispatch product work starts.

## Design / test treatment

- **Docs/ops slice**, not scanner implementation: provisioning checklist,
  env-var names (values out of band), and DECISIONS confirmation row.
- Do **not** commit secrets. Prefer references to secret stores / `.env` keys
  already documented under user-guide patterns.
- Complexity: **N/A for docs-only** with reason in evidence once unblocked and
  closed as docs/ops; if any product code appears, enforcing applies.
- Coverage target: N/A while docs-only; TBD if validation harness code is added.

**Test inventory (≤7):** prefer checklist + recorded probe commands over
automated ATs; if a non-secret connectivity probe script is added, count it
within budget.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] **Blocked until access:** Ossprey credentials/access confirmed in `docs/plan/DECISIONS.md` (status currently OPEN — do not start provisioning work that assumes access)
- [ ] Branch `slice/35-ossprey-access` created only after unblock (or branch holds docs checklist only)
- [ ] Secret handling rules acknowledged (no secrets in git / evidence JSON)

## TDD execution

N/A while 🔴 BLOCKED. After unblock: capture provisioning checklist evidence
first; add a minimal connectivity probe only if needed for binary After-Checks.

## After-Checks [GATE]

- [ ] `DECISIONS.md` row confirms Ossprey access (date, owner, non-secret proof)
- [ ] **Live CLI reconcile:** pinned `ossprey-cli` `--help`, OSSBOM `-o` sample, and stdout verdict wording recorded in gate evidence (adapter stays RESEARCH until this passes — see slice 36)
- [ ] Env/key names documented in the approved user-guide/env path (no secret values)
- [ ] Evidence JSON updated: `gate_status` leaves `BLOCKED`, records commands/checklist, verdict `PASS` when closed
- [ ] Complexity: **N/A docs-only** with reason in evidence (or enforcing if product code)
- [ ] Review per GATE_CONTRACT (docs-only exception allowed if recorded in DECISIONS)

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README badges | Do **not** claim Ossprey until dispatch VERIFIED |
| 2 | Inline comments | N/A unless probe code |
| 3 | Function signatures | N/A docs-only |
| 4 | Error paths | Document access-denied / missing-key guidance |
| 5 | CHANGELOG | N/A until public capability ships |
| 6 | Architecture | Future scanner note only if accurate |
| 7 | API doc | N/A |
| 8 | Config/env vars | Key **names** only |
| 9 | Examples | Provisioning checklist link |
| 10 | Deprecated features | N/A |
| 11 | Migration guide | N/A |
| 12 | Troubleshooting | Access OPEN / blocked messaging |
| 13 | Related links | DECISIONS ↔ slice 36 |
| 14 | No orphaned file references | OK |

## Gate Status

🔴 BLOCKED (access OPEN) — blocked until `DECISIONS.md` confirms Ossprey credentials/access
