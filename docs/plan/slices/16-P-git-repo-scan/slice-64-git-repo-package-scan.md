# Slice 64: Git Repo Package + DepShield/Ossprey Scan

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔨 IN PROGRESS
> Wave: P — Git repo scan (package / OSS malware path)
> Depends on: slice 62 (fan-out + clone) conceptually; slice 63 (CLI inventory) for operator honesty — execute on branch that includes 63 inventory helpers
> Trigger: USER 2026-09-20 — `tripwire scan <github-repo>` must cover **not only** skills/MCPs **but also** package dependency audit (DepShield) and Ossprey malware scans; prior CLI inventory + clear outcomes still hold
> Branch: `slice/64-git-repo-package-scan` (branched from `slice/63-cli-scanner-inventory` so GWT-64.5 inventory works)

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 62 → `sandbox/scanners.py` (`SCANNER_GROUPS`) → ADR-0012 / ADR-0014

## Context
- **Stage objective**: A GitHub (or local) repo URL yields (1) existing skill/MCP fan-out **and** (2) a **package** scan target for the repo (or scoped path) so DepShield + Ossprey (+ Snyk if already `both`) run against real manifests — never by faking the tree as a skill.
- **Depends on**:
  - Slice 62: clone + `walkArtifacts` + `org/repo/<relpath>` identity for skills/MCPs
  - Slice 63: scanner inventory / rollup on CLI (honesty when Ossprey skipped, etc.)
- **Global invariants**: fail-closed clone; no synthetic “clean skill” for empty trees; scanner applicability stays honest; credentials absent → `skipped_missing_credential` not silent green

## Non-goals
- Treating the whole monorepo as an MCP server because `package.json` exists (keeps git-walk MCP marker strictness from slice 62)
- Running Cisco Skill / Tessl / Cisco MCP analyzers on plain application repos
- Auto-provisioning `OSSPREY_API_KEY` (slice 35 remains separate)
- GitLab/Bitbucket browse-URL parse (same GitHub boundary as 62)
- Changing Monk Kit / dashboard card chrome beyond showing the new item type honestly

## Output contract
- **Baseline (slice 62)**: repo with no skill/MCP markers → `[]` discovery → CLI zero-artifact / inventory `not run` (slice 63)
- **Target**: same repo with dependency manifests (e.g. vibe-kanban `package.json` / `Cargo.toml`) → ≥1 **package** target dispatched; DepShield + Ossprey (+ Snyk) applicable; Cisco skill/MCP/Tessl **not** applicable
- Repo that **also** has skills/MCPs → fan-out those **plus** the package target (when manifests exist)
- Repo with neither skill/MCP markers **nor** package manifests → clear zero-artifact outcome (still no fake skill); inventory `not run`
- CLI inventory (63) shows real statuses after package dispatch (e.g. Ossprey `skipped_missing_credential` → rollup `partly successful` or `fully failed` per 63 rules)

## Slice Workflow Bundle
- Slice name: `slice-64-git-repo-package-scan`
- Files (expected): `cli/src/discovery.js`, `cli/src/scannerInventory.js` (expected sources for `package`), `sandbox/scanners.py` (`SCANNER_GROUPS` / `_group_applies`), `sandbox/scan_app.py` (acquire path for package type), schema/`items.type` if new enum, dashboard type label, tests under `cli/test/discovery-git-*.js` + `sandbox/tests/`, docs STATUS/prerequisites soft-amend
- Exit criteria: GWT-64.* green; vibe-kanban-class fixture or characterization proves package target + DepShield/Ossprey group applicability; no skill-typed fake for empty skill trees
- Commit pattern: `feat(slice-64): git repo package + DepShield/Ossprey scan target`

## Branch
`slice/64-git-repo-package-scan`

## Spec (GWT / User Story)

As an operator, I want `tripwire scan https://github.com/org/repo` to scan skills and MCPs **and** run package/DepShield/Ossprey coverage on the repo’s dependency tree so application repos like vibe-kanban are not a dead end.

### GWT-64.1 — Package target when manifests exist (no skill/MCP)
**Given** a cloned GitHub repo with no `SKILL.md` / git MCP markers but with ≥1 package manifest at scope root (see markers table)
**When** `discoverTargets` / dry-discover runs on that URL
**Then** ≥1 target with `type: package` (name TBD in Identity — see DECIDED below) is returned
**And** no target is typed as `skill` solely to force a scan

### GWT-64.2 — Package target alongside skill/MCP fan-out
**Given** a repo containing ≥1 skill or MCP artifact **and** package manifests at repo (or scope) root
**When** discovery completes
**Then** skill/MCP rows remain as in slice 62
**And** exactly one package target is added for that scope root (no N× false MCP from every `package.json`)

### GWT-64.3 — Package scanners only (DepShield / Ossprey / Snyk)
**Given** a `package` item_type in the sandbox
**When** `run_all_scanners` / `_group_applies` runs
**Then** DepShield, Ossprey, and Snyk groups run (subject to credentials / reachability)
**And** Cisco Skill Scanner, Tessl, and Cisco MCP Scanner groups do **not** run

### GWT-64.4 — No manifests and no skill/MCP → still fail closed
**Given** a repo with neither skill/MCP markers nor package manifests
**When** discovery completes
**Then** zero scan targets (clear zero-artifact + inventory `not run` per 63)
**And** the tree is not scanned as a synthetic skill

### GWT-64.5 — CLI inventory reflects package scan honesty
**Given** a package target was dispatched
**When** `runScan` finishes
**Then** `[scanners]` inventory lists DepShield / Ossprey / Snyk with real statuses
**And** skill/MCP-only scanners are absent or `not_applicable` (not silently `completed`)

