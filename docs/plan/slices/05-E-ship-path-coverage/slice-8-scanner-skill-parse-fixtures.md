# Slice 8: Scanner Skill Parse Fixtures (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-8-scanner-skill-parse-fixtures
- Files: `sandbox/scanners.py`, `sandbox/test_*.py` (new or extend), fixture JSON under `fixtures/` or `sandbox/` test data
- Exit criteria: Real `run_cisco_skill_scanner` / `_map_skill_findings` / `_safe_json` paths exercised via stubs for `_run`/`_which` only; no live CLI.
- Commit pattern: `test(slice-8): cisco skill parse fixtures`

## Branch
`slice/8-scanner-skill-parse-fixtures`

## Priority note
Must coverage wave. **Execute after slice 17** (and slice 7). Technical depends-on remains 7; roadmap order is 7 → 17 → **8** → 11–13.

## Context references (mandatory)
- Product SoT: private references (Phase 2 adapters)
- Adapter research: private references
- Public mirror: `docs/research/adapters/scanner-output-adapters.md`
- Audit: `docs/plan/coverage-audit.md` (from slice 7)
- Code: `sandbox/scanners.py`

## Spec (GWT / User Story)
**Given** recorded skill-scanner JSON (happy + malformed) and stubbed subprocess
**When** skill adapter parse/map runs
**Then** findings/status/console shapes match the adapter contract (research + current code); research drift flagged in DECISIONS or audit

## Out of scope (already exists)
- `test_scanners_status.py` `run_all` orchestration that **patches** `run_cisco_skill_scanner`
- MCP live/behavioral cmd builders (`test_scanners_mcp_cli.py`)
- Live CLI / Modal invocation

## Before-Checks [GATE]
- [x] Branch created
- [x] Slice 7 ✅ or audit matrix available
- [x] Context pack + adapter research opened
- [x] Confirmed skill parse bodies still uncovered

## TDD Execution
Outside-in: failing fixture tests → GREEN with `_run`/`_which` stubs → refactor tests.
VERIFY: `pytest sandbox/ -q --tb=short`

## After-Checks [GATE]
- [x] `pytest sandbox/ -q --tb=short` exit 0
- [x] Fixture tests exist for skill happy path, malformed payload, and severity map (paths listed in evidence)
- [x] Coverage on touched skill-parse functions: baseline % → after % recorded in `gate-evidence/slice-8.json` (after ≥ baseline)
- [x] `docs/plan/gate-evidence/slice-8.json` has `"verdict": "PASS"` + `commands[]`
- [x] PROGRESS/TRAIL updated; ✅ only after merge (🔀 while PR open)

## Gate Status
✅ PASSED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Next-session notes | Slice 9 in parallel-ok after 7; serial if shared fixtures |
