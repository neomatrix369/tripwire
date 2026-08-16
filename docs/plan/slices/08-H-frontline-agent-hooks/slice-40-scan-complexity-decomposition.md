<!-- file: docs/plan/slices/08-H-frontline-agent-hooks/slice-40-scan-complexity-decomposition.md -->

## Slice 40: Scanner Complexity Decomposition

Refactor the monolithic scanner dispatch functions (`run_snyk` CC=28, rank D;
`run_cisco_mcp_scanner` CC=23, rank D) in `sandbox/scanners.py` into focused
single-responsibility helpers; target CC ≤ 15 (rank C) for each, with no behaviour change.

**Project:** `tools-and-utilities/tripwire`
**Branch:** `slice/40-scanner-complexity-decomposition`
**MoSCoW:** Must

---

### Files

- `sandbox/scanners.py` — `run_snyk` and `run_cisco_mcp_scanner` decomposed into helper functions
- `sandbox/tests/test_scanners_snyk.py` — characterisation + unit tests for extracted helpers (new file)
- `sandbox/tests/test_scanners_mcp_cli.py` — regression tests updated for any extracted MCP helpers

### Exit criteria

- [ ] `run_snyk` cyclomatic complexity ≤ 15 (rank C or better) — `uv run radon cc sandbox/scanners.py -s`
- [ ] `run_cisco_mcp_scanner` cyclomatic complexity ≤ 15 (rank C or better) — same command
- [ ] All extracted functions independently testable (each has ≥1 unit test)
- [ ] No behaviour change — all existing tests pass; no new failures introduced
- [ ] `uv run xenon --max-absolute D --max-modules B --max-average A sandbox/` passes (scanners absolute-D policy per quality-gates.sh)
- [ ] Characterisation tests written before any refactor changes are committed
- [ ] `./scripts/quality-gates.sh` passes (all tiers)

### Commit pattern

```
refactor(slice-40): decompose run_snyk + run_cisco_mcp_scanner to rank C

- run_snyk CC 28→≤15; run_cisco_mcp_scanner CC 23→≤15
- Extracted helpers are independently testable; no observable behaviour changed
- Improves maintainability for remaining Wave H slices that touch scanner dispatch
```

---

### Motivation

`run_snyk` (CC=28, rank D) and `run_cisco_mcp_scanner` (CC=23, rank D) in
`sandbox/scanners.py` each handle multiple distinct concerns in a single function:
subprocess dispatch, output parsing, error collection, finding mapping, severity
classification, and outcome determination. This makes each function hard to unit-test
in isolation, expensive to review, and error-prone to extend.

Remaining Wave H slices (26 — API Introspect, 29 — `/tw-scan`, 38 — Full-Chain Validation)
will all touch scanner dispatch. Each slice is cheaper to implement and review if the
dispatch functions are thin orchestrators calling well-named, testable helpers.

### Spec (GWT / User Story)

As a developer maintaining Tripwire's scanner layer, I want `run_snyk` and
`run_cisco_mcp_scanner` to be thin orchestration shells calling well-named
single-responsibility helpers so that each concern can be read, tested, and
changed in isolation.

**Scenario: Snyk JSON parsing is independently testable**
  Given a valid Snyk subprocess stdout string
  When `_snyk_parse_root(out, err)` is called
  Then it returns the parsed dict, or None if JSON is absent or malformed

**Scenario: Snyk path findings extraction is isolated**
  Given a single path_result dict from the Snyk envelope
  When `_snyk_collect_path_findings(path_result)` is called
  Then it returns `(findings_list, errors_list)` for that path only

**Scenario: Snyk finding mapping is a named step**
  Given a single Snyk issue dict with a `code` field
  When `_snyk_map_finding(issue)` is called
  Then it returns a Tripwire finding dict with severity, category, message, and scanner_source

**Scenario: Snyk outcome resolution handles error/clean cases**
  Given findings, checks, paths_seen, collected_errors, and raw out/err
  When `_snyk_resolve_outcome(findings, checks, paths_seen, collected_errors, out, err, console)` is called
  Then it returns the correct `(findings, [check_row])` tuple for each case: auth-only error → skipped, mixed error → unreachable, clean → completed

**Scenario: MCP envelope mapping is isolated**
  Given a raw MCP result envelope
  When `_mcp_map_findings(result)` is called
  Then it returns a normalised findings list without embedded category-detection logic

**Scenario: overall behaviour is unchanged**
  Given the same inputs as before the refactor
  When `run_snyk(workdir, item_type)` or `run_cisco_mcp_scanner(workdir, item_type)` is called end-to-end
  Then the returned `(findings, checks)` tuple is identical to the pre-refactor baseline

### Before-Checks

- [ ] `uv run radon cc sandbox/scanners.py -s` confirms `run_snyk` CC ≥ 25 and `run_cisco_mcp_scanner` CC ≥ 20 (baseline)
- [ ] Existing tests pass on main: `cd sandbox && uv run pytest -q`
- [ ] Branch created: `git checkout -b slice/40-scanner-complexity-decomposition`

### TDD Execution

**Phase RED — characterisation tests first (before any production change)**

1. Write `sandbox/tests/test_scanners_snyk.py` with golden-output assertions that call
   `run_snyk` through a stubbed `_run`; assert `(findings, checks)` matches a recorded
   fixture. Locks observable behaviour.
2. Run — must pass on main (tests describe current behaviour, not desired refactor).
3. Commit: `test(slice-40): add characterisation tests locking run_snyk observable behaviour`

**Phase GREEN — extract helpers one at a time**

For each extracted function:
1. Write a unit test for the function (RED).
2. Extract the function from the parent and call it in place (GREEN).
3. Run all tests — must stay green after each extraction.
4. Commit per extraction: `refactor(slice-40): extract <function_name> from run_snyk`

Suggested extraction order for `run_snyk` (lowest coupling first):
1. `_snyk_parse_root(out, err)` → JSON parse attempt on stdout then stderr
2. `_snyk_map_finding(issue)` → single-issue → Tripwire finding dict
3. `_snyk_collect_path_findings(path_result)` → per-path findings + errors
4. `_snyk_resolve_outcome(findings, checks, paths_seen, errors, out, err, console)` → final tuple

Suggested extraction order for `run_cisco_mcp_scanner` (after `run_snyk` is clean):
1. `_mcp_map_findings(result)` → normalised findings list from MCP envelope
2. Any additional isolated concern identified during the refactor

**Phase REFACTOR — simplify orchestrators**

After all extractions: each orchestrator should read as a linear sequence of named
calls (~20 lines). Run `uv run radon cc sandbox/scanners.py -s` — confirm rank C or better.

### After-Checks

- [ ] `uv run radon cc sandbox/scanners.py -s` shows `run_snyk` rated C or better (CC ≤ 15)
- [ ] `uv run radon cc sandbox/scanners.py -s` shows `run_cisco_mcp_scanner` rated C or better (CC ≤ 15)
- [ ] `uv run xenon --max-absolute D --max-modules B --max-average A sandbox/` passes
- [ ] All existing tests pass: `cd sandbox && uv run pytest -q`
- [ ] Characterisation tests pass (golden snapshot unchanged)
- [ ] Each extracted function has ≥1 unit test
- [ ] Specification coverage: every GWT clause has ≥1 test
- [ ] `./scripts/quality-gates.sh` passes all tiers

### Gate Status

📋 PLANNED
