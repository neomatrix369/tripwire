# Slice 56 — Confirmed Gap Repairs

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: N — Docs Gap-Bridge Audit
> Depends on: 44 ✅ (diagrams merged; GWT-44.9 on main)
> Audit source: `docs/plan/docs-gap-bridge-audit.md §Checkpoint Walk — A.5, A.6, B.1, B.9, B.10, cross-nav`

## Slice Workflow Bundle
- Slice name: `slice-56-gap-repairs`
- Branch: `slice/56-gap-repairs`
- Exit criteria: All 5 confirmed/suspected gaps below repaired or confirmed-not-needed with evidence logged; no new files created; edits to existing SSOTs only

## Goal

Five targeted repairs from the checkpoint walk findings. Each is a small, isolated edit to an existing page. Execution cadence: one sub-item at a time, re-check the specific checkpoint after each edit, log outcome in DECISIONS.md, then proceed to the next.

**Reorganise before writing.** Default move: verify gap exists on `main` after slice-44 merge, then add the minimum content needed — a sentence, a table row, a label.

## Sub-items (execute in order)

### 56-a — Input-type taxonomy (CP A.5, B.1)
Add a "What can Tripwire scan?" table to `docs/user-guide/prerequisites.md` (the user-facing setup reference; not ARCHITECTURE.md which is architecture-level):

| Input type | Example | Notes |
|---|---|---|
| Skill directory | `./fixtures/skills/safe-csv-cleaner` | Contains `SKILL.md` |
| MCP server entrypoint | `./path/to/mcp-server/index.js` | Inspected for structure |
| Git URL | `https://github.com/owner/repo` | Cloned by `_acquire_target` |
| Local copy path | `/abs/path/to/dir` | Tar-uploaded to sandbox |

Link to ADR-0012 (`sandbox-target-acquisition`) for the `_acquire_target` dispatch detail.

**GWT-56a:** Given a newcomer opens `docs/user-guide/prerequisites.md`, when they look for "what can I scan?", then `prerequisites.md` contains a table headed "What can Tripwire scan?" with exactly 4 rows (Skill directory / MCP server entrypoint / Git URL / Local copy path) and a link to ADR-0012. No new file. Verified by: `grep -n "What can Tripwire scan" docs/user-guide/prerequisites.md`.

### 56-b — Dashboard proxy role (CP B.9)
Add one sentence to `QUICKSTART.md §Try the demo` step 3 (after the `node scripts/serve-dashboard.mjs` command):

> *`serve-dashboard.mjs` is a local proxy that injects your Supabase keys server-side so the dashboard can read Live data without exposing credentials in the browser. For Mock mode (no keys), it just serves the HTML.*

**GWT-56b:** Given a newcomer reads `QUICKSTART.md §Try the demo`, when they look at step 3 (after the `node scripts/serve-dashboard.mjs` command), then `QUICKSTART.md` contains the sentence: `serve-dashboard.mjs is a local proxy that injects your Supabase keys server-side so the dashboard can read Live data without exposing credentials in the browser.` Verified by: `grep -n "local proxy" QUICKSTART.md`. (Single-sentence annotation only — if proxy architecture needs deeper explanation, move to ARCHITECTURE.md, not expand here.)

### 56-c — gate-evidence PLANNED callout (CP B.10)
Add a PLANNED label to `docs/STATUS.md` under the quality-tab / gate-evidence entry:

> **PLANNED (Quality tab gate-evidence UI)**: The dashboard quality tab reads gate-evidence data from `docs/plan/gate-evidence/`. In-product display of gate scores is PLANNED — not yet available in the Live dashboard. See TRAIL.md Wave N.

**GWT-56c:** Given a user reads `docs/STATUS.md`, when they search for the quality tab or gate-evidence entry, then `STATUS.md` contains the text `PLANNED (Quality tab gate-evidence UI)` as a visible label. Verified by: `grep -n "PLANNED (Quality tab" docs/STATUS.md`. (Visual distinctiveness from IMPLEMENTED/SHIPPED labels is a human-review checkpoint at merge time.)

