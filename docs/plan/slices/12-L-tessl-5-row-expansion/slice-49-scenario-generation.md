# Slice 49 — Tessl: Scenario Generation Adapter + Resume Checkpoint (Row 3)

**Wave**: 12-L
**MoSCoW**: Should
**Depends on**: 47, 48
**Status**: 📋 PLANNED
**Read time**: ~6 min

## Context

Implements the Scenario Generation capability for **plugin-path** generation (Tripwire scans local plugin directories, not repo commits):

```
tessl scenario generate <plugin-path> [--count N]
  → (CLI polls server-side until completed or failed)
  → tessl scenario view <gen_id> --json          # capture tessl_run_id + scenario count
  → tessl scenario download <gen_id> -o <plugin>/evals
```

Tessl docs ([evaluate-skill-quality-using-scenarios](https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios), [cli-commands § scenario](https://docs.tessl.io/reference/cli-commands)):

- `scenario generate` runs **server-side**; the CLI **polls until complete** by default. Ctrl-C detaches without cancelling — progress via `tessl scenario list --status …`.
- `--workspace` is **repo-only** (with `--commits` / `--prs`); do **not** pass it for plugin-path generation.
- `scenario download` accepts an explicit generation ID (`tessl scenario download <id>`) or `--last`. If the generation is still `pending` / `in_progress`, download **reports status and exits** — it does not wait. Eval must not start until download succeeds.
- Scenarios must land in `<plugin>/evals/` because `tessl eval run ./my-plugin` reads from there (see slice 50).
- Standalone skills require a plugin manifest first (`tessl skill import`); lint (slice 46) already enforces `.tessl-plugin/plugin.json`.

The manual move step in v0 stubs exists because download defaults to `evals/` relative to **cwd**; the adapter either runs download with `-o <plugin>/evals` from a known cwd, or downloads to a temp dir and moves. The `resume_checkpoint` jsonb column covers interruption between generate-complete and files-in-evals.

Design reference: `docs/design/tessl-5-row-expansion.md § (a) resume_checkpoint, § (b) Scenario Generation resume path, § (c) 7(b), § ID carry-forward contract`

**Coverage Gap status (2026-08-24, Tessl CLI + docs)**:

- **Gap A (run ID at trigger time)**: `scenario generate` blocks until done; capture `tessl_run_id` from `scenario view <id> --json` (or `generate --json` output if present). No need to guess from stdout alone.
- **Gap B (`scenario view <id>`)**: **Resolved** — explicit ID form documented and supported. Prefer explicit ID over `--last` for lineage correctness.

## Acceptance Criteria (GWT)

### Scenario 1 — Successful generation, download, and row update

**Given** Quality Review has completed and `tessl_run_id` is populated
**And** the scan target is a Tessl plugin directory (`.tessl-plugin/plugin.json` present)
**When** Scenario Generation runs
**Then** `tessl scenario generate <plugin-path> --count 3` is invoked (CLI polls until `completed` or `failed`)
**And** on success the adapter captures `gen_id` from `scenario view --json` (prefer the ID returned by generate/view JSON; use `--last --mine` only when no checkpoint exists)
**And** `tessl scenario download <gen_id> -o <plugin>/evals` is invoked (only after generation is `completed`)
**And** `tessl_run_id = gen_id` and `tessl_run_id_at` are written on the Scenario Generation row
**And** `resume_checkpoint` transitions through `{"stage": "generated", "gen_id": "<id>"}` → `{"stage": "moved"}` as each step completes
**And** final row status is `completed`, `checks_run` reflects downloaded scenario count, and `resume_checkpoint` is cleared to `null`

### Scenario 2 — Interrupted after generate, before evals/ is populated

**Given** the runner is interrupted after `generate` succeeds but before scenarios are in `<plugin>/evals/`
**When** the runner resumes
**Then** `resume_checkpoint.stage == "generated"` and `resume_checkpoint.gen_id` are detected
**And** the generate step is skipped; only `tessl scenario download <gen_id> -o <plugin>/evals` (or the move from temp) is retried

### Scenario 2b — Modal timeout during server-side generate (detach/resume)

**Given** `tessl scenario generate` was detached (Modal timeout or Ctrl-C equivalent) while server status is still `in_progress`
**When** the runner resumes
**Then** the adapter polls `tessl scenario view <gen_id> --json` (from checkpoint or `--last --mine`) until `completed` or `failed`
**And** does **not** call `scenario download` until status is `completed` (download exits early otherwise)

### Scenario 3 — upstream_run_ids populated from Quality Review (via in-process ctx)

**Given** Quality Review completed in the same `run_tessl()` invocation and `ctx["review_quality"] = "rev_abc123"`
**When** Scenario Generation starts
**Then** `_attach_upstream_run_ids(row, ctx, "review_quality")` writes `upstream_run_ids = {"review_quality": "rev_abc123"}` **before** `scenario generate` is invoked
**And** after generation completes, `_stamp_tessl_run_id(row, gen_id)` and `_update_tessl_id_context(ctx, "scenario_gen", gen_id)` run so slice 50 can read `ctx["scenario_gen"]`

### Scenario 3b — Missing Quality ID still proceeds with null upstream key

**Given** Quality Review did not produce a `tessl_run_id` (e.g. `needs_setup`)
**When** Scenario Generation starts
**Then** `upstream_run_ids = {"review_quality": null}` is written before invocation
**And** scenario generation still attempts if other prerequisites pass (token + plugin manifest)

### Scenario 4 — Scenario generation failure blocks Eval

**Given** `tessl scenario generate` exits non-zero
**When** the runner completes the Scenario Generation step
**Then** Scenario Generation row `status = "failed"`
**And** Eval row `status` remains `"blocked"` (no auto-chain)

### Scenario 5 — Missing TESSL_TOKEN or plugin manifest

**Given** `TESSL_TOKEN` is absent or the scan target lacks `.tessl-plugin/plugin.json`
**When** Scenario Generation would run
**Then** the row has `status = "needs_setup"` (no token) or `status = "failed"` with actionable detail (no plugin manifest; lint row from slice 46 may already surface this)
**And** Eval row remains `"blocked"`

## Files to touch

- `sandbox/scanners.py` — add scenario generation step to `run_tessl()` after Review (Quality); implement `_run_tessl_scenario_gen()` helper; `resume_checkpoint` write/read; `_attach_upstream_run_ids(row, ctx, "review_quality")` before invoke; `_stamp_tessl_run_id` + `_update_tessl_id_context(ctx, "scenario_gen", …)` after success; extend `TESSL_SOURCES` with `"Tessl: Scenario Generation"`
- `sandbox/scan_app.py` — persist `resume_checkpoint` and partial row updates between Modal invocations when generate/download spans timeout budget

## Prerequisites (Tessl docs)

- `TESSL_TOKEN` + Publisher workspace access (same as Review).
- Plugin manifest at scan target (slice 46 lint gate); import via `tessl skill import` when missing.
- Generation ID captured as `tessl_run_id`; use explicit ID for download/view — avoid `--last` except as bootstrap when no checkpoint exists.

## Open Question dependency

Coverage Gap C (agent-assisted scenario generation via `tessl install tessl-labs/tessl-skill-eval-scenarios`) remains **unverified** for headless Modal. v1 uses plain `scenario generate` only; Quality findings are UI context, not CLI-injected.

## Gate evidence fields

`coverage_pct`: target ≥ 80% for new scenario generation code path
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (b) Scenario Generation resume path — mark as implemented
