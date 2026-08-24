# Slice 52 — ID Lineage Cross-Reads + UI Side-by-Side Findings

**Wave**: 12-L
**MoSCoW**: Could
**Depends on**: 49, 50, 51
**Status**: 📋 PLANNED
**Read time**: ~5 min

## Context

Wires the full ID lineage cross-read described in the design doc: each downstream feature fetches prior features' persisted state via `tessl <cmd> view <id> --json` using `upstream_run_ids`, and the dashboard displays cross-linked findings side-by-side for human review prioritisation.

**Prerequisite (MUST — not optional)**: slices 47, 49, 50, and 51 must populate `upstream_run_ids` and `tessl_run_id` per the ID carry-forward contract in `docs/design/tessl-5-row-expansion.md § ID carry-forward contract`. Slice 52 assumes persisted JSON is authoritative; it does not reconstruct lineage from sibling row queries.

This is a Could slice — UI rendering and optional scan-time cross-read fetches are deferred here; **column population is owned by 47/49/50/51**.

Design reference: `docs/design/tessl-5-row-expansion.md § (c) ID Lineage Cross-Reads, § ID carry-forward contract`

**Coverage Gap status (2026-08-24, Tessl CLI + docs)**:

- **Gap A**: Partially resolved — capture run IDs via `view <id> --json` after async completion; `eval run --json` returns IDs immediately.
- **Gap B**: **Resolved** — `tessl scenario view <id>`, `tessl scenario download <id>`, `tessl eval view <id>`, and `tessl review view <id>` all support explicit IDs ([cli-commands](https://docs.tessl.io/reference/cli-commands)).
- **Gap C**: Still open — agent-assisted scenario generation not verified for headless Modal; UI shows Quality findings as context only.

## Acceptance Criteria (GWT)

### Scenario 0 — upstream_run_ids present on persisted rows (gate)

**Given** a completed Tessl 5-row scan where slices 47/49/50/51 have landed
**When** slice 52 reads `scan_run_scanners` rows from Supabase
**Then** Scenario Generation row has `upstream_run_ids.review_quality` set (or explicit null)
**And** Eval row has `upstream_run_ids.review_quality` and `upstream_run_ids.scenario_gen` set (or explicit null per key)
**And** Security row has `upstream_run_ids.review_quality` set (or explicit null)
**And** each row that completed a server-side Tessl command has its own `tessl_run_id` populated

### Scenario 1 — Security Review fetches Quality findings via run ID

**Given** Security Review's `upstream_run_ids.review_quality = "rev_abc123"`
**When** the dashboard renders the Security Review expanded section (or scan-time adapter stores cross-read in `detail`)
**Then** Quality findings fetched via `tessl review view rev_abc123 --json` are shown alongside Security findings
**And** the fetch result is cached (expanded view or row `detail`) — not re-fetched on every render

### Scenario 2 — Eval cross-reads scenario generation metadata via gen_id

**Given** Eval's `upstream_run_ids.scenario_gen = "gen_abc123"` (populated by slice 50)
**When** the Eval row expanded section renders (or scan-time adapter stores cross-read in `detail`)
**Then** scenario metadata fetched via `tessl scenario view gen_abc123 --json` is shown (generation status, scenario titles, checklist counts)
**And** the UI does **not** imply eval was invoked with that ID — eval used filesystem `evals/` (slice 50 contract)

### Scenario 3 — Scenario Generation cross-read when CLI injection unavailable

**Given** the agent-assisted scenario generation path (Coverage Gap C) is not usable in Modal sandbox
**When** the Scenario Generation row is expanded in the dashboard
**Then** Quality findings are shown as a "context for review" panel (UI-level only)
**And** `upstream_run_ids.review_quality` link is visible so a human can inspect Quality findings before reviewing generated scenarios
**And** when `upstream_run_ids.scenario_gen` or row `tessl_run_id` is set, a link to `scenario view <id>` metadata is shown

### Scenario 4 — Null upstream_run_ids handled gracefully

**Given** a feature has `upstream_run_ids = null` or a key such as `review_quality` / `scenario_gen` is null
**When** the dashboard renders the expanded section
**Then** no cross-linked panel appears for that missing key
**And** no error is thrown

## Files to touch

- `prototypes/dc-dashboard/Tripwire.dc.html` — expanded section: cross-linked findings panels when `scv.upstream_run_ids.*` is populated
- `sandbox/scanners.py` — optionally: fetch and store cross-read JSON in row `detail` at scan time (preferred for Modal — no live CLI from dashboard)

## Open Question dependency

If storing cross-read findings in `detail` at scan time (server side, in the adapter) is preferred over a live dashboard fetch, this slice becomes primarily backend work and the dashboard change is minimal. Decide before implementation.

## Gate evidence fields

`coverage_pct`: target ≥ 75% for any new Python fetch code
`complexity_tool`: ruff/radon
`doc_audit`: design doc § (c) — mark 7(a) and 7(b) as implemented; update 7(c) notes
