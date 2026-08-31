# Slice 44 — Docs UX Plain Language + Compaction

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔀 ON BRANCH
> Wave: K — Docs UX plain language + compaction (Wave D Phase 2 continuation)
> Depends on: 17 (already ✅ — do not reopen)
> Evidence state: **IMPLEMENTED** (compaction + Setup/Configure framing + services/diagrams pile-ons) — 🔀 until merge → ✅ PASSED

## Slice Workflow Bundle
- Slice name: `slice-44-docs-ux-plain-language`
- Branch: `slice/44-docs-ux-plain-language`
- Exit criteria: Lean under-10 README/QUICKSTART folds; −3 net user-guide pages; Phase 2 absorbed into SSOTs; Setup vs Configure framing + loud MVP Live + Maintain hub; ARCHITECTURE services inventory + journey/dependency Mermaid; zero links to deleted paths; SMOKE_TESTS updated; documentarist review

## Goal

Make public docs easy to understand (plain language, demo-first) and **fewer** —
delete thin aliases, merge optional router guides, absorb glossary/CLI flags/
troubleshooting into existing SSOTs. No new glossary/cli/troubleshooting files.

**Pile-on (docs UX allocation audit, 2026-08-21):** name **Setup** (create vendor accounts) vs **Configure** (API keys / wiring) consistently; loud **Minimum Viable Live** (Supabase + Modal only); hub **Maintain** row; short multi-run cheat lines — edit existing pages only.

**Pile-on (services + diagrams):** enlist external services in ARCHITECTURE; add start→finish operator journey and dependency-order Mermaid (no new guide files).

## Spec (GWT)

### GWT-44.1 — Orient fold is plain and routed
**Given** a first-time visitor opens README.md
**When** they read above the fold
**Then** they see a one-line metaphor, a short intent router, and a next action before a badge wall or jargon dump

### GWT-44.2 — Tutorial is demo-first then Live
**Given** a reader opens QUICKSTART.md
**When** they follow the primary path
**Then** Recommended is copy-paste Mock / dry-discover
**And** Live is labeled Advanced and links vendor guides without duplicating path-commands

### GWT-44.3 — Compaction without content loss
**Given** the pre-slice user-guide set
**When** the slice merges
**Then** `onboarding-cheatsheet.md`, `path-commands.md`, `sie-setup.md`, and `model-studio-setup.md` are gone
**And** `tiered-router-setup.md` holds former SIE + Model Studio content
**And** every in-repo link to deleted paths is retargeted

### GWT-44.4 — Phase 2 absorbed into SSOTs
**Given** operators need glossary, flags, and fail hints
**When** they open reading-router-results / setup-commands / env-vars / STATUS
**Then** those needs are met without new standalone guide files
**And** docs hub + CONTRIBUTING link agent-hooks

### GWT-44.5 — Setup vs Configure beats are named
**Given** a reader opens Live Advanced in QUICKSTART and the five-vendor map in prerequisites
**When** they plan first Live
**Then** stages are ordered **A. Create accounts (Setup)** → **B. Configure keys** → **C. Bootstrap commands**
**And** prerequisites columns distinguish Account vs Keys
**And** env-vars opens as Configure (keys) with a link to create accounts first

### GWT-44.6 — Loud Minimum Viable Live + Maintain findability
**Given** a reader wants the smallest Live path or ongoing ops
**When** they open QUICKSTART Live and docs hub
**Then** MVP Live (Supabase + Modal only; scanners soft-skip) is called out before full five-vendor coverage
**And** hub has a Maintain task row → setup-commands re-run / when it fails
**And** Daily maintenance lists `--force`, `route --batch-id`, and secrets-only redeploy (with links)
**And** after first Live scan, missing scanner key is explicitly “skipped engine,” not all-clear

### GWT-44.7 — Screenshots tie operator chrome
**Given** a reader opens the screenshot gallery README
**When** they look for dashboard metric meaning
**Then** one sentence notes cards show `R` / `Q` badges and colour ≠ density

### GWT-44.8 — Services inventory + end-to-end diagrams
**Given** a reader opens ARCHITECTURE.md
**When** they look for what Tripwire talks to and in what order
**Then** a **External services** table lists every cloud/tool dependency (platform, scanners, optional router, local-only, CI/dev) with role + Setup/Configure link or “none”
**And** a Mermaid **operator journey** shows Demo and Live from start → maintain
**And** a Mermaid **dependency order** shows what must be ready before what (tools → MVP Live → scanners → optional router)
**And** docs hub links Architecture for “system shape / services / flows”

### GWT-44.9 — Data / provider flow diagram (pile-on: Wave N docs audit)
**Given** a reader opens ARCHITECTURE.md
**When** they want to understand how data moves at runtime (not just setup order)
**Then** a Mermaid **input→process→output** diagram shows: input types (skill dir / MCP entrypoint / Git URL / local path) → CLI hashing → Modal sandbox dispatch → per-scanner adapter nodes (Cisco · Snyk · Tessl × 5 · DepShield · Ossprey) → Supabase tables (scan_runs / scan_run_scanners / findings / coverage) → dashboard Realtime + poll
**And** the optional tiered router (Superlinked SIE → Alibaba Model Studio) is shown as a post-scan branch to Supabase findings
**And** the Snyk node carries an inline ⚠ annotation: “v0.5 schema — see STATUS §doc-accuracy”
**And** the diagram is titled “Input → Process → Output (runtime data flow)” to distinguish it from the setup dependency-order diagram

