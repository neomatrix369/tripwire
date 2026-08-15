# Slice 25: Live Enforce Smoke

> Scenario: Brownfield | MoSCoW: Must | Depends on: 24

## Outcome

Live smoke proves enforcement: with hooks enabled, an unscanned or RED artifact is blocked; with `enable=false`, the same call is approved. Docs state that Claude Code has no native install-event hook and the workaround is `tripwire setup-agent-hooks`.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Enabled blocks unscanned / RED**
   - Given setup-agent-hooks installed and `enable=true`, when a PreToolUse event targets an unscanned or RED artifact, then the handler stdout decision is `block`.
2. **Disabled approves**
   - Given the same install with `enable=false`, when the same PreToolUse event fires, then stdout decision is `approve`.
3. **Install-event gap documented**
   - Given operator-facing docs, when searching for install-event / setup workaround language, then docs state there is no native install-event hook and name `tripwire setup-agent-hooks` as the workaround.

## Design / test treatment

- Prefer scripted smoke against installed hooks + fixture config; record human observation where a true Claude Code session is required.
- Keep smoke scope to enable/disable + unscanned/RED block — not full skill surface (H2).
- **AT design required before IN PROGRESS**; human checkpoint required before Phase H2.

## Before-Checks [GATE]

- [ ] Slice 24 gate-evidence `verdict` is `PASS`
- [ ] Branch `slice/25-live-enforce-smoke` created from current `main`
- [ ] Smoke fixture artifacts (or demo placeholders) and enable/disable procedure noted in gate evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add smoke GWTs / scripted checks for enabled block and disabled approve.
GREEN: only fix wiring gaps that block the smoke path.
REFACTOR: document the install-event workaround without expanding product scope.

## After-Checks [GATE]

- [ ] Enabled unscanned/RED → `block` observed and recorded in gate evidence
- [ ] Disabled → `approve` observed and recorded in gate evidence
- [ ] Docs claim greppable: no native install-event hook; workaround is `tripwire setup-agent-hooks`
- [ ] Named smoke/test command(s) exit 0 (or human observation logged with date + result)
- [ ] Coverage/complexity: policy note recorded (enforcing for product-code touched; N/A with reason if docs/smoke-only)
- [ ] `docs/plan/gate-evidence/slice-25.json` records commands/observations, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 25 ✅
- [ ] **Human test checkpoint:** Phase H2 (slices 26–30) must not start until a human signs off this smoke in gate evidence / DECISIONS

## Doc Audit

| # | Check |
|---|--------|
| 1 | Install-event absence + `setup-agent-hooks` workaround documented |
| 2 | Enable/disable smoke steps greppable for operators |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |
| 4 | Human checkpoint before H2 recorded |

## Gate Status

📋 PLANNED