### 56-d — Guard / Mock mode transition (CP A.6)
Add one sentence to `QUICKSTART.md §Try the demo` (or a `docs/user-guide/` page if more appropriate) explaining the Guard button:

> *The dashboard opens at a landing intro. Click "Open Dashboard →" (or the Guard button) to switch between Mock (fixture data, no keys) and Live (Supabase reads) modes.*

**GWT-56d:** Given a newcomer reads `QUICKSTART.md §Try the demo`, when they reach the step before opening the dashboard, then `QUICKSTART.md` contains an explanation of the Guard button: text matching `Guard` and `Mock` and `Live` within the same paragraph, covering the switch between modes. Verified by: `grep -n "Guard" QUICKSTART.md` shows an explanatory line (not just a code reference).

### 56-f — Scanner × input-type matrix (CP B.4)
Add a "Which scanner handles which input?" lookup table to `docs/STATUS.md` (alongside per-scanner status rows) or `docs/ARCHITECTURE.md` §External services:

| Scanner | Skill dir | MCP entrypoint | Git URL | Local path |
|---|---|---|---|---|
| Cisco AI Defense | ✅ | ✅ | ✅ | ✅ |
| Snyk | — | — | ✅ | ✅ |
| Tessl (lint/review/…) | ✅ | ✅ | — | — |
| DepShield | — | — | ✅ | ✅ |
| Ossprey | — | — | ✅ | ✅ |

Link to ADR-0003 (`sandbox-input-modes`) for the `_acquire_target` dispatch rules.

> Source: docs-gap-bridge-audit.md checkpoint B.4 (confirmed P1/M gap, 2026-08-28).

**GWT-56f:** Given a user reads `docs/STATUS.md` (or `docs/ARCHITECTURE.md`), when they ask "does Snyk scan MCP servers?", then the scanner×input-type matrix is present with one row per scanner and one column per input type. Verified by: `grep -n "scanner.*input\|input.*scanner\|Snyk.*MCP\|matrix" docs/STATUS.md`. Link to ADR-0003 must be present in the same section.

### 56-e — Slice-26 API contract cross-link (cross-nav)
Verify that `docs/user-guide/frontline-output-contract.md` covers the API output contract described in `slice-26-api-output-contract.md`. If complete, add a link to it from `agent-hooks/README.md` under a "Output contract" heading.

**GWT-56e:** Given a contributor reads `agent-hooks/README.md`, when they want to understand the API output shape, then they find a direct link to `frontline-output-contract.md` without hunting.

## Acceptance criteria (short-form)
- [ ] 56-a: Input-type table present in `docs/user-guide/prerequisites.md` with ADR-0012 link; `grep "What can Tripwire scan" docs/user-guide/prerequisites.md` returns a hit
- [ ] 56-b: Proxy explanation sentence present in `QUICKSTART.md` step 3; `grep "local proxy" QUICKSTART.md` returns a hit
- [ ] 56-c: `PLANNED (Quality tab gate-evidence UI)` label present in `docs/STATUS.md`; `grep "PLANNED (Quality tab" docs/STATUS.md` returns a hit
- [ ] 56-d: Guard/Mock explanation present in `QUICKSTART.md`; `grep "Guard" QUICKSTART.md` returns an explanatory line (not just a code reference)
- [ ] 56-e: `agent-hooks/README.md` links to `frontline-output-contract.md`
- [ ] 56-f: Scanner×input-type matrix present in `docs/STATUS.md` or `docs/ARCHITECTURE.md` with ADR-0003 link; `grep -n "Snyk\|DepShield\|Ossprey" docs/STATUS.md` shows matrix rows
- [ ] Each sub-item has a DECISIONS.md log entry (date, checkpoint, outcome)
- [ ] Zero new files created

## Doc audit
- Edits: `docs/user-guide/prerequisites.md` (56-a — locked to this file)
- Edits: `QUICKSTART.md` (56-b, 56-d)
- Edits: `docs/STATUS.md` (56-c, 56-f)
- Edits: `agent-hooks/README.md` (56-e)
- Log: `docs/plan/DECISIONS.md`
