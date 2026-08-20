# Slice 44 — Docs UX Plain Language + Compaction

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: K — Docs UX plain language + compaction (Wave D Phase 2 continuation)
> Depends on: 17 (already ✅ — do not reopen)
> Evidence state: **DECIDED** (contract saved) — public docs delivery not yet committed

## Slice Workflow Bundle
- Slice name: `slice-44-docs-ux-plain-language`
- Branch: `slice/44-docs-ux-plain-language`
- Exit criteria: Lean under-10 README/QUICKSTART folds; −3 net user-guide pages; Phase 2 absorbed into SSOTs; zero links to deleted paths; SMOKE_TESTS updated; documentarist review

## Goal

Make public docs easy to understand (plain language, demo-first) and **fewer** —
delete thin aliases, merge optional router guides, absorb glossary/CLI flags/
troubleshooting into existing SSOTs. No new glossary/cli/troubleshooting files.

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

## Before-Checks [GATE]
- [x] Branch `slice/44-docs-ux-plain-language`
- [x] Stub + TRAIL/PROGRESS/DECISIONS rows (plan contract saved)
- [ ] Inventory of inbound links to files to delete (at execution)

## After-Checks [GATE]
- [ ] README fold under-10 readable (metaphor + router before badges)
- [ ] QUICKSTART: Recommended demo then Advanced Live; path map absorbed
- [ ] Deleted: cheatsheet, path-commands, sie-setup, model-studio-setup
- [ ] Added: tiered-router-setup.md only (+1 net −3)
- [ ] `rg` shows zero live links to deleted paths (except historical plan/CHANGELOG)
- [ ] setup-commands has CLI flags + When it fails
- [ ] reading-router-results has plain glossary table
- [ ] env-vars has “Which keys do I need?”
- [ ] STATUS has evidence legend table
- [ ] docs/README is sole deep hub; agent-hooks linked
- [ ] SMOKE_TESTS routes updated
- [ ] `docs/plan/gate-evidence/slice-44.json` PASS (execution close)
- [ ] Documentarist / UX review recorded

## Doc Audit
| # | Check |
|---|--------|
| 1 | No content regression on SSOTs (setup-commands, env-vars, SECURITY) |
| 2 | Fewer public user-guide files than before (10 → 7) |
| 3 | Dual task matrices not duplicated at full size on README |
| 4 | Mock vs Live honesty preserved |

## Inventory (DECIDED)

| Action | Paths |
|---|---|
| Delete | `onboarding-cheatsheet.md`, `path-commands.md`, `sie-setup.md`, `model-studio-setup.md` |
| Add | `tiered-router-setup.md` only |
| Absorb | glossary → reading-router-results; flags/fails → setup-commands |

Awesome README patterns applied at execution: reader router, examples-first, copy-paste demo, Recommended vs Advanced, progressive disclosure (badges), Diátaxis ownership, less-is-more compaction.

## Gate Status
📋 PLANNED — contract saved; public-docs execution deferred until explicit go-ahead.
