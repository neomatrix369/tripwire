# Slice 52 — ID Lineage Cross-Reads + UI Side-by-Side Findings

**Wave**: 12-L  
**MoSCoW**: Could  
**Depends on**: 49, 50, 51  
**Status**: 📋 PLANNED  
**Read time**: ~4 min

## Context

Wires the full ID lineage cross-read described in the design doc: each downstream feature fetches prior features' findings via `tessl <cmd> view <id> --json` using `upstream_run_ids`, and the dashboard displays cross-linked findings side-by-side for human review prioritisation.

This is a Could slice — the `upstream_run_ids` column is populated by earlier slices (46–51), but the UI rendering and the `tessl review view <id> --json` fetch call are deferred here.

Design reference: `docs/design/tessl-5-row-expansion.md § (c) ID Lineage Cross-Reads`

**Prerequisite**: Coverage Gaps A and B must be resolved. If `tessl scenario view <id>` is not supported (Gap B), the scenario_gen entry in `upstream_run_ids` remains null and this slice documents the gap.

## Acceptance Criteria (GWT)

### Scenario 1 — Security Review fetches Quality findings via run ID

**Given** Security Review's `upstream_run_ids.review_quality = "rev_abc123"`  
**When** the dashboard renders the Security Review expanded section  
**Then** Quality findings fetched via `tessl review view rev_abc123 --json` are shown alongside Security findings  
**And** the fetch result is cached in the expanded view (not re-fetched on every render)

### Scenario 2 — Scenario Generation cross-read documented when CLI injection unavailable

**Given** the agent-assisted scenario generation path (Coverage Gap C) is not usable in Modal sandbox  
**When** the Scenario Generation row is expanded in the dashboard  
**Then** the Quality findings are shown as a "context for review" panel (UI-level only)  
**And** the `upstream_run_ids.review_quality` link is visible so a human can inspect Quality findings before reviewing generated scenarios

### Scenario 3 — Null upstream_run_ids handled gracefully

**Given** a feature has `upstream_run_ids = null` or `upstream_run_ids.review_quality = null`  
**When** the dashboard renders the expanded section  
**Then** no cross-linked findings panel appears  
**And** no error is thrown

## Files to touch

- `prototypes/dc-dashboard/Tripwire.dc.html` — expanded section: add cross-linked findings panel when `scv.upstream_run_ids.review_quality` is populated; fetch `tessl review view <id> --json` via the existing Supabase/API pattern (or store fetched findings in `detail` at scan time)
- `sandbox/scanners.py` — optionally: fetch and store Quality findings in the Security/Scenario Gen row's `detail` at scan time (simpler than a live UI fetch)

## Open Question dependency

If storing cross-read findings in `detail` at scan time (server side, in the adapter) is preferred over a live dashboard fetch, this slice becomes pure backend work and the dashboard change is minimal. Decide before implementation.

## Gate evidence fields

`coverage_pct`: target ≥ 75% for any new Python fetch code  
`complexity_tool`: ruff/radon  
`doc_audit`: design doc § (c) — mark 7(a) and 7(b) as implemented; update 7(c) notes
