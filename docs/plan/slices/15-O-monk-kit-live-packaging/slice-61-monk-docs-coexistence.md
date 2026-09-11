# Slice 61 — Monk Docs Coexistence + Operator Honesty

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: **15-O — Monk Kit Live packaging** (ADR-0001)
> Depends on: 58 ✅ (can draft in parallel with 59; must not claim VERIFIED until 59 evidence exists)
> Sources: ADR-0001 “Coexistence with today’s docs” · [Monk First Deployment](https://docs.monk.io/getting-started/first-deployment) · [Local Dashboard](https://docs.monk.io/getting-started/local-dashboard)

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → ADR-0001

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: Document the Monk Kit path as **additive** beside the workstation Live path, grounded in Monk’s real operator UX (dashboard secrets, approvals, BYOC), without overselling before slice 59 VERIFIED.
- **Depends on**:
  - Slice 58: Kit files exist so docs can point at real paths — `test -f MANIFEST`
  - Slice 59 for any “VERIFIED / try Monk deploy” wording — until then label experimental/Proposed
- **Global invariants**: → `docs/plan/invariants.md`

## Non-goals
> Out of scope for this slice — do not implement here.
- Rewriting QUICKSTART to replace workstation Live as the primary path
- Authoring Capsules or CI/CD operator guides (link only as future)
- Kit YAML / bootstrap implementation (58–60)

## Output contract
> Observable shape of completion (shape only — not exact file paths).
- **Baseline**: ADR-0001 exists; user-guide still workstation-centric
- Docs index / STATUS / optional user-guide page describe Monk path with evidence-state labels (Proposed → VERIFIED only when 59 done)
- Links to Monk docs for install, first deploy, local dashboard, secrets-never-in-chat
- Clear “secrets go in Monk dashboard, not chat / not committed `.env` for Kit path”

## Slice Workflow Bundle
- Slice name: `slice-61-monk-docs-coexistence`
- Files: `docs/STATUS.md`, `docs/README.md`, optional `docs/user-guide/monk-kit-deploy.md`, ARCHITECTURE pointer
- Exit criteria: Additive Monk docs published; workstation path remains primary until VERIFIED; DIVIO-ish how-to stays short
- Commit pattern: `docs(slice-61): Monk Kit coexistence + honesty`

## Branch
`slice/61-monk-docs-coexistence`

## Spec (GWT)

### GWT-61.1 — Workstation path remains primary until VERIFIED `@contract-shape:unbounded-preservation`
**Given** a new operator opens QUICKSTART / README
**When** they look for how to run Live
**Then** the workstation `.env` + CLI path is still the documented default
**And** Monk is introduced as additive / experimental until STATUS shows MVL VERIFIED

### GWT-61.2 — Monk operator path points at real Monk UX `@contract-shape:bounded-change`
**Given** the Monk Kit docs page (or STATUS section)
**When** the operator follows “deploy with Monk”
**Then** they see steps aligned to Monk First Deployment: install → deploy prompt → **local dashboard credentials** → approve infra → HTTPS URL
**And** they are warned never to paste cloud/scanner secrets into agent chat ([Local Dashboard](https://docs.monk.io/getting-started/local-dashboard))

### GWT-61.3 — Evidence-state labels are visible `@contract-shape:unbounded-preservation`
**Given** docs mentioning Monk packaging
**When** capability claims are read
**Then** each claim is labelled Proposed / DECIDED / IMPLEMENTED / VERIFIED appropriately
**And** no claim marks registry publish or Capsules as shipped
**And** honesty greps reject phrases like “immediately deployable via Monk” unless adjacent evidence-state is VERIFIED

### GWT-61.4 — ADR and plan are cross-linked `@contract-shape:bounded-change`
**Given** `docs/adr/0001-monk-deployment-and-packaging.md` and Wave O stubs
**When** an operator opens docs/README or ARCHITECTURE decisions
**Then** they can navigate ADR → plan slices 58–61 → Monk public docs

## Acceptance criteria (short-form)
- [ ] GWT-61.1–61.4 satisfied
- [ ] No secrets examples with real values
- [ ] Documentarist-friendly: how-to separate from explanation; STATUS owns honesty

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 58 Kit paths known
- [ ] Confirm with STATUS whether 59 VERIFIED yet (gates wording)

## TDD Execution
- Docs-only: markdown link checks + grep honesty assertions (no “immediately deployable via Monk” without VERIFIED)
- Sequence: RED (failing honesty/link tests) → GREEN → VERIFY

## After-Checks [GATE]
- [ ] Docs committed with `docs(slice-61): ...`
- [ ] Specification coverage via link/honesty tests for each GWT
- [ ] Complexity gates N/A (docs-only) — record N/A reason in gate-evidence
- [ ] **Merge gate:** if STATUS/docs claim Monk MVL **VERIFIED**, then slice 59 ✅ is on `main` (gate-evidence present)
- [ ] `nw-documentarist-reviewer` APPROVE or follow-ons logged

### Closing Gates
- [ ] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [ ] `nw-documentarist-reviewer` — documentation currency (primary for this slice)
- [ ] `nw-gate-evidence-validator` — all 9 gate-evidence conditions pass
- [ ] `/verify-slice` — holistic evidence verdict COMPLETE (final closing gate)

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | — |
| Blockers encountered | — |
| Next-session notes | Soft-gate VERIFIED wording on 59 merge |
