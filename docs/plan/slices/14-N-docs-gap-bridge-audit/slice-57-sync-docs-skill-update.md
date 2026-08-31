# Slice 57 — sync-docs Skill Update + module-theme-map

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: N — Docs Gap-Bridge Audit
> Depends on: 56 (gap repairs complete; checkpoint-walk method proven in practice)
> Audit source: `docs/plan/docs-gap-bridge-audit.md §Proposed sync-docs Skill Addition`

## Slice Workflow Bundle
- Slice name: `slice-57-sync-docs-skill-update`
- Branch: `slice/57-sync-docs-skill-update`
- Exit criteria: (a) `sync-docs` global skill updated with checkpoint-walk method + disclaimer checklist + incremental cadence; (b) `docs/contributor-guide/module-theme-map.md` verified on `main` after slice-44 merge, or created if absent

## Goal

Two tasks:

**57-a — sync-docs skill update:** Append the "Checkpoint-walk method" named checklist (8 items per `docs-gap-bridge-audit.md §Proposed sync-docs Skill Addition`) to the global `sync-docs` skill definition at `~/.claude/skills/sync-docs/SKILL.md`. This makes the method reusable for other projects.

**57-b — module-theme-map.md:** After slice-44 merges, check if `docs/contributor-guide/module-theme-map.md` landed on `main`. If yes — done. If no — create a minimal file: a table mapping each module (`cli/`, `sandbox/`, `guard/`, `prototypes/dc-dashboard/`, `db/`, `agent-hooks/`, `scripts/`, `fixtures/`) to its primary theme (user-facing CLI, scanner adapters, enforcement hook, dashboard UI, schema, agent hooks, maintenance scripts, test fixtures).

## Spec (GWT)

### GWT-57a.1 — sync-docs skill has checkpoint-walk section
**Given** a future session invokes `sync-docs`
**When** the skill is loaded
**Then** it contains a "Checkpoint-walk method" section with the 8-item checklist from the audit
**And** the disclaimer placement checklist (D1-style table format) is referenced or inlined
**And** the incremental cadence (one item → re-check → log → proceed) is stated

### GWT-57a.2 — Method is tool-agnostic
**Given** the skill is loaded in a non-Tripwire project
**When** a contributor reads the Checkpoint-walk method section
**Then** the method steps contain zero references to Tripwire-specific product names — specifically: no occurrences of "Snyk", "Modal", "Supabase", "Cisco", "Tessl", "DepShield", "Ossprey" in the method step text itself (examples/callouts are permitted if clearly marked as project-specific examples)
**And** the method uses only generic terms: "scanner", "cloud provider", "database", "diagram tool", "external service", "sandbox" rather than product names
**And** any Tripwire-specific example is in a separate `> Example (Tripwire):` block, not embedded in the step

Verified by: `grep -n "Snyk\|Modal\|Supabase\|Cisco\|Tessl\|DepShield\|Ossprey" ~/.claude/skills/sync-docs/SKILL.md` returns zero hits outside of `> Example` blocks.

### GWT-57b.1 — module-theme-map.md exists on main
**Given** slice-44 has merged and the contributor-guide directory is checked
**When** `docs/contributor-guide/module-theme-map.md` is opened
**Then** it contains a table with one row per top-level module — specifically: `cli/`, `sandbox/`, `guard/`, `prototypes/dc-dashboard/`, `db/`, `agent-hooks/`, `scripts/`, `fixtures/` — and each row names the module's primary theme
**And** each row links to the relevant ARCHITECTURE.md section or ADR (not copied content — links only)

Verified by: `grep -c "cli/\|sandbox/\|guard/\|prototypes\|db/\|agent-hooks\|scripts/\|fixtures/" docs/contributor-guide/module-theme-map.md` returns 8.

## Acceptance criteria (short-form)
- [ ] 57-a: `~/.claude/skills/sync-docs/SKILL.md` has a "Checkpoint-walk method" section with ≥8 items
- [ ] 57-a: Section is self-contained and project-agnostic
- [ ] 57-b: `docs/contributor-guide/module-theme-map.md` exists on `main` after this slice (either from slice-44 or newly created)
- [ ] No duplicate content between module-theme-map and ARCHITECTURE.md (link don't copy)

## Doc audit
- Edit: `~/.claude/skills/sync-docs/SKILL.md` (57-a)
- Create or verify: `docs/contributor-guide/module-theme-map.md` (57-b; create only if absent post slice-44)
