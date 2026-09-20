# Slice 69: Fix Propose + Apply-Clean Check

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔨 IMPLEMENTED ON BRANCH
> Timestamp: 2026-09-20T16:20:00Z
> Wave: R — Approved-repo security workflow
> Depends on: **68** (Investigate → Fix step)
> Trigger: True positives get a minimal proposed patch, root-cause vs quick-patch label, apply-clean check on temp copy
> Branch: `slice/69-fix-propose-apply-clean`

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 68

## Context
- **Stage objective**: For each true_positive (and operator-selected multi-finding set from Triage — see slice 75), suggest a minimal fix (diff), explain root cause, classify root-cause vs quick patch, test whether the patch applies cleanly on a temporary copy/worktree; never auto-modify the approved repository.
- **Depends on**: Slice 68 Fix step entry; SIE for fix text via existing client when LLM propose is enabled
- **Global invariants**: proposed patch only; no host execution of untrusted PoC beyond isolated temp apply
> Soft-amended 2026-09-20 (USER): **Fix propose model = stronger generate** (`gen-27b` preferred); show model + parent target on Fix; heuristic fallback remains honest (no fake model id).

## Non-goals
- Re-scan verification of patched tree (slice 70)
- Auto-commit to approved repo
- Expert export (71)
- Workflow multi-select chrome (slice 75) — this slice consumes selected finding id(s) once provided

## Output contract
- **Baseline**: no guided fix diff / apply-clean signal
- After: Fix step shows side-by-side problem vs diff; copy patch / copy git apply; apply-clean boolean; mark fixed / won't-fix (reason required); J/K navigation; progress “N of M reviewed”
- **Model**: when LLM propose runs, record `model` / `modelId` = stronger generate alias (`gen-27b` preferred); heuristic/provided patches keep `source` without inventing a model id (slice 74 labels accordingly)

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
**And** parent target metadata (type + name/id: skill / mcp_server / package / …) is visible with the finding — not the vuln title alone
**And** when LLM propose is used, provenance records the stronger model (`gen-27b` preferred) for slice 74/75 to display

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
- [x] Branch created
- [x] GWT RED tests

## After-Checks [GATE]
- [x] Tests pass
- [x] Specification coverage
- [x] Complexity evidence recorded
- [x] Doc Audit: STATUS — proposed patch only

### Closing Gates
- [x] `nw-at-completeness-check`
- [x] `nw-software-crafter-reviewer`
- [x] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [x] `nw-gate-evidence-validator`
- [x] `/verify-slice` — COMPLETE

## Gate Status
✅ VERIFIED ON BRANCH — GWT-69.* + Gate 4 APPROVED on `slice/69-fix-propose-apply-clean`; not merged / not ✅ PASSED