### GWT-64.6 — Identity carries org/repo
**Given** a package target from `https://github.com/org/repo`
**When** the item is upserted
**Then** `identifier` is under `org/repo` (see Identity contract)
**And** card/list can show `org/repo` signature consistent with slice 62

## Identity contract (Accepted 2026-09-20)

| Field | Value |
|-------|--------|
| `type` | **`package`** — USER-CONFIRMED Accept (DECISIONS 2026-09-20). New identity namespace for repo package/DepShield/Ossprey targets |
| `name` | Repo name, or scope basename; never pretend to be a skill frontmatter name |
| `identifier` | `org/repo` for repo-root package; if a skill/MCP already owns `org/repo` or `org/repo/.`, use `org/repo/@package` |
| `avail` | `source_on_disk` after host clone (same temp-clone packing as fan-out artifacts) |
| Card signature | `org/repo` (first two path segments of identifier, or strip `@package`) |

**Namespace note:** Adding `package` is a **new** identity namespace (not a collapse/rename). Accept recorded in DECISIONS; draft ADR-0014 Later/addendum if schema enum changes.

## Package markers (discovery)
At **scope root only** (not recursive monorepo explosion) — any one sufficient:

| Ecosystem | Markers (examples) |
|-----------|-------------------|
| Node | `package.json` |
| Python | `pyproject.toml`, `requirements.txt`, `Pipfile` |
| Rust | `Cargo.toml` |
| Go | `go.mod` |
| Lock-only | `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `Cargo.lock` (count as manifest presence when paired with or without parent — DECIDED: lockfile alone **counts**) |

Recursive “every package.json is an MCP” remains **forbidden** (slice 62).

## Relationship to GWT-62.6 (SUPERSEDES in part)
| Was (62.6) | Now (64) |
|------------|----------|
| No skill/MCP → zero targets, no whole-tree skill scan | No skill/MCP → **package target if manifests**; still **no** whole-tree skill scan |
| Empty always “no scan” | Empty of skill/MCP **and** manifests → still zero targets |

## SCANNER_GROUPS delta (execute)
- Extend `_group_applies` / registry so DepShield, Ossprey, Snyk apply to `package` (today `both` = skill + non-skill; refine so `package` does not inherit MCP-only groups).
- Clean design: `applies_to` includes `package`, or map `both` → skill+mcp+package while mcp_server groups stay mcp-only and skill groups stay skill-only.
- Cisco Skill + Tessl remain `skill` only; Cisco MCP remains `mcp_server` only.

## Component contracts (Effect Isolation)
| Component | Shape | Universe | Declared delta |
|-----------|-------|----------|----------------|
| `discoverGitHubRepo` / package detect | Bounded | temp clone | +package row(s) |
| `_group_applies` / `SCANNER_GROUPS` | Pure + registry | — | package applicability |
| `upsertItem` / schema type | Unbounded-preservation | Supabase `items` | new type if Accept |
| CLI inventory expected list | Pure | — | package → Snyk/DepShield/Ossprey |

## Execution plan (2026-09-20)

Ordered steps — implement after this plan is saved; branch from slice-63 work so inventory helpers exist for GWT-64.5.

1. **Branch** — `git checkout -b slice/64-git-repo-package-scan` from current `slice/63-cli-scanner-inventory` tree (uncommitted 63 inventory carried forward).
2. **Discovery** — In `cli/src/discovery.js`, detect package markers at scope root; emit one `type: 'package'` target; identifier `org/repo` or `org/repo/@package` on collision with skill/MCP.
3. **Inventory map** — In `cli/src/scannerInventory.js`, map `package` → expected sources DepShield / Ossprey / Snyk.
4. **Sandbox routing** — Refine `_group_applies` / `SCANNER_GROUPS` in `sandbox/scanners.py` so `package` gets Snyk+DepShield+Ossprey only; Cisco Skill/Tessl/MCP do not apply.
5. **Schema / dashboard** — Add `package` to `items.type` enum / UI labels so upsert succeeds.
6. **Acquire path** — Confirm `sandbox/scan_app.py` packs/acquires `package` like other on-disk sources (no skill fake).
7. **Tests** — Discovery package fan-out fixture; `_group_applies` package; update zero-artifact tests so package.json-only dirs are not empty; inventory expected list for package.
8. **Docs soft-amend** — STATUS / prerequisites “What can I scan?”; honesty that Ossprey remains credential-gated.
9. **Verify** — Focused CLI + sandbox tests; quality gates as needed.

### Risks
| Risk | Mitigation |
|------|------------|
| Monorepo `package.json` explosion | Scope-root only; never recurse every package.json as MCP |
| `both` incorrectly routes package into MCP groups | Explicit `applies_to` / type map — mcp groups stay mcp-only |
| Schema reject on upsert | Accept logged; add enum value before dispatch |
| Slice 63 not on branch | Branch from 63 tree so inventory map is available |

## Closing Gates
1. GWT-64.1–64.6 green (characterization + unit; live Modal optional for VERIFIED)
2. Schema/dashboard Accept logged — `items.type=package` Accepted 2026-09-20
3. Soft-amend STATUS / prerequisites “What can I scan?”; ADR-0014 Later/addendum
4. Slice 63 inventory still correct for package-only and mixed batches
5. Quality gates

## Gate Status
🔨 IN PROGRESS — Accept `items.type=package` USER-CONFIRMED 2026-09-20 (DECISIONS); execution on `slice/64-git-repo-package-scan`
