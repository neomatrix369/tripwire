# Slice 62: Git Repo Discover + Fan-Out

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔀 ON BRANCH
> Wave: P — Git repo scan (skills + MCPs)
> Depends on: none (reuses ADR-0012 acquire + `discoverTargets` / `expandFolder` patterns)
> Trigger: Live fail — `tripwire scan https://github.com/…/tree/…` clones browse URL; git URLs never expand to skills/MCPs

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md (if present) → this stub → ADR-0012

## Context
- **Stage objective**: A GitHub repo URL (root or `/tree|/blob/…`) becomes N separate scan targets — every skill and MCP in the tree — each with correct `item_type`, scanners per `SCANNER_GROUPS` / `applies_to`, and dashboard identity carrying `org/repo`.
- **Depends on**: none
  - Reuses: `cli/src/discovery.js` (`expandFolder`, `detectType`, `discoverTargets`), `sandbox/scan_app.py` (`_acquire_target` / `_clone_repo`), `cli/src/orchestrator.js` (`upsertItem`), dashboard card fields (`name` / `identifier`)
- **Global invariants**: fail-closed clone; no empty workdir; one `scan_run` per artifact; do not weaken scanner applicability

## Non-goals
- GitLab/Bitbucket browse-URL parse (GitHub `tree`/`blob` only in this slice)
- Changing scanner registry membership or vendor CLIs
- Machine-default locus discovery changes (zero-arg `tripwire scan`)
- New dashboard components or tabs — reuse existing card markup only
- Sparse-checkout optimisation beyond shallow clone (depth=1 is enough)

## Output contract
- **Baseline**: `node -e "import('./cli/src/discovery.js').then(m=>m.discoverTargets({targets:['https://github.com/pbakaus/impeccable'],useDefaults:false}).then(console.log))"` → today: one `mcp_server` / `cloneable` row with the raw URL
- `--dry-discover` on a repo URL lists ≥1 skill and/or mcp_server with `identifier` shape `org/repo/<relpath>`
- Browse URL `…/tree/<ref>/<path>` normalizes before clone (no `git clone …/tree/…`)
- Live dispatch: one Modal `scan_item` per discovered artifact; skill scanners only on skills; MCP scanners only on MCPs; shared groups still `both`
- Dashboard list/detail: card shows artifact `name` (basename) and visible `org/repo` signature (from `identifier` prefix)

## Slice Workflow Bundle
- Slice name: `slice-62-git-repo-discover-fanout`
- Files: `cli/src/discovery.js`, `cli/src/orchestrator.js` (identifier/name for git-sourced), `sandbox/scan_app.py` (normalize before clone if still needed after host expand), `cli/test/discovery*.js`, `sandbox/tests/test_acquire_target.py`, `prototypes/dc-dashboard/Tripwire.dc.html` (card shows org/repo — reuse existing fields), docs via slice 56-a amend
- Exit criteria: All GWT-62.* green; quality gates; dry-discover evidence for a public multi-artifact repo; card shows `org/repo`
- Commit pattern: `feat(slice-62): git repo discover fan-out for skills and MCPs`

## Branch
`slice/62-git-repo-discover-fanout`

## Spec (GWT / User Story)

As an operator, I want `tripwire scan https://github.com/org/repo` (or a `/tree/…` browse URL) to discover every skill and MCP in that repo, scan each separately with the right scanners, and show `org/repo` on dashboard cards so I can find them.

### GWT-62.1 — Browse URL normalizes to cloneable repo
**Given** target `https://github.com/pbakaus/impeccable/tree/main/skill`
**When** discovery/acquire resolves the git target
**Then** clone uses `https://github.com/pbakaus/impeccable` (not the `/tree/…` path)
**And** optional path `skill` scopes discovery when present

### GWT-62.2 — Repo root fans out skills and MCPs
**Given** a cloned (or host-temp cloned) repo containing ≥1 `SKILL.md` tree and ≥1 MCP-marker tree
**When** `tripwire scan <github-repo-url> --dry-discover`
**Then** output lists separate rows for each skill (`type: skill`) and each MCP (`type: mcp_server`)
**And** raw single-URL `mcp_server`/`cloneable` without expansion does not remain the only row

### GWT-62.3 — Each artifact is a separate scan dispatch
**Given** dry-discover returned N>1 targets from one repo URL
**When** `runScan` dispatches (unit/characterization with mocked spawn)
**Then** spawn is invoked once per target with that target’s `itemType`
**And** each upsert uses distinct `identifier` values under the same `org/repo` prefix

### GWT-62.4 — Scanners follow item_type applicability
**Given** a skill target and an mcp_server target from the same repo
**When** sandbox scanner groups run (unit against `SCANNER_GROUPS` / `_group_applies`)
**Then** skill-only groups run for the skill; mcp-only groups for the MCP; `both` for each

