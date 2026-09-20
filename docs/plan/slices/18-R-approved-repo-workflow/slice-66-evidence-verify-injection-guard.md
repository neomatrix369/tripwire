# Slice 66: Evidence Verify + Injection Guard

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **65** (candidates + coverage context)
> Trigger: Findings must be independently checkable; scanned content must not instruct judges/scanners
> Branch: `slice/66-evidence-verify-injection-guard`

## Session bootstrap
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 65

## Context
- **Stage objective**: For each candidate finding, verify quoted code/text exists at the reported location; run deterministic checks for prompt-injection / hidden / encoded instruction attempts in scanned content; mark evidence **evidence verified** only when checks pass.
- **Depends on**: Slice 65 coverage + existing scanner findings pipeline
- **Global invariants**: → `docs/plan/invariants.md` — scanned repo content is untrusted data; never execute scanned host code

## Non-goals
- Judge panel / final verdict (slice 67)
- Changing ADR-0016 router behaviour
- Automatic patch application

## Output contract
- **Baseline**: findings may cite paths/lines without host-side existence check or injection scan
- After: each finding has evidence verification status; injection/hidden-content attempts reportable as findings where appropriate; unverified evidence cannot drive a silent true-positive

## Slice Workflow Bundle
- Slice name: `slice-66-evidence-verify-injection-guard`
- Files: new evidence module (CLI or sandbox), finding enrichment, tests, fixtures with injection samples
- Exit criteria: GWT-66.* green
- Commit pattern: `feat(slice-66): evidence verify and injection guard`

## Branch
`slice/66-evidence-verify-injection-guard`

## Spec (GWT / User Story)

### GWT-66.1 — Verified evidence
**Given** a finding quoting exact text at path:line
**When** verification runs against the approved commit tree
**Then** status is **evidence verified** iff the text exists at that location
**And** missing/mismatched quotes are not marked verified

### GWT-66.2 — Model locations alone are insufficient
**Given** a model-provided citation that does not match disk
**When** verification runs
**Then** verification fails closed
**And** the finding is not presented as independently confirmed

### GWT-66.3 — Injection / hidden content
**Given** scanned skill/MCP/tool text containing instruction-like or hidden/encoded attempts to influence scanners or judges
**When** deterministic guards run
**Then** the attempt is recorded (finding or explicit warning)
**And** scanned content is never copied into system/judge instruction channels as executable instructions

### GWT-66.4 — Secrets masked by default
**Given** evidence containing secret-like tokens
**When** shown in logs/prompts/exports
**Then** secrets are masked unless the operator explicitly reveals

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 65 coverage available or mocked
- [ ] GWT RED tests authored

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage: every GWT clause has ≥1 test
- [ ] Complexity evidence: policy recorded (enforcing/reporting)
- [ ] Doc Audit: STATUS — evidence verified + untrusted-data boundary

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (Wave R)
