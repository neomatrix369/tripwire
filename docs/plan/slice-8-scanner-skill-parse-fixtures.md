# Slice 8: Scanner Skill Parse Fixtures (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-8-scanner-skill-parse-fixtures
- Files: `sandbox/scanners.py`, `sandbox/test_*.py` (new or extend), fixture JSON under `fixtures/` or `sandbox/` test data
- Exit criteria: Real `run_cisco_skill_scanner` / `_map_skill_findings` / `_safe_json` paths exercised via stubs for `_run`/`_which` only; no live CLI.
- Commit pattern: `test(slice-8): cisco skill parse fixtures`

## Branch
`slice/8-scanner-skill-parse-fixtures`

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md` (Phase 2 adapters)
- Adapter research: `internal-docs/00_build/research/scanner-output-adapters.md`
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
- [ ] Branch created
- [ ] Slice 7 ✅ or audit matrix available
- [ ] Context pack + adapter research opened
- [ ] Confirmed skill parse bodies still uncovered

## TDD Execution
Outside-in: failing fixture tests → GREEN with `_run`/`_which` stubs → refactor tests.
VERIFY: `pytest sandbox/ -q --tb=short`

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage: skill happy + malformed + map severity
- [ ] Branch coverage on touched parse paths improved (toward slice 11)
- [ ] Gate evidence `slice-8.json` at PASS

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Next-session notes | Slice 9 in parallel-ok after 7; serial if shared fixtures |
