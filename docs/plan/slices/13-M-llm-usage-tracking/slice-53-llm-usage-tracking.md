# Slice 53 — LLM Usage Tracking and UI Cost Surfacing

**Wave**: 13-M (**M — LLM usage / cost observability**; ADR-0016 follow-on — not J/L/G)
**MoSCoW**: Should (Phase 1 Must-path inside slice; Phase 2 Should sandbox)
**Depends on**: none (independent of Wave L; complements ADR-0016 router)
**Status**: 📋 PLANNED — EFP-processed; `/nw-review` iteration 1 addressed in-doc
**Persona**: Tripwire operator running Live scans + dashboard (SRE / security engineer watching SIE/Model Studio spend)
**Read time**: ~6 min
**Design**: [`docs/design/llm-usage-tracking.md`](../../../design/llm-usage-tracking.md)
**Branch (when building)**: `slice/53-llm-usage-tracking`
**Plan folder**: `docs/plan/slices/13-M-llm-usage-tracking/`

---

## Motivation

Tripwire calls LLMs but does not show operators input/output/tokens/latency/cost. They cannot tell which UI/CLI paths burn credits.

**Scope locked:** best-effort everything over two phases — Phase 1 accurate router + Usage UI/CLI; Phase 2 Cisco/Tessl writers.

**Worked examples (DoR):**

1. Operator runs `tripwire route`; SIE returns usage; Usage tab summary ticks up; log stays collapsed until expanded — then the new row appears at the top.
2. Next day they re-route the same item; **both** transactions remain; drawer shows latest + collapsed Prior routes.
3. Phase 2: Skill Scanner `--use-llm` with no usage in console → historic `unknown` row in the log.

**Walking skeleton:** GWT-53.1 — operator-visible cost of one router call (table round-trip + Mock Usage row showing that event).

---

## Spec / GWT

### GWT-53.1 — Operator sees router call cost recorded

**Given** SIE credentials are configured and an in-memory/test Supabase store is injected
**When** routing completes a successful SIE chat completion with provider `usage`
**Then** a round-trip query of `llm_usage_events` returns one row with model, latency_ms, tokens, cost_basis in `{provider_usage,estimate}`, redacted/capped I/O
**And** the Mock Usage tab fixture/list includes that event (user-visible)

### GWT-53.2 — Failed router call still logs

**Given** a router HTTP call fails or returns empty content after retries
**When** routing finishes for that item
**Then** round-trip query finds an event with `error` set (tokens/cost may be null)
**And** prior router strips are not wiped (ADR-0016)

### GWT-53.3 — Cisco LLM lane best-effort event (Phase 2)

**Given** LLM key causes Skill `--use-llm` and console fixture under `sandbox/tests/testdata/llm_usage/`
**When** the scanner row completes
**Then** round-trip query finds an event for `cisco_skill_llm` with tokens if fixture has usage, else `cost_basis=unknown`

### GWT-53.4 — Tessl paid lane opaque event (Phase 2)

**Given** a Tessl review/scenario/eval/security row reaches a terminal status
**When** the sandbox persists that row
**Then** round-trip query finds an opaque event (`cost_basis=unknown`)

### GWT-53.5 — Usage tab: historic summary + collapsible transaction log

**Given** Mock/Live has multiple usage events across times (not only the latest)
**When** the operator opens the **Usage** tab
**Then** the summary strip shows aggregate totals over the selected window (not a single overwrite)
**And** the transaction log is **collapsed by default** with a visible count and optional “Last call …” line
**When** the operator expands the log
**Then** transactions appear newest-first with per-row expand for that call’s input/output only

### GWT-53.5b — Item drawer shows prior route costs

**Given** an item has two or more historic router usage events
**When** the operator opens the item drawer AI Routing section
**Then** latest hop cost is shown
**And** a collapsed **Prior routes** control expands to list earlier transactions for that item

### GWT-53.6 — Cost cues on spend-driving chrome

**Given** the Dashboard tab
**When** the operator focuses Escalated / SIE-only chips, AI Routing strip, or (Phase 2) LLM scanner tips
**Then** score-tip bubbles explain LLM cost class and show known tokens/$ or “unknown” (latest context), with Usage tab as the place for full history

### GWT-53.7 — CLI lists recent usage (historic)

**Given** Live/test store with multiple usage events
**When** `tripwire usage --limit N` runs
**Then** stdout lists up to N past rows (newest first): source, model, tokens, latency, cost_basis **without** full prompt bodies

### GWT-53.8 — Truncation and redaction

**Given** prompts containing Bearer tokens / `sk-` keys and/or >32 KiB text
**When** an event is persisted
**Then** stored text matches Redaction algorithm in the design doc; `*_truncated` / `meta.redacted` set appropriately; original secret samples absent from stored fields

---

## Acceptance checklist (formal AC)

- [ ] AC-1: Successful router call → queryable `llm_usage_events` row + visible on Usage (Mock)
- [ ] AC-2: Failed router call → error event; strips preserved
- [ ] AC-3: (Phase 2) Cisco LLM → event; usage or unknown
- [ ] AC-4: (Phase 2) Tessl paid → opaque event
- [ ] AC-5: Usage summary aggregates history; transaction log **collapsed by default**, expandable; per-row I/O expand
- [ ] AC-5b: Drawer shows latest + collapsible prior route costs for the item
- [ ] AC-6: Cost tips on Escalated / SIE-only / AI Routing
- [ ] AC-7: `tripwire usage` lists historic metadata only
- [ ] AC-8: Redaction + 32 KiB cap verified by tests
- [ ] AC-9: Re-routing / re-scanning **appends** new events; prior rows remain queryable