### GWT-62.5 — Dashboard cards carry org/repo signature
**Given** an item persisted from a git repo fan-out with `identifier` `org/repo/<relpath>` and `name` = basename
**When** the Live/Mock card list renders that item
**Then** the card shows the artifact name
**And** the visible `org/repo` signature appears on the card (reuse `identifier` prefix or dedicated subtitle — no new card component type)

### GWT-62.6 — Empty / no-artifact repo fails closed
**Given** a cloneable repo with no skill and no MCP markers
**When** discovery completes
**Then** the operator gets a clear zero-artifact outcome (no fake empty “clean” single scan of the whole tree as a skill)

## Identity contract (DECIDED with this stub)
| Field | Value |
|-------|--------|
| `name` | Artifact basename (folder name) |
| `identifier` | `org/repo/<relpath>` (POSIX, no leading `/`) |
| Card signature | `org/repo` derived from identifier (first two path segments) |

## Before-Checks [GATE]
- [x] Branch `slice/62-git-repo-discover-fanout` created (not on `main`)
- [x] This stub opened; ADR-0012 + `discovery.js` `resolveTarget`/`detectType` re-read
- [x] Confirm Wave O slices 58–61 (monk kit, other branch) are not edited here
- [x] Prior session recovery checked (if resuming)

## TDD Execution
Backend / discovery: outside-in dry-discover GWTs → unit tests for URL parse + walk + upsert identity → acquire_target normalize tests.

RED → GREEN → REFACTOR PROD → REFACTOR TESTS → VERIFY+COVERAGE

**Complexity evidence (product-code):** enforcing via repo `./scripts/quality-gates.sh`; local report: CLI eslint complexity + Python radon on touched modules; reviewer summary in PR body under `<!-- complexity-summary -->` … `<!-- /complexity-summary -->`.

Complexity evidence recorded 2026-09-09: `./scripts/quality-gates.sh` exit 0 (xenon/ruff/mypy green on touched paths).

## After-Checks [GATE]
- [x] Code committed with `feat(slice-62): …` (this commit)
- [x] Specification coverage: every GWT-62.* has ≥1 test; 90–100% clauses covered
- [x] Gate 1 — Coverage: ship-path / touched modules per project gates (`./scripts/quality-gates.sh`)
- [x] Gate 2 — Complexity: zero new violations on touched functions; evidence recorded
- [x] Complexity evidence: tool/scope/policy/command/summary markers recorded above
- [x] `cd cli && npm test` green for discovery + orchestrator characterization (145 pass)
- [x] Sandbox acquire tests green for browse-URL normalize
- [x] Manual: `--dry-discover` on `https://github.com/pbakaus/impeccable` → 24 skill rows with `pbakaus/impeccable/…` identifiers
- [x] Docs: slice 56-a Git URL row reflects browse URL + multi-item behaviour
- [x] Acceptance criteria met

## Acceptance criteria (short-form)
- [x] Browse `/tree|/blob/` URLs never passed verbatim to `git clone`
- [x] Repo URL → N skill/MCP targets; each scanned separately
- [x] `item_type` drives scanner groups (`applies_to`)
- [x] Items use `identifier` = `org/repo/<relpath>`; cards show `org/repo`
- [x] Zero-artifact repos do not produce a misleading single clean scan
- [x] Quality gates pass; gate-evidence prepared on PASSED

## Doc Audit
| # | Item | Check |
|--|------|-------|
| 1 | README / plan README wave map | Wave P row |
| 5 | CHANGELOG | Unreleased when IMPLEMENTED |
| 6 | ARCHITECTURE / ADR-0012 later note | Fan-out + browse normalize |
| 9 | prerequisites via slice 56-a | Git URL taxonomy |
| 14 | No orphaned refs | TRAIL/PROGRESS/DECISIONS aligned |

## Gate Status
🔀 ON BRANCH

## What Changed
| File | Type | Reason |
|------|------|--------|
| `cli/src/discovery.js` | feat | Browse URL parse; host shallow-clone fan-out; strict git-walk MCP markers |
| `cli/src/orchestrator.js` | feat | Prefer target.identifier / target.name on upsert |
| `sandbox/scan_app.py` | feat | Normalize GitHub browse URLs before clone |
| `prototypes/dc-dashboard/tripwire-status.js` | feat | `repoSignatureFromIdentifier` |
| `prototypes/dc-dashboard/Tripwire.dc.html` | feat | Grid/list org/repo subtitle |
| `cli/test/discovery-git-fanout.test.js` | test | GWT-62.1/62.2/62.6 + walk harden |
| `cli/test/orchestrator-characterization.test.js` | test | GWT-62.3 multi-spawn |
| `docs/user-guide/prerequisites.md` | docs | 56-a Git URL taxonomy |
| `docs/plan/gate-evidence/slice-62.json` | docs | Closing evidence |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 2 (~50 min) [Walking Skeleton] |
| Execution time | ~1 session |
| Blockers encountered | Missing DECISION-OWNERSHIP/invariants on main (instantiated); package.json MCP false-positives (strict git-walk markers) |
| Next-session notes | Temp clone dirs retained for pack path (cleanup follow-up); mark ✅ only after PR merge |
