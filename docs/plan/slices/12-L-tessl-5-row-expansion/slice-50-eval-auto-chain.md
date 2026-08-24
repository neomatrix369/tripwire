# Slice 50 — Tessl: Eval Adapter + Scenario→Eval Auto-Chain (Row 4)

**Wave**: 12-L
**MoSCoW**: Should
**Depends on**: 49
**Status**: 📋 PLANNED
**Read time**: ~5 min

## Context

Implements the Eval capability: `tessl eval run <plugin> --runs 3 -y`. Eval **cannot** accept a scenario-generation ID — Tessl reads scenarios from disk (`<plugin>/evals/` or an explicit scenarios path). The adapter must therefore **wait for scenario generation to finish and download scenarios into `evals/`** before invoking eval. There is no “pass scenario ID to eval” path in the CLI.

Tessl docs ([cli-commands § eval run](https://docs.tessl.io/reference/cli-commands)):

- `tessl eval run ./my-plugin` expands to `tessl eval run ./my-plugin/evals --context ./my-plugin`.
- Eval runs are **server-side**; default CLI polls until complete. Ctrl-C detaches; `--json` returns eval run IDs immediately without polling (useful for Modal timeout + resume via `eval view <id> --json`).
- Requires the plugin directory linked to a Tessl project (`tessl.json`; create/repair via `tessl project create` / `tessl project repair` if missing).
- Use `-y` / `--yes` to skip confirmation prompts in headless sandbox.

The critical design constraint is the first-run auto-chain: Eval must auto-transition from `blocked` → `queued` → `running` when Scenario Generation completes successfully **and** `<plugin>/evals/` contains scenarios. If Scenario Generation is re-run after Eval has already completed once, Eval transitions to `stale` (no auto-cascade).

Design reference: `docs/design/tessl-5-row-expansion.md § (b) auto-chain, § (b) Stale non-cascade, § ID carry-forward contract`

**ID carry-forward**: Eval reads `ctx["review_quality"]` and `ctx["scenario_gen"]` at step start (populated by slices 47 and 49 in the same `run_tessl()` invocation). Persist via `_attach_upstream_run_ids(row, ctx, "review_quality", "scenario_gen")` **before** `eval run`. Stamp Eval's own `tessl_run_id` after completion; eval ID is not consumed downstream in v1.

## Acceptance Criteria (GWT)

### Scenario 0 — Eval row emitted blocked before Scenario Generation starts

**Given** the Tessl group runner begins for a skill scan
**When** Lint and Review (Quality) rows are emitted
**Then** an Eval row is inserted with `status = "blocked"` and no `tessl_run_id`
**And** Eval stays blocked while Scenario Generation is `running`, `queued`, or not yet started

### Scenario 1 — First-run auto-chain from Scenario Generation

**Given** Scenario Generation just completed with status `completed`
**And** `<plugin>/evals/` contains at least one scenario subdirectory (post-download)
**And** Eval row has status `blocked`
**When** the auto-chain check runs (same `run_tessl()` invocation, after scenario gen returns)
**Then** Eval row transitions to `queued` then `running` within the same Run Scan execution
**And** `tessl eval run <plugin-path> --runs 3 -y` is invoked (CLI polls until eval completes or fails)
**And** Eval does **not** start if Scenario Generation is still `in_progress` or download has not populated `evals/`

### Scenario 2 — Eval completes; tessl_run_id captured

**Given** `tessl eval run --runs 3 -y` completes (or `eval run --json` + poll via `eval view <id> --json` after detach)
**When** results are persisted
**Then** `tessl_run_id` is populated with the eval run ID
**And** `tessl_run_id_at` is set
**And** `checks_run` reflects the number of evaluated scenarios (from `eval view --json`)
**And** `detail` includes baseline avg, with-context avg, and delta when present
**And** `status = "completed"` (or `failed` / `timed_out` on non-zero exit or timeout — not on score variance)

### Scenario 2b — Modal timeout during server-side eval (detach/resume)

**Given** `tessl eval run` was detached (Modal timeout) while server status is still `pending`
**When** the runner resumes
**Then** the adapter polls `tessl eval view <eval_id> --json` (from `eval run --json` output or checkpoint) until `completed` or `failed`
**And** does not re-submit `eval run` while a prior run is still pending

### Scenario 3 — Scenario Generation re-run marks Eval as Stale

**Given** Eval has `status = "completed"` with a `tessl_run_id`
**When** Scenario Generation is re-run (new `tessl_run_id_at` for Scenario Gen row is newer than Eval's `completed_at`)
**Then** Eval row `status` transitions to `"stale"`
**And** no new Eval run is triggered automatically

### Scenario 4 — upstream_run_ids populated from in-process ctx

**Given** `ctx["review_quality"]` and `ctx["scenario_gen"]` are set from prior steps in the same `run_tessl()` invocation
**When** Eval transitions from `blocked` to `running`
**Then** `_attach_upstream_run_ids(row, ctx, "review_quality", "scenario_gen")` writes `upstream_run_ids = {"review_quality": "<id>", "scenario_gen": "<gen_id>"}` **before** `eval run`
**And** the scenario_gen ID is for lineage/cross-read only — eval invocation uses filesystem `evals/`, not this ID
**And** after eval completes, `_stamp_tessl_run_id(row, eval_id)` persists Eval's own run ID

### Scenario 4b — Partial ctx (scenario gen failed)

**Given** Scenario Generation failed and `ctx["scenario_gen"]` is still null
**When** Eval auto-chain gate runs
**Then** Eval remains `blocked` (no eval invocation)
**And** if Eval had started in a resume path with only Quality ID available, `upstream_run_ids.scenario_gen` is null (not omitted)

### Scenario 5 — Non-deterministic score handling

**Given** `tessl eval run --runs 3` produces a non-deterministic score (LLM-graded agents)
**When** the result is written
**Then** the raw scores, run count, and variant averages are persisted in `detail`
**And** the row is not marked `failed` solely due to score variance (only failed on non-zero exit or `eval view` status `failed`)

### Scenario 6 — Tessl project prerequisite

**Given** the plugin directory has no linked Tessl project (`tessl.json` missing or invalid)
**When** Eval auto-chain attempts to run
**Then** the adapter calls `tessl project create` or `tessl project repair` (with `TESSL_WORKSPACE`) before `eval run`
**Or** Eval row is `needs_setup` / `failed` with an actionable detail if project linking cannot be completed headlessly

## Prerequisites (Tessl docs)

- Scenario Generation row `completed` with scenarios in `<plugin>/evals/` (slice 49).
- `TESSL_TOKEN`, `TESSL_WORKSPACE`, Publisher workspace access.
- Linked Tessl project (`tessl.json`; `tessl project create` / `tessl project repair`).
- Eval reads scenarios from disk only — no scenario-generation ID on the CLI.

## Files to touch

- `sandbox/scanners.py` — add eval step to `run_tessl()` after scenario gen; emit initial `blocked` Eval row; auto-chain gate; Stale transition; `_run_tessl_eval()` helper; `_attach_upstream_run_ids` before eval; `_stamp_tessl_run_id` after eval; `tessl project repair` preflight; extend `TESSL_SOURCES` with `"Tessl: Eval"`
- `sandbox/scan_app.py` — persist intermediate Eval row states (`blocked` → `queued` → `running`) via partial `_on_scanner_done` updates when Modal budget requires split invocations

## Gate evidence fields

`coverage_pct`: target ≥ 80% for new eval + auto-chain code path
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (b) auto-chain and Stale — mark as implemented
