# Slice 70: Verify Fix via Worktree Re-Check

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **69**
> Trigger: Re-check patched temp copy — finding gone / still present / unable to verify
> Branch: `slice/70-verify-worktree-rescan`

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slices 65–69

## Context
- **Stage objective**: Apply the proposed patch to an isolated temp copy/worktree, re-run the applicable scanner/checks that produced the finding, and report verification outcome with what actually ran.
- **Depends on**: Slice 69 proposed patch + apply-clean
- **Global invariants**: never modify approved repo unless operator explicitly chooses apply-to-repo (out of scope for default path)

## Non-goals
- Claiming fixed solely because patch generated (69)
- Expert export (71)
- New ecosystem scanners (72)

## Output contract
- **Baseline**: Fix step ends at propose/apply-clean
- After: Verify step shows gone | still present | unable to verify + scanner actions that ran

## Slice Workflow Bundle
- Slice name: `slice-70-verify-worktree-rescan`
- Files: verify orchestration, dashboard Verify step, tests
- Exit criteria: GWT-70.* green
- Commit pattern: `feat(slice-70): verify fix via worktree rescan`

## Branch
`slice/70-verify-worktree-rescan`

## Spec (GWT / User Story)

### GWT-70.1 — Finding gone
**Given** a patch that removes the issue and applicable scanners complete
**When** verification runs on the temp tree
**Then** outcome is **finding gone**

### GWT-70.2 — Still present
**Given** a patch that does not remove the issue
**When** verification completes
**Then** outcome is **still present**

### GWT-70.3 — Unable to verify
**Given** scanner failure, timeout, or missing applicable scanner for the ecosystem
**When** verification attempts
**Then** outcome is **unable to verify** with reason
**And** this is never shown as finding gone

## Before-Checks [GATE]
- [ ] Branch created
- [ ] GWT RED tests

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage
- [ ] Complexity evidence recorded
- [ ] Doc Audit: STATUS Verify step honesty

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (Wave R)
