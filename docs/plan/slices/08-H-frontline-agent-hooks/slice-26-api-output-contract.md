# Slice 26: API Output Contract

> Scenario: Brownfield | MoSCoW: Must | Depends on: 25

## Outcome

Documented contract for actual `tripwire scan` JSON output and the mapping from Supabase `heatmap_status` to the six UI states (`fresh` / `stale` / `unscanned` / `scanning` / `not-found` / `red`). Shared human Markdown table and machine JSON shape match `internal-docs/04_frontline/main_prompt.md` (with Wave H deltas below).

**Delta (2026-08-25):** Human columns gain **Quality**; machine JSON gains nullable `quality_score`; shared blocked message is a **table footer** when any `will_be_blocked`. Evidence state: **DECIDED**.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Six states are named and mapped**
   - Given the contract doc, when an operator looks up each UI state, then `fresh`, `stale`, `unscanned`, `scanning`, `not-found`, and `red` each have a defined display and source mapping from `heatmap_status` / resolution.
2. **Human table columns are fixed**
   - Given the contract doc, when rendering a verify/scan response, then the human Markdown table columns are **Name | Type | Status | Quality | Note**.
   - Quality cell format: **`N/100`** when `quality_score` is present (Tessl skill-review axis, 0–100, higher better); otherwise `—`.
3. **Machine JSON shape is fixed**
   - Given the contract doc, when emitting machine output, then each artifact includes at least `name`, `resolved_path`, `type`, `state`, `rag`, `scanned_at`, `stale`, `will_be_blocked`, `quality_score` (nullable number), `note` (or an explicit backlog note for fields pending API introspection).
4. **Blocked footer contract**
   - Given any artifact with `will_be_blocked=true`, when the human table is rendered, then **Will be blocked when Tripwire is enabled** appears once under the table (not repeated in every Note). Distinct per-row notes remain in Note.
5. **Scan JSON introspection recorded**
   - Given a live or fixture `tripwire scan` response, when the contract is finalized for H2 skills, then the documented fields match observed output (or mark BACKLOG fields explicitly).

## Design / test treatment

- Docs-first contract slice: introspect existing CLI/API; do not invent fields.
- Prefer a single SSOT doc under `docs/` (or frontline plan path) linked from skills work in 27–30.
- Quality maps to persisted `items.quality_score` (same axis as Live / user-guide Tessl quality glossary) — not risk.
- **AT design required before IN PROGRESS** — may be docs-only with binary `rg`/file checks; note complexity N/A with reason if no product code.

## Before-Checks [GATE]

- [ ] Slice 25 gate-evidence `verdict` is `PASS` and human H2 checkpoint recorded
- [ ] Branch `slice/26-api-output-contract` created from current `main`
- [ ] `rg -n "heatmap_status|OUTPUT FORMAT|will_be_blocked" internal-docs/04_frontline/main_prompt.md` recorded in evidence
- [ ] Coverage target TBD / N/A reason drafted if docs-only

## TDD execution

RED: add contract presence / mapping GWTs (`rg` or schema fixture assertions) including Quality column and `quality_score`.
GREEN: write the shared human+machine contract doc from introspection.
REFACTOR: keep BACKLOG fields explicit; no silent invention.

## After-Checks [GATE]

- [ ] Contract doc exists at the path recorded in gate evidence
- [ ] `rg` proves all six states and Name|Type|Status|Quality|Note columns
- [ ] Machine JSON example includes `quality_score` (or BACKLOG deltas listed)
- [ ] Footer blocked-message contract documented
- [ ] Named check command(s) exit 0 (record in gate evidence)
- [ ] Coverage/complexity: **N/A for docs-only** with reason in evidence, else enforcing for any product-code touched
- [ ] `docs/plan/gate-evidence/slice-26.json` records commands, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 26 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | Human Markdown table + machine JSON published (Quality + footer) |
| 2 | heatmap_status → six UI states mapping complete |
| 3 | Links to main_prompt + skill slices 27–30 |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