> Pile-on source: docs-gap-bridge-audit.md checkpoint B.1–B.10 (2026-08-28).

## Before-Checks [GATE]
- [x] Branch `slice/44-docs-ux-plain-language`
- [x] Stub + TRAIL/PROGRESS/DECISIONS rows (plan contract saved)
- [x] Inventory of inbound links to files to delete (at execution)
- [x] Docs UX allocation audit recorded in DECISIONS (Setup vs Configure + MVP Live gaps)

## After-Checks [GATE]
- [x] README fold under-10 readable (metaphor + router before badges)
- [x] QUICKSTART: Recommended demo then Advanced Live; path map absorbed
- [x] Deleted: cheatsheet, path-commands, sie-setup, model-studio-setup
- [x] Added: tiered-router-setup.md only (+1 net −3)
- [x] `rg` shows zero live links to deleted paths (except historical plan/CHANGELOG)
- [x] setup-commands has CLI flags + When it fails
- [x] reading-router-results has plain glossary table
- [x] env-vars has “Which keys do I need?”
- [x] STATUS has evidence legend table
- [x] docs/README is sole deep hub; agent-hooks linked
- [x] SMOKE_TESTS routes updated
- [x] QUICKSTART Live: Accounts → Keys → Bootstrap; MVP Live callout; Daily maintenance cheat lines
- [x] docs hub Maintain row (+ Minimum Live cue)
- [x] prerequisites Account vs Keys columns; env-vars Configure framing
- [x] screenshots README mentions `R`/`Q` + colour ≠ density
- [x] ARCHITECTURE: External services table + operator journey + dependency-order Mermaid
- [x] docs hub links Architecture for services / flows
- [ ] ARCHITECTURE: Input→Process→Output runtime data flow diagram (GWT-44.9 pile-on)
- [x] `docs/plan/gate-evidence/slice-44.json` updated for pile-on checks (GWT-44.5–44.8)
- [ ] gate-evidence updated for GWT-44.9 pile-on (Wave N audit 2026-08-28)
- [x] Documentarist / UX re-review recorded for pile-on — APPROVED WITH FOLLOW-ON (2026-08-21; DIVIO targets pending, see below)
- [ ] Mark TRAIL ✅ PASSED only after merge to main

## Doc Audit
| # | Check |
|---|--------|
| 1 | No content regression on SSOTs (setup-commands, env-vars, SECURITY) |
| 2 | Fewer public user-guide files than before (10 → 7) |
| 3 | Dual task matrices not duplicated at full size on README |
| 4 | Mock vs Live honesty preserved |
| 5 | Setup (accounts) vs Configure (keys) named consistently; no new mega-guide |
| 6 | ARCHITECTURE lists external services + start→finish journey + dependency-order Mermaid |

## Inventory (DECIDED)

| Action | Paths |
|---|---|
| Delete | `onboarding-cheatsheet.md`, `path-commands.md`, `sie-setup.md`, `model-studio-setup.md` |
| Add | `tiered-router-setup.md` only |
| Absorb | glossary → reading-router-results; flags/fails → setup-commands |
| Polish (pile-on) | `QUICKSTART.md`, `docs/README.md`, `prerequisites.md`, `env-vars.md`, `docs/screenshots/README.md`, `ARCHITECTURE.md` only |

UX patterns applied at execution: reader router, examples-first, copy-paste demo, Recommended vs Advanced, progressive disclosure (badges), Diátaxis ownership, less-is-more compaction.
Pile-ons: Setup vs Configure labeling, loud MVP Live, Maintain hub; services inventory + journey/dependency diagrams (GWT-44.5–44.8).

## DIVIO follow-on (APPLIED 2026-08-22)

Pile-on documentarist re-review (2026-08-21): **QUICKSTART.md**, **docs/README.md**, **docs/screenshots/README.md** APPROVED. Two pre-existing DIVIO purity issues (not introduced by the pile-on) rewritten same-branch (2026-08-22).

| Target | Issue | Applied rewrite |
|---|---|---|
| `docs/user-guide/env-vars.md` — Vendor procurement quick-steps | Procedural account-creation steps contradicted preamble | Replaced with Reference table: Vendor → Keys → Setup guide link. Procedural steps stay in vendor setup pages. |
| `docs/user-guide/prerequisites.md` — Capability-specific notes | Explanation prose (why / what happens) inside a Reference page | Collapsed to a 4-row Reference table: Capability → Requires. Key mapping pointer → env-vars. |

## Gate Status
🔀 ON BRANCH — GWT-44.1–44.8 on branch; pile-on documentarist **APPROVED** (DIVIO rewrites applied 2026-08-22). ✅ PASSED after merge to main.
