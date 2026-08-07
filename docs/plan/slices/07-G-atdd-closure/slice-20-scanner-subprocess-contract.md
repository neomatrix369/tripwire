# Slice 20: Scanner Subprocess Adapter Contract

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

The scanner adapters are verified through the real process boundary, so executable discovery, arguments, stdout/stderr capture, and fail-closed mapping cannot be green only because `_run` is mocked.

## GWT acceptance specification

1. **Skill evidence remains usable at the process boundary** `@contract-shape:unbounded-preservation`
   - Given a temporary `skill-scanner` executable on `PATH`, when a skill scan runs, then it receives `scan <workdir> --format json` and its valid JSON produces completed evidence/findings.
2. **MCP evidence remains usable at the process boundary** `@contract-shape:unbounded-preservation`
   - Given a temporary `mcp-scanner` executable on `PATH`, when a local MCP scan runs, then global flags precede the selected mode and its valid envelope produces mapped evidence.
3. **Operator retains a diagnostic when a scanner cannot run** `@contract-shape:unbounded-preservation`
   - Given either executable exits nonzero with stderr, when its adapter runs, then the scanner is unreachable with captured diagnostic output and is never completed.
4. **Operator is not shown a false clean scan** `@contract-shape:unbounded-preservation`
   - Given either temporary executable exits zero with empty, malformed, or schema-incomplete stdout, when its public adapter runs, then it is unreachable or failed with diagnostic output and produces neither a completed row nor a clean no-findings result.

## Design / test treatment

- Create hermetic executable scripts in `tmp_path/bin`, prepend `PATH` with `monkeypatch`, and invoke public adapter functions without patching `_which` or `_run`; the MCP fixture includes the real local `server.py` / `run.sh` invocation shape used by the adapter.
- Continue using recorded payloads; never invoke the network or installed vendor binaries.
- Keep pure mapping tests as fast implementation regressions alongside the subprocess contracts.
- Require external evidence schemas before mapping: Skill output is a JSON object with a `findings` array (a valid empty array is clean); MCP output is a JSON object with a `scan_results` array and the requested-analyzers contract. Empty stdout, scalar JSON, `{}`, missing fields, and wrong field types are unreachable/failed; valid empty results remain completed clean evidence.
- New acceptance tests carry `CONTRACT_SHAPE: unbounded-preservation` and `Outcome anchor: Scanner evidence is trustworthy at its process boundary` in their docstrings.

**Test inventory (≤8 acceptance tests):** valid and valid-empty Skill; malformed Skill table; valid and valid-empty MCP; malformed MCP table; nonzero Skill; nonzero MCP; argument ordering.

## Before-Checks [GATE]

- [ ] Recorded valid/error payloads selected from existing test data
- [ ] Tests run on supported local shell/platform without vendor installation

## TDD execution

RED: add the public-adapter subprocess scenarios, including zero-exit malformed and empty Skill/MCP output.  
GREEN: correct adapter invocation/discovery only where a public contract fails.  
REFACTOR: share a minimal temporary-executable fixture; avoid test-only production switches.

## After-Checks [GATE]

- [ ] At least one Skill and one MCP valid payload traverse `shutil.which` and `subprocess.run`
- [ ] Nonzero stdout/stderr path is unreachable and console evidence is retained
- [ ] Zero-exit empty, malformed, and schema-incomplete stdout are fail-closed and retain a diagnostic
- [ ] No test patches `_which` or `_run` for these scenarios
- [ ] `uv run pytest sandbox/tests -q` and `./scripts/quality-gates.sh` pass
- [ ] Coverage target: governed `sandbox/` remains ≥95%; `guard/` remains excluded
- [ ] Complexity evidence: **enforcing** via `./scripts/quality-gates.sh`, with `.reports/complexity/pr-body.md` reviewer summary
- [ ] nWave acceptance and software-crafter reviewers approve the slice before implementation closes
- [ ] `docs/plan/gate-evidence/slice-20.json` records commands, coverage, complexity, reviewer verdicts, and `PASS`
- [ ] Documentation audit: adapter operation docs reviewed; N/A outcome recorded if unchanged

## Gate Status

📋 PLANNED