---

## AT Design (DISTILL — plan-time)

| ID | Tags | User-centric title | Assertion hook | Injection / fixture |
|----|------|--------------------|----------------|---------------------|
| AT-53.1 | `@US-53` `@walking_skeleton` `@in-memory` | Operator sees cost of router call recorded | In-memory store `.from('llm_usage_events').select` returns 1 row; Mock Usage list includes it | Injectable store into `runRoute` / `callChatApi` deps (not write-only spy) |
| AT-53.2 | `@US-53` `@error` `@in-memory` | Failed route still leaves a usage error breadcrumb | Select by item_id finds `error` non-null; prior strip fixture unchanged | Same injectable store + mocked fetch failure |
| AT-53.3 | `@US-53` `@in-memory` Phase2 | Cisco LLM spend appears as unknown or tokenized | Select finds `cisco_skill_llm` row | Fixture: `sandbox/tests/testdata/llm_usage/openai_usage_shaped.json` (+ empty-usage variant) |
| AT-53.4 | `@US-53` `@in-memory` Phase2 | Tessl paid lane leaves opaque breadcrumb | Select finds tessl_* source, `cost_basis=unknown` | Unit call to record helper after fake terminal row |
| AT-53.5 | `@US-53` `@in-memory` | Usage summary + collapsed historic log | Assert log region `aria-expanded=false` by default; after toggle, ≥2 fixture rows newest-first; row expand shows I/O | Multi-event fixtures in `tripwire-data.js` |
| AT-53.5b | `@US-53` `@in-memory` | Drawer prior routes collapsed | Assert Prior routes collapsed; expand lists ≥2 item events | Fixture item with two router usage rows |
| AT-53.6 | `@US-53` `@in-memory` | Spend-driving chrome explains cost | Assert `.score-tip-bubble` text for Escalated / router strip | HTML/status tests |
| AT-53.7 | `@US-53` `@in-memory` | CLI usage list is historic | Stdout has multiple rows newest-first; no prompt body | Injectable store + commander test |
| AT-53.8 | `@US-53` `@in-memory` | Secrets stripped and oversized I/O capped | Example-based redaction + oversize | Pure unit on `llmUsage.js` |
| AT-53.9 | `@US-53` `@in-memory` | Re-route appends history | After second route, store has 2 rows for item; first row unchanged | Injectable store |

**WS strategy:** driving port = router + store insert; Usage tab/CLI are read adapters.
**Phase 2 ATs** may land in the same PR after Phase 1 green, or a follow-up commit on the same branch.

---

## Files to touch (at implementation)

| Phase | Files |
|-------|--------|
| 1 | `db/schema.sql`, `cli/src/llmUsage.js`, `cli/src/router.js`, `cli/bin/tripwire.js`, tests, dashboard Usage/tips, docs/ADR |
| 2 | `sandbox/scanners.py`, `scan_app.py`, parser fixtures/tests, Phase 2 tips |

---

## TDD Execution Order

1. RED/GREEN `redactSecrets` + `truncateForStore` + `estimateCostUsd` — AT-53.8
2. Schema + ensureSchema smoke
3. Router insert + round-trip — AT-53.1, AT-53.2
4. Usage tab (summary + collapsible historic log) + drawer prior routes + tips + CLI — AT-53.5–53.7, 53.5b, 53.9
5. Phase 2 sandbox writers — AT-53.3, AT-53.4

No new npm/PyPI dependencies.

---

## Before-Checks

- [ ] Design doc reviewed (incl. Redaction algorithm + Phase split)
- [ ] Branch `slice/53-llm-usage-tracking` from main when starting build
- [ ] No resurrection of `tripwire.audit`
- [ ] harness-scout `detect_confirm` vs TRAIL embed before first product edit

## After-Checks

- [ ] Tests pass for Phase 1 ATs (53.1–53.2, 53.5–53.8); Phase 2 ATs if in scope of same PR
- [ ] Specification coverage: every in-scope GWT clause has ≥1 test
- [ ] Branch coverage via `./scripts/quality-gates.sh`
- [ ] Complexity evidence: CLI/sandbox **enforcing** where existing; dashboard **reporting** — `./scripts/complexity-report.sh` → `.reports/complexity/`; summary in `gate-evidence/slice-53.json`
- [ ] Mock Usage tab works offline
- [ ] Rollup still excludes `tiered_router`

## Doc Audit

- [ ] Design → IMPLEMENTED/VERIFIED where earned
- [ ] User-guide Usage tab + opaque-estimate flag guidance
- [ ] CHANGELOG on merge

## Skills & rules

| Kind | Name |
|------|------|
| Baseline | `/tdd`, `/clean-commit`, `/verify-slice`, `/divergence-check` |
| Security | `/review-security` (stored I/O) |
| Close | `/nw-execute` or `/slice-workflow`; re-`/nw-review` on implementation |

**Model split:** inherit TRAIL (`gpt-5.6-sol` / `gpt-5.6-terra`).
**Time-box:** Phase 1 ≤2h (~4 Pomos); Phase 2 +≤1h if included.

## Gate Status

📋 PLANNED — EFP done; nw-review #1 (PO/AT/Craft) logged; craft/AT blockers patched in design+stub. PO `jobs.yaml` JTBD N/A (no product jobs SSOT in repo). Optional: re-run `/nw-review` before build.

## Out of scope

Billing sync, UI kill-switches, inventing vendor $, Wave H FE/BE rewrite, Claude Code `/usage` slash skill (CLI `tripwire usage` is enough for Horizon A).
