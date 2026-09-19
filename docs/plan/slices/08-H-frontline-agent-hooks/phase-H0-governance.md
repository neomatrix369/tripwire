# Phase H0 — Wave H Governance (Agent Guard)

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔨 IN PROGRESS
> Wave: **H — Frontline / Claude Code Agent Guard**
> Phase label: **H0** (not a global `slice-N` — no renumber of 23–39)
> Depends on: none
> ADR: [`docs/adr/0017-claude-code-agent-guard-integration.md`](../../../adr/0017-claude-code-agent-guard-integration.md)

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → ADR-0017 → this stub

## Context
- **Stage objective**: Record Wave H governance so Frontline agent-hook work has an accepted intent record and tracker rows before merge of Phase-1 product slices.
- **Depends on**: none
- **Global invariants**: → `docs/plan/invariants.md`
> **Rule (same as TRAIL):** H0 **blocks merge** of Wave H Musts, **not prototyping**. Slices 23+ may be developed on a branch while H0 is open; they do not merge to `main` until H0 governance is complete (or DECISIONS-waived).

## Non-goals
- Implementing PreToolUse handlers, `/tw-*` skills, or `setup-agent-hooks` (slices 23+)
- Renumbering slices 23–39 to `00–…`
- Closing Ossprey access (slice 35) as part of H0

## Output contract
- **Baseline**: ADR-0017 exists; TRAIL/PROGRESS carry H0 + H1–H7 / 23–39 rows
- ADR-0017 status and STATUS honesty aligned with implementation evidence
- DECISIONS rows for Wave H sequencing / BACKLOG items present
- TRAIL + PROGRESS H0 row accurate (this stub linked)

## Slice Workflow Bundle
- Phase name: `phase-H0-governance`
- Files: ADR-0017, DECISIONS, STATUS, TRAIL, PROGRESS (this stub)
- Exit criteria: Governance artifacts consistent; H0 → ✅; merge gate for Wave H Musts clear
- Commit pattern: `docs(H0): Wave H governance …`

## Branch
Governance may land on `tripwire-frontline-hack` / `frontline-hackathon-london-2026-agent-hooks` or docs branches — not a product `slice/N-…` branch required solely for H0.

## Spec (GWT)

### GWT-H0.1 — Intent record exists
**Given** Wave H Frontline / Agent Guard work is in flight
**When** a reviewer opens ADR-0017 + DECISIONS 2026-08-15+ rows
**Then** the PreToolUse → guard → skills intent is recorded and amends ADR-0015 as stated

### GWT-H0.2 — Trackers name H0 and product slices
**Given** `docs/plan/TRAIL.md` and `PROGRESS.md`
**When** Wave H is inspected
**Then** H0 appears as governance Must
**And** product work remains slices 23–39 (global numbers unchanged)

### GWT-H0.3 — Merge vs prototyping rule is explicit
**Given** an executor wants to start slice 23
**When** they read this stub / TRAIL H section
**Then** they see that prototyping may proceed while H0 is 🔨
**And** merge to `main` waits on H0 ✅ (or explicit waiver)

## Before-Checks [GATE]
- [ ] ADR-0017 readable
- [ ] TRAIL/PROGRESS H0 rows exist

## After-Checks [GATE]
- [ ] H0 status ✅ in TRAIL + PROGRESS
- [ ] This stub linked from TRAIL H0 row
- [ ] No claim that Guard is VERIFIED beyond evidence in STATUS

### Closing Gates
- [ ] Docs/governance review (documentarist or maintainer HITL)
- [ ] `/verify-slice` N/A for phase-only — close via TRAIL/PROGRESS + DECISIONS row

## Gate Status
🔨 IN PROGRESS (opened 2026-08-15)

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Started | 2026-08-15 |
| Next-session notes | Close H0 when ADR-0017 + tracker honesty match shipped Guard evidence |
