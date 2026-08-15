# Slice 26: API Output Contract

> Scenario: Brownfield | MoSCoW: Must | Depends on: 25

## Outcome

Documented contract for actual `tripwire scan` JSON output and the mapping from Supabase `heatmap_status` to the six UI states (`fresh` / `stale` / `unscanned` / `scanning` / `not-found` / `red`). Shared human Markdown table and machine JSON shape match `internal-docs/04_frontline/main_prompt.md`.

**SSOT path:** `docs/user-guide/frontline-output-contract.md`

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; docs-only binary checks.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Six states + heatmap mapping | `@US-26` | `docs/user-guide/frontline-output-contract.md` |
| 2 | Human table columns fixed | `@US-26` | same contract doc |
| 3 | Machine JSON fields fixed | `@US-26` | same contract doc |
| 4 | Scan JSON introspection | `@walking_skeleton` `@US-26` | `cli/src/orchestrator.js` + contract BACKLOG |

1. **Six states are named and mapped** `@US-26`
   - Given `docs/user-guide/frontline-output-contract.md`,
     when an operator looks up each UI state,
     then `fresh`, `stale`, `unscanned`, `scanning`, `not-found`, and `red` each
     appear, and Supabase `heatmap_status` values `green` / `amber` / `red` /
     `grey` / `error` are mapped (with lifecycle states `stale` / `scanning` /
     `not-found` explicitly marked as not heatmap enums).
2. **Human table columns are fixed** `@US-26`
   - Given the contract doc,
     when rendering a verify/scan response,
     then the human Markdown table columns are Name | Type | Status | Note.
3. **Machine JSON shape is fixed** `@US-26`
   - Given the contract doc,
     when emitting machine output,
     then each artifact documents `name`, `resolved_path`, `type`, `state`,
     `rag`, `scanned_at`, `stale`, `will_be_blocked`, `note`.
4. **Scan JSON introspection recorded** `@walking_skeleton` `@US-26`
   - Given `cli/src/orchestrator.js` `runScan` stdout fields
     (`batch_id`, `scan_run_ids`, `failed_targets`),
     when the contract is finalized for H2 skills,
     then those fields are documented and BACKLOG states that dual-output
     rows are composed from Supabase + resolution — not invented from scan stdout.

**Test inventory (4 acceptance tests):**
`guard/tests/test_frontline_output_contract.py`

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_frontline_output_contract.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Docs-only primary. No product-code change required.
- Coverage: **N/A** — documentation + characterization of existing orchestrator/
  guard surfaces; no new production modules.
- Complexity: **N/A for docs-only** with reason in gate evidence.

## Design / test treatment

- Docs-first contract slice: introspect existing CLI/API; do not invent fields.
- Single SSOT under `docs/user-guide/frontline-output-contract.md`, linked from
  docs index and skills work in 27–30.
- **AT design complete** — ready for 🔨 IN PROGRESS.

## Before-Checks [GATE]

- [x] Slice 25 gate-evidence `verdict` is `PASS` and human H2 checkpoint recorded
      (PR #76 merged; operator sign-off DECISIONS 2026-08-15 + this slice start)
- [x] Branch `slice/26-api-output-contract` created from Frontline integration
      (DECISIONS Wave H branch-base waiver)
- [x] `rg -n "heatmap_status|OUTPUT FORMAT|will_be_blocked" internal-docs/04_frontline/main_prompt.md` recorded in evidence
- [x] Coverage target N/A — docs-only (reason: no product code)

## TDD execution

RED: add contract presence / mapping GWTs (`rg` or schema fixture assertions).
GREEN: write the shared human+machine contract doc from introspection.
REFACTOR: keep BACKLOG fields explicit; no silent invention.

## After-Checks [GATE]

- [x] Contract doc exists at the path recorded in gate evidence
- [x] `rg` / tests prove all six states and Name|Type|Status|Note columns
- [x] Machine JSON example matches main_prompt shape (or BACKLOG deltas listed)
- [x] Named check command(s) exit 0 (record in gate evidence)
- [x] Coverage/complexity: **N/A for docs-only** with reason in evidence
- [x] `docs/plan/gate-evidence/slice-26.json` records commands, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: docs-only exception in DECISIONS (2026-08-15)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 26 ✅ (after merge to Frontline)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | Human Markdown table + machine JSON published | PASS — frontline-output-contract.md |
| 2 | heatmap_status → six UI states mapping complete | PASS |
| 3 | Links to main_prompt + skill slices 27–30 | PASS |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

🔀 ON BRANCH
