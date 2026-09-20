# Slice 63: CLI Scanner Inventory

> Scenario: Brownfield | MoSCoW: **Should** | Status: 🔀 ON BRANCH
> Wave: P — Git repo scan (CLI operator honesty follow-on)
> Depends on: none (pairs with GWT-62.6 zero-artifact UX; reuses `scan_run_scanners` + `SCANNER_GROUPS`)
> Trigger: Operator cannot tell from `tripwire scan` which scanners ran, were skipped, failed, or never started (e.g. vibe-kanban zero-artifact)

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → `sandbox/scanners.py` (`SCANNER_GROUPS`)

## Context
- **Stage objective**: After every `tripwire scan` outcome that the operator cares about (zero-artifact **and** dispatched runs), print a scanner inventory + rollup so success/skip/fail/`not_run` is visible without opening the dashboard.
- **Depends on**: none
  - Reuses: `SCANNER_GROUPS` source names, `scan_run_scanners.status`, CLI `runScan` / zero-artifact path in `tripwire.js`
- **Global invariants**: do not invent fake clean scans; do not weaken fail-closed discovery; honesty when credentials missing (`skipped_missing_credential`)

## Non-goals
- Changing which scanners run or their adapter logic (except listing honesty)
- Dashboard UI changes
- Auto-provisioning Ossprey / other credentials
- Inventing a synthetic **skill** scan for repos that only have package manifests (that path is **slice 64** `package` type — not a skill)

## Output contract
- **Baseline**: `tripwire scan <explicit-target>` with zero artifacts prints only a one-line zero-artifact message (or historically the misleading “Pass a path/URL” error) — **no** scanner list
- **Baseline**: successful `runScan` prints batch JSON — **no** per-scanner inventory
- Zero-artifact / no-sandbox path (no skill, MCP, **or** package target) prints inventory with expected registry sources as `not_run` and rollup `not run`
- After dispatch (including **slice 64** package targets), inventory reflects `scan_run_scanners` rows (plus `not_run` for expected-but-missing applicable sources) and rollup `fully successful` | `partly successful` | `fully failed`
- **Holds with slice 64:** package-only repos must **not** stay on the zero-artifact `not_run` path once 64 ships — they dispatch and show real DepShield/Ossprey/Snyk statuses

## Slice Workflow Bundle
- Slice name: `slice-63-cli-scanner-inventory`
- Files: `cli/src/scannerInventory.js` (new), `cli/bin/tripwire.js`, `cli/src/orchestrator.js`, `cli/test/scannerInventory.test.js`, `cli/test/orchestrator.test.js`
- Exit criteria: GWT-63.* green; unit tests for rollup + format; zero-artifact path shows inventory; mocked post-scan path shows statuses
- Commit pattern: `feat(slice-63): CLI scanner inventory after scan`

## Branch
`slice/63-cli-scanner-inventory`

## Spec (GWT / User Story)

As an operator, I want `tripwire scan` to print which scanners succeeded, failed, were skipped, or never ran, so I know coverage honesty without leaving the terminal.

### GWT-63.1 — Zero-artifact path lists scanners as not_run
**Given** an explicit GitHub/path target that discovers **no** skill, MCP, or package targets
**When** `tripwire scan <target>` completes
**Then** stdout includes a scanner inventory where each expected registry source is `not_run`
**And** the rollup line is `not run` (sandbox never started)
**And** exit code is 0 (clear zero-artifact outcome; not the missing-args error)
**Note:** After slice 64, repos with only package manifests take the dispatch + inventory path instead of this GWT.

### GWT-63.2 — Post-scan inventory reflects scan_run_scanners
**Given** at least one scan_run was dispatched and scanner rows exist in Supabase
**When** `runScan` finishes dispatch for that run
**Then** stdout includes an inventory with each row’s `scanner_source` and `status`
**And** applicable sources missing from DB are shown as `not_run`

### GWT-63.3 — Rollup fully / partly / fully failed
**Given** a set of inventory statuses for one target
**When** rollup is computed
**Then** all `completed` → `fully successful`
**And** mix of `completed` with any non-completed → `partly successful`
**And** ≥1 row and zero `completed` → `fully failed`
**And** all `not_run` (no sandbox) → `not run`

### GWT-63.4 — Empty args + --no-defaults unchanged
**Given** `tripwire scan --no-defaults` with no targets
**When** the command exits
**Then** stderr still matches `/No targets found/` and exit code is 1
**And** no scanner inventory is required (operator never selected a target)

## Rollup rules (DECIDED with this stub)
| Rollup | Condition |
|--------|-----------|
| `fully successful` | ≥1 row and every status is `completed` |
| `partly successful` | ≥1 `completed` and ≥1 other status |
| `fully failed` | ≥1 row, zero `completed` |
| `not run` | every status is `not_run` (or empty expected list treated as not run) |

`skipped_missing_credential`, `unreachable`, `partial-failed`, `not_applicable` count as non-completed for rollup.

## Expected sources (host mirror of SCANNER_GROUPS)
Host CLI mirrors source **names** + `applies_to` from `sandbox/scanners.py` `SCANNER_GROUPS` (skill / mcp_server / both). Drift vs Python is a Doc Audit item — keep names identical.

## Component contracts (Effect Isolation)
| Component | Shape | Universe | Declared delta |
|-----------|-------|----------|----------------|
| `rollupScannerInventory` / `formatScannerInventory` | Pure | — | Rollup string + formatted lines |
| `expectedScannersFor(itemType)` | Pure | — | Source list for skill / mcp / null (all) |
| `printScannerInventory` / orchestrator fetch | Bounded I/O | Supabase `scan_run_scanners` | stdout inventory |

## Closing Gates
Required before `🔀 ON BRANCH → ✅ PASSED` (PASSED also requires merge to `main` per GATE_CONTRACT):

1. GWT-63.1–63.4 green (unit + CLI characterization where feasible without live Modal)
2. Quality gates for CLI package
3. Doc Audit: STATUS or user-guide one-liner that scan prints scanner inventory (honest; no VERIFIED claim for Ossprey live)

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (scope: **both** zero-artifact + post-scan inventory)
