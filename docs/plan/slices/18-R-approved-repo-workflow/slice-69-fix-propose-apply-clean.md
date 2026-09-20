# Slice 69: Fix Propose + Apply-Clean Check

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **68** (Investigate → Fix step)
> Trigger: True positives get a minimal proposed patch, root-cause vs quick-patch label, apply-clean check on temp copy
> Branch: `slice/69-fix-propose-apply-clean`

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 68

## Context
- **Stage objective**: For each true_positive, suggest a minimal fix (diff), explain root cause, classify root-cause vs quick patch, test whether the patch applies cleanly on a temporary copy/worktree; never auto-modify the approved repository.
- **Depends on**: Slice 68 Fix step entry; SIE optional for fix text via existing client
- **Global invariants**: proposed patch only; no host execution of untrusted PoC beyond isolated temp apply

## Non-goals
- Re-scan verification of patched tree (slice 70)
- Auto-commit to approved repo
- Expert export (71)

## Output contract
- **Baseline**: no guided fix diff / apply-clean signal
- After: Fix step shows side-by-side problem vs diff; copy patch / copy git apply; apply-clean boolean; mark fixed / won't-fix (reason required); J/K navigation; progress “N of M reviewed”

## Slice Workflow Bundle
- Slice name: `slice-69-fix-propose-apply-clean`
- Files: fix proposer module, temp apply helper, dashboard Fix step, tests
- Exit criteria: GWT-69.* green
- Commit pattern: `feat(slice-69): fix propose and apply-clean check`

## Branch
`slice/69-fix-propose-apply-clean`

## Spec (GWT / User Story)

### GWT-69.1 — Proposed minimal fix
**Given** a true_positive finding with verified evidence
**When** Fix step opens
**Then** a minimal unified diff is shown next to the problem
**And** root-cause vs quick-patch is labelled
**And** a regression-test suggestion is present

### GWT-69.2 — Apply-clean on temp copy
**Given** a proposed patch
**When** apply-clean is evaluated
**Then** patch is applied only to a temporary copy/worktree
**And** result states whether it applies cleanly
**And** the approved repo working tree is unchanged

### GWT-69.3 — Operator controls
**Given** Fix step
**When** operator uses mark fixed / won't fix / copy patch / copy git command
**Then** won't-fix requires a reason
**And** keyboard J/K moves next/previous

### GWT-69.4 — Never claim fixed from generation alone
**Given** a generated patch
**When** verification (slice 70) has not run
**Then** UI does not claim the vulnerability is fixed solely because a patch was generated

## Before-Checks [GATE]
- [ ] Branch created
- [ ] GWT RED tests

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage
- [ ] Complexity evidence recorded
- [ ] Doc Audit: STATUS — proposed patch only

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (Wave R)
