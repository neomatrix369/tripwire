# Slice 59 — MVL-Complete Monk Deploy Proof (Tier 1)

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: **15-O — Monk Kit Live packaging** (ADR-0001)
> Depends on: 58 ✅
> Sources: ADR-0001 Kit v1 MVL-complete · [First Deployment](https://docs.monk.io/getting-started/first-deployment) · [Local Dashboard](https://docs.monk.io/getting-started/local-dashboard) · PoC bootstrap-v1
> Tag: **[Walking Skeleton]** — end-to-end wiring on real Monk + cloud

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → slice 58 stub → this stub → ADR-0001

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: Prove ADR-0001 **MVL-complete**: Monk collects Tier 1 secrets via the local dashboard, provisions Supabase, applies schema, deploys Modal app, and hands back an HTTPS Live dashboard that can read PostgREST.
- **Depends on**:
  - Slice 58 (Land PoC Kit): `test -f MANIFEST && test -f v1.0.0.yaml && test -f bootstrap/Dockerfile` — if absent, check PROGRESS.md slice 58
- **Global invariants**: → `docs/plan/invariants.md`
> Secrets never enter agent chat ([Monk Security](https://docs.monk.io/features/security) / Local Dashboard). Cloud provider for the VERIFIED proof is chosen at execute time (PoC used DigitalOcean); do not lock a vendor into the ADR.
> **Retrospective / tweak:** Expect Kit YAML and bootstrap script changes once the first real deploy fails; log each tweak in DECISIONS.md.

## Non-goals
> Out of scope for this slice — do not implement here.
- Full scanner coverage (Tier 2) or Tier 3 pass-through verification (slice 60)
- Capsules / per-branch ephemeral clusters ([Capsules](https://docs.monk.io/features/capsules) — Could later)
- Monk-generated GitHub Actions CI/CD ([Build & CI/CD](https://docs.monk.io/features/build-and-cicd) — follow-up after MVL)
- Registry publication of the Kit
- Replacing workstation Live as the default documented path before VERIFIED evidence exists

## Output contract
> Observable shape of completion (shape only — not exact file paths).
- **Baseline**: Kit present (58) but no dated VERIFIED Monk Live URL in STATUS
- Operator completes Monk first-deploy style flow for Tripwire Kit entry
- Supabase project exists; schema applied; PostgREST `items` (or successor) probe OK
- Modal app deployed when Tier 1 Modal tokens supplied (fail closed for MVL — do not “warn and continue” if Modal is required for MVL-complete)
- HTTPS URL opens Live dashboard with injected `SUPABASE_URL` + anon key; dashboard can read PostgREST
- STATUS marks Monk MVL path **VERIFIED** with dated evidence (command/log/URL redacted as needed)

## Slice Workflow Bundle
- Slice name: `slice-59-mvl-monk-deploy-proof`
- Files: Kit YAML / bootstrap tweaks as required by deploy evidence; `docs/STATUS.md`; gate-evidence
- Exit criteria: MVL-complete checklist in ADR-0001 observed on a real deploy; evidence recorded
- Commit pattern: `feat(slice-59): verify MVL-complete Monk Live deploy`

## Branch
`slice/59-mvl-monk-deploy-proof`

## Spec (GWT)

### Background (shared for 59.x)
**Given** Monk is installed and the Tripwire Kit is available in the project
**And** operator secrets are entered only via the local Monk dashboard (never agent chat)

### GWT-59.1 — Tier 1 secrets collected outside chat `@contract-shape:bounded-change`
**Given** Background
**When** the operator starts deploy (`/monk deploy` or Kit entry equivalent)
**Then** Tier 1 credentials are entered in the **local Monk dashboard** (loopback), not pasted into agent chat
**And** cloud credentials use the same approval/credential surface ([First Deployment](https://docs.monk.io/getting-started/first-deployment))
**And** gate evidence oracle for “not in chat” is **process attestation** (operator checklist in evidence JSON) unless an automated log-guard is added later

### GWT-59.1b — Missing Tier 1 secrets fail deploy `@contract-shape:bounded-change`
**Given** Background and Modal or Supabase Tier 1 secret omitted
**When** deploy is attempted
**Then** deploy does not reach MVL-complete success
**And** the operator sees a clear missing-credential failure (dashboard or Monk status)

### GWT-59.2 — Supabase provisioned and schema applied `@contract-shape:bounded-change`
**Given** Background and Tier 1 Supabase secrets are present
**When** deploy proceeds past Supabase entity creation
**Then** a Supabase project exists and bootstrap applies the **pinned** repo schema
**And** a Live API (PostgREST) readiness probe succeeds

### GWT-59.2b — Schema apply or Live API probe failure fails MVL `@contract-shape:bounded-change`
**Given** Background and Supabase entity created
**When** schema apply fails or the Live API readiness probe fails
**Then** the deploy is not marked MVL-complete / VERIFIED
**And** the operator runbook section “abort / retry / cleanup” applies

### GWT-59.3 — Modal app deployed for MVL `@contract-shape:bounded-change`
**Given** Background and Modal token id + secret are present
**When** bootstrap runs Modal setup non-interactively
**Then** the Modal scan app is deployed successfully
**And** a Modal setup failure **fails the deploy** for MVL-complete (supersedes PoC “warn and continue” unless DECISIONS explicitly waives with rationale)

### GWT-59.3b — MVL succeeds with Tier 1 only (no Tier 2 required) `@contract-shape:bounded-change`
**Given** Background and only Tier 1 secrets are supplied
**When** MVL deploy completes
**Then** deploy succeeds without requiring Tier 2 scanner secrets
**And** partial scanner coverage is expected (signalling owned by slice 60)

### GWT-59.4 — HTTPS Live dashboard reads PostgREST `@walking_skeleton` `@contract-shape:bounded-change`
**Given** bootstrap and dashboard runnables are up
**When** the operator opens the HTTPS URL Monk returns
**Then** the Live dashboard loads with injected Supabase URL + anon key
**And** the dashboard can read PostgREST (at least one Live data path succeeds — empty tables OK)
**And** HTTPS reachability + Live API probe are **readiness gates** before MVL success is claimed

### GWT-59.5 — Infra approval gate respected `@contract-shape:bounded-change`
**Given** Monk proposes cloud VMs / cluster resources
**When** provisioning would create billable infrastructure
**Then** the operator must approve in the local dashboard before create
**And** gate evidence records provider + region chosen for this VERIFIED run (without locking ADR)

## Acceptance criteria (short-form)
- [ ] ADR-0001 MVL-complete bullets all observed
- [ ] GWT-59.1–59.5 (+ negative siblings) green with dated evidence
- [ ] STATUS updated: Monk MVL **VERIFIED** (workstation path still supported) **only after ADR-0001 Accepted**
- [ ] PoC behavior gaps closed or DECISIONS-waived (Modal fail-closed; schema pin; region)
- [ ] Operator runbook present: abort / retry / teardown / orphan Supabase cleanup (manual OK)
- [ ] Named verify script exists (e.g. `scripts/monk-mvl-verify.sh`) — CI optional, human VERIFIED mandatory

## Walking Skeleton strategy (DECISIONS / TRAIL)
- **Strategy B/C:** real Monk + one BYOC cloud; manual/slow VERIFIED probe; not CI Must (inherits Live E2E Won't unless elevated)

## VERIFIED evidence contract (`gate-evidence/slice-59.json`)
Required fields (minimum): `provider`, `region`, `kit_git_sha`, `https_url_redacted`, `postgrest_probe` (command + pass), `modal_deploy` (pass/fail), `schema_pin` (digest or image tag), `secrets_oracle` (`process_attestation`), `adr_0001_status` (`Accepted`), `verified_at` (ISO date), `operator_runbook_path`

## Before-Checks [GATE]
- [ ] Branch `slice/59-mvl-monk-deploy-proof` created
- [ ] Slice 58 ✅ on `main` or this branch includes 58 outputs
- [ ] **HITL / O0:** ADR-0001 status = **Accepted** (human) via [phase-O0-governance](phase-O0-governance.md) before any STATUS MVL **VERIFIED** claim
- [ ] Monk installed; cloud credentials available for one BYOC provider
- [ ] Tier 1 secrets ready for dashboard entry (never commit them)
- [ ] Operator runbook stub drafted (abort/retry/teardown)

## TDD Execution
- **Walking Skeleton** → outside-in acceptance probes first (`scripts/monk-mvl-verify.sh` + deploy checklist); unit tests for any bootstrap helpers changed
- Prefer recorded runbooks + automated probes over flaky full E2E in CI Must
- Live Monk E2E stays optional in CI (slow/manual VERIFIED) — matches prior Live E2E policy unless DECISIONS elevates it

## After-Checks [GATE]
- [ ] Code committed with `feat(slice-59): ...`
- [ ] Specification coverage: every GWT clause has ≥1 test **or** dated VERIFIED probe attached to gate-evidence
- [ ] `gate-evidence/slice-59.json` satisfies VERIFIED evidence contract above
- [ ] Complexity evidence for any product/bootstrap script changes: repository-native tool; policy `enforcing` if quality-gates already enforce, else `reporting` with explicit note
- [ ] Acceptance criteria met
- [ ] Docs: STATUS VERIFIED row; QUICKSTART/ARCHITECTURE may link “experimental Monk path” only after VERIFIED

### Closing Gates
- [ ] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [ ] `nw-software-crafter-reviewer` — code quality + TDD discipline review (slice close gate #9)
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — data flow / deploy topology review (gate #9, parallel)
- [ ] `nw-platform-architect-reviewer` — deploy/ops readiness
- [ ] `nw-gate-evidence-validator` — all 9 gate-evidence conditions pass
- [ ] `/verify-slice` — holistic evidence verdict COMPLETE (final closing gate)

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 2 (~50 min) [Walking Skeleton] |
| Execution time | — |
| Blockers encountered | — |
| Next-session notes | Expect Kit tweaks under deploy pressure |
