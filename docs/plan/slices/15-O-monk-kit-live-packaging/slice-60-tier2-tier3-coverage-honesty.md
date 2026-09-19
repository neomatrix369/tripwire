# Slice 60 — Tier 2+3 Plumbing + Coverage Honesty

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: **15-O — Monk Kit Live packaging** (ADR-0001)
> Depends on: 59 ✅
> Sources: ADR-0001 full-coverage-complete + open question on partial-coverage signalling · Monk [Local Dashboard](https://docs.monk.io/getting-started/local-dashboard) / [env-scoped secrets](https://docs.monk.io/features/project-organization)

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → ADR-0001

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: Complete ADR-0001 **full-coverage-complete** plumbing (Tier 2 required for full scanner coverage; Tier 3 env-var pass-through) and answer the ADR open question: how an MVL-complete instance signals partial scanner coverage.
- **Depends on**:
  - Slice 59 (MVL proof): STATUS shows Monk MVL VERIFIED — if absent, check PROGRESS.md slice 59
- **Global invariants**: → `docs/plan/invariants.md`
> Tier boundaries remain revisitable once Kit config is live (ADR). Slice may tweak tiers with DECISIONS rows.

## Non-goals
> Out of scope for this slice — do not implement here.
- Blocking deploy on missing Tier 3 keys (ADR: deploy never fails for want of Tier 3)
- Ossprey access provisioning (Wave H slice 35 remains separate)
- Capsules / registry / Monk CI/CD
- Changing scanner engine behaviour beyond credential wiring + honesty signalling

## Output contract
> Observable shape of completion (shape only — not exact file paths).
- **Baseline**: MVL VERIFIED; Tier 2/3 may be incomplete in Kit vs ADR
- Kit + bootstrap accept Tier 2 secrets and pass them into Modal/scanner env
- Tier 3 keys pass through when present; absent keys do not fail deploy
- Operator-visible signal of partial vs full coverage (deploy summary and/or dashboard surface — choose one primary, document)
- STATUS distinguishes MVL-complete vs full-coverage-complete

## Slice Workflow Bundle
- Slice name: `slice-60-tier2-tier3-coverage-honesty`
- Files: Kit `MANIFEST`/YAML/bootstrap dotenv keys; optional dashboard honesty copy; STATUS
- Exit criteria: full-coverage-complete path documented + VERIFIED when Tier 2 present; partial-coverage signal shipped
- Commit pattern: `feat(slice-60): Tier 2/3 Kit plumbing + coverage honesty`

## Branch
`slice/60-tier2-tier3-coverage-honesty`

## Spec (GWT)

### GWT-60.1 — Tier 2 secrets reach scanner runtime `@contract-shape:bounded-change`
**Given** an MVL-capable Kit deploy
**When** the operator supplies Tier 2 secrets (Snyk, Tessl, Cisco — at least one Cisco credential shape) via Monk dashboard
**Then** bootstrap/Modal env receives those values
**And** a fixture scan can exercise the corresponding engines (or skip with honest skip reason if engine still unavailable)

### GWT-60.2 — Tier 3 pass-through never fails deploy `@contract-shape:bounded-change`
**Given** Tier 1 secrets only
**When** Tier 3 keys are omitted
**Then** deploy still succeeds (MVL)
**And** when Tier 3 keys are present they appear in the sandbox/runtime env without extra provisioning

### GWT-60.3 — Partial coverage is signalled `@contract-shape:bounded-change`
**Given** an MVL-complete instance without full Tier 2
**When** the operator finishes deploy or opens Live
**Then** they see an explicit partial-coverage signal on the **primary surface named in DECISIONS** (blocking Before-Check below)
**And** the signal does not claim “full Live scanner coverage”

### GWT-60.4 — Full-coverage-complete is distinguishable `@contract-shape:bounded-change`
**Given** Tier 1 + Tier 2 secrets are present and engines reachable
**When** deploy completes
**Then** STATUS / deploy summary can mark **full-coverage-complete** separately from MVL-complete

## Acceptance criteria (short-form)
- [ ] GWT-60.1–60.4 satisfied
- [ ] ADR open question on signalling resolved in DECISIONS (summary vs dashboard vs both) — **before** UI work
- [ ] Tier 3 inventory complete vs ADR (SIE, Model Studio, Ossprey)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 59 ✅
- [ ] ADR tier tables re-read
- [ ] **HITL blocking:** DECISIONS row names partial-coverage **primary** surface (`deploy_summary` | `dashboard` | `both`)

## TDD Execution
- Contract tests for secret key lists + honesty string/fixtures; optional Live probes for Tier 2
- Sequence: RED → GREEN → REFACTOR → VERIFY

## After-Checks [GATE]
- [ ] Code committed with `feat(slice-60): ...`
- [ ] Specification coverage: every GWT clause has ≥1 test or dated VERIFIED probe
- [ ] Complexity evidence for product-code changes: repository-native; policy per quality-gates
- [ ] Docs: STATUS + env-vars cross-links; honesty language consistent with Live rules

### Closing Gates
- [ ] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [ ] `nw-software-crafter-reviewer` — code quality + TDD discipline review (slice close gate #9)
- [ ] `nw-documentarist-reviewer` — honesty/docs currency (when docs surfaces change)
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
| Next-session notes | Pick signalling surface in DECISIONS before UI work |
