# Design: Tessl 5-Row Expansion

**Status**: Schema IMPLEMENTED (slice 45 ✅). Lint adapter IMPLEMENTED (slice 46 ✅ #105). Review Quality run-ID capture IMPLEMENTED unit (slice 47 🔨). Rows 3–5 remain DECIDED / not implemented.
**Date**: 2026-08-24
**Scope**: Design contract for replacing the single Tessl scanner row with 5 flat capability rows. Current-truth notes below mark what has shipped; remaining rows stay future-state.

---

## Verified Coverage Gaps

The task prompt lists 6 Coverage Gaps to "flag, do not infer." Each is resolved below against the actual repo (file:line) or explicitly marked Still Open.

| # | Coverage Gap | Status | Evidence |
|---|---|---|---|
| 1 | Does Tripwire invoke `tessl skill lint` today? | **IMPLEMENTED (slice 46) + VERIFIED live persist.** `run_tessl()` calls `npx --yes tessl@latest skill lint <workdir>` first, then Review. Live CLI 2026-08-24: `tessl skill lint [<source>]` validates a **publishable plugin package** (not skill-folder quality). Fixture `fixtures/skills/safe-changelog-writer` exits 1: "Found SKILL.md but no plugin manifest" — adapter maps non-zero to `failed`. Plugin-package success: `✔ Plugin <name>@<ver> is valid` (exit 0); parser maps that to `checks_run=1`. Live scan_run `a36cad9f` persisted Lint `failed` + Review `completed`. | `sandbox/scanners.py` (`run_tessl`, `_parse_tessl_lint_detail`); live `npx tessl@latest skill lint`; scan_run `a36cad9f` |
| 2 | Is `TESSL_TOKEN` available inside the Modal sandbox? | **Verified — Yes.** It is injected via the `tripwire-scan-secrets` Modal secret alongside `SNYK_TOKEN`, `SKILL_SCANNER_LLM_API_KEY`, and others. | `sandbox/scan_app.py:151–157` |
| 3 | Can the current orchestration dispatch multiple distinct Tessl subcommands within one scan_run? | **Verified — Yes, no orchestration changes needed.** `run_all_scanners()` iterates whatever row-list the group runner returns. The Cisco Skill Scanner (3 rows) and Cisco MCP Scanner (4 rows) already prove this pattern. Slice 46 uses this for Lint + Review. | `sandbox/scanners.py` `TESSL_SOURCES` / `SCANNER_GROUPS` |
| 4 | Does `scan_run_scanners` already support multiple rows per scan_run for the same logical scanner? | **Verified — Yes.** `scanner_source` is a plain `text` column with no uniqueness constraint. Rows are matched for update by `(scan_run_id, scanner_source)` pair. Cisco writes 3 distinct rows per scan_run today. | `db/schema.sql`, `sandbox/scan_app.py` |
| 5 | Is there a per-feature Tessl run-ID column today? | **IMPLEMENTED (slice 45).** `tessl_run_id`, `tessl_run_id_at`, `resume_checkpoint`, `upstream_run_ids` exist. Lint sets no run ID (local/sync). Review Quality capture **IMPLEMENTED (unit, slice 47)** via `tessl review view --last --json` after `tessl review run quality`. | `db/schema.sql`; `sandbox/scanners.py` `_capture_review_run_id` |
| 6 | Does the dashboard UI need a new component for 5 Tessl rows? | **Verified — No.** The `<sc-for list="{{ selectedView.scannersView }}">` loop renders N rows independently. `tesslInnerQuality` is scoped to `scanner_source === "Tessl: Review (Quality)"` (slice 46). Live maps `quality_score` onto that source only. Rows 3–5 placeholders remain slice 48. | `tripwire-status.js` `tesslInnerQuality`; `tripwire-live.js` `shapeScannerRow` |

**Still Open** (not resolvable by reading the repo — require CLI experimentation or Tessl docs):

| # | Gap | Why it matters |
|---|---|---|
| A | Does `tessl review run` / `tessl scenario generate` print a run ID to stdout at trigger time, or only discoverable afterward via `view --last`? | **Partially resolved (2026-08-24).** `scenario generate` blocks and polls until complete; capture ID via `scenario view --json` after completion (or `generate --json` if emitted). `eval run --json` returns eval run IDs immediately without polling. Review Quality (slice 47) captures via `review view --last --json` after `review run quality` completes, falling back to run JSON `id`/`runId`/`run_id`. |
| B | Is `tessl scenario view <id>` (explicit ID form, not `--last`) actually supported? | **Resolved (2026-08-24).** CLI help + [cli-commands § scenario view/download](https://docs.tessl.io/reference/cli-commands) document explicit IDs. Adapter should capture `gen_id` after generate and use `scenario download <gen_id>` — not `--last`. |
| C | Is the agent-assisted scenario generation path (`tessl install tessl-labs/tessl-skill-eval-scenarios`) usable from Tripwire's headless Modal sandbox orchestration? | This is the only documented channel for threading Quality review findings into scenario generation (rule 7b). If it requires an interactive agent prompt, it cannot be scripted. |

---

## (a) Per-Feature State Schema

### Baseline

The existing `scan_run_scanners` table (at `db/schema.sql:47–70`):

```sql
create table if not exists scan_run_scanners (
  id             uuid primary key default gen_random_uuid(),
  scan_run_id    uuid not null references scan_runs(id),
  scanner_source text not null,
  status         text not null check (status in (
    'running','completed','failed',
    'skipped_missing_credential','unreachable','not_applicable'
  )),
  checks_run     integer,
  detail         text,
  console_output text,
  started_at     timestamptz,
  completed_at   timestamptz
);
```

### Status Enum Extension

Replace the 6-state check constraint with the 12-state enum from the design rules. `not_available_yet` is a **UI-only sentinel** — it is never stored in the table (see "Not Available Yet" in section (d) for how the dashboard derives it).

```sql
ALTER TABLE scan_run_scanners
  DROP CONSTRAINT scan_run_scanners_status_check,
  ADD CONSTRAINT scan_run_scanners_status_check CHECK (status IN (
    'not_started',
    'needs_setup',
    'blocked',
    'queued',
    'running',
    'retrying',
    'interrupted',
    'completed',
    'stale',
    'failed',
    'timed_out'
  ));
```

State meanings (full enum — used consistently across all 5 Tessl rows):

| State | Category | Meaning |
|---|---|---|
| `not_started` | Pre-run | Implemented; never triggered for this item |
| `needs_setup` | Pre-run | Missing config/auth (e.g. `TESSL_TOKEN` absent) |
| `blocked` | Pre-run | Applies to Eval only, before its first successful run |
| `queued` | In-flight | Triggered; waiting on sandbox or Tessl server |
| `running` | In-flight | Actively executing |
| `retrying` | In-flight | Re-attempt after a prior failure (invocation mechanism parked — see Open Questions) |
| `interrupted` | Paused | Stopped mid-way with partial state captured in `resume_checkpoint` |
| `completed` | Terminal (success) | Finished successfully; result persisted |
| `stale` | Terminal (success, aging) | Completed result is outdated — cache aging, or an upstream dependency changed since. Never auto-cascades. |
| `failed` | Terminal (error) | Finished with an explicit error |
| `timed_out` | Terminal (error) | Async run exceeded expected duration with no result |

### New Columns

Four columns are added to support per-feature ID lineage, resumability, and upstream cross-reads:

```sql
ALTER TABLE scan_run_scanners
  ADD COLUMN IF NOT EXISTS tessl_run_id       text,
  ADD COLUMN IF NOT EXISTS tessl_run_id_at    timestamptz,
  ADD COLUMN IF NOT EXISTS resume_checkpoint  jsonb,
  ADD COLUMN IF NOT EXISTS upstream_run_ids   jsonb;
```

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `tessl_run_id` | `text` | YES | The Tessl-side run ID for the last completed or in-flight invocation of this feature. `NULL` until first run produces one. Used for cache-hit check and cross-feature ID lineage reads via `tessl <cmd> view <id> --json`. |
| `tessl_run_id_at` | `timestamptz` | YES | Timestamp when `tessl_run_id` was last written. Used to detect staleness (e.g. older than cache TTL). |
| `resume_checkpoint` | `jsonb` | YES | Minimal state blob for interrupted-run resumability. `NULL` when not interrupted. Structure is feature-specific — see section (b) for per-feature shapes. |
| `upstream_run_ids` | `jsonb` | YES | Map of Tessl run IDs from sibling features read at this feature's start. Populated by the adapter for traceability and cross-feature lineage reads. Example: `{"review_quality": "rev_abc123", "scenario_gen": "gen_abc123"}`. `NULL` until populated. |

### Per-Feature `scanner_source` Strings

These exact strings are the row discriminators. Dashboard and adapter must use them verbatim:

| Row | `scanner_source` value |
|---|---|
| 1 | `"Tessl: Lint"` |
| 2 | `"Tessl: Review (Quality)"` |
| 3 | `"Tessl: Scenario Generation"` |
| 4 | `"Tessl: Eval"` |
| 5 | `"Tessl: Review (Security)"` |

### Shared Review Mechanic (Rule 12)

Quality Review and Security Review both use `tessl review run` variants, differing only by judge type. They share a single parameterised adapter function, but write to separate `scan_run_scanners` rows with their distinct `scanner_source`. Each holds its own `tessl_run_id` independently.

Adapter signature (design only — no implementation here):

```
_run_tessl_review(
    judge_type: Literal["quality", "security"],
    workdir: str,
    workspace: str,
    prior_run_id: str | None,   # for cache-hit check via tessl_run_id
    force: bool = False,        # maps to --force flag
) -> (status, tessl_run_id, checks_run, detail, console_output)
```

The two rows are fully separate in the DB, dashboard, and state machine — they happen to share implementation, not state.

### Representative Row Shapes

```sql
-- Tessl: Lint (synchronous/local; no server-side run ID)
{
  scan_run_id:       <uuid>,
  scanner_source:    "Tessl: Lint",
  status:            "completed",
  checks_run:        12,
  detail:            "12 checks — 0 findings",
  tessl_run_id:      null,
  tessl_run_id_at:   null,
  resume_checkpoint: null,
  upstream_run_ids:  null
}

-- Tessl: Review (Quality) (async; server-side run ID captured after completion)
{
  scanner_source:    "Tessl: Review (Quality)",
  status:            "completed",
  tessl_run_id:      "rev_abc123",
  tessl_run_id_at:   "2026-08-24T10:00:00Z",
  resume_checkpoint: null,
  upstream_run_ids:  null      -- quality review has no upstream dependencies
}

-- Tessl: Scenario Generation (interrupted mid-download; resume_checkpoint populated)
{
  scanner_source:    "Tessl: Scenario Generation",
  status:            "interrupted",
  tessl_run_id:      "gen_abc123",     -- captured via scenario view --json after generate completes
  resume_checkpoint: {"stage": "generated", "gen_id": "gen_abc123", "scenario_tmp_path": "/tmp/scenarios-xyz/"},
  upstream_run_ids:  {"review_quality": "rev_abc123"}
}

-- Tessl: Eval (first run; auto-chained after scenario gen)
{
  scanner_source:    "Tessl: Eval",
  status:            "completed",
  tessl_run_id:      "eval_xyz789",
  upstream_run_ids:  {"review_quality": "rev_abc123", "scenario_gen": "gen_abc123"}
  -- scenario_gen ID is for lineage/cross-read; eval invocation reads <plugin>/evals/ on disk
}

-- Tessl: Review (Security)
{
  scanner_source:    "Tessl: Review (Security)",
  status:            "completed",
  tessl_run_id:      "sec_rev_def456",
  upstream_run_ids:  {"review_quality": "rev_abc123"}
}
```

---

## (b) Resume Logic

### Per-Feature Resume Paths

After an interruption, resume using the minimum state needed. The adapter checks `resume_checkpoint` and `tessl_run_id` (via `tessl <cmd> view <id> --json`) before deciding to re-run.

| Feature | Typical interruption point | Resume action | Uses `resume_checkpoint`? |
|---|---|---|---|
| **Lint** | During subprocess | Re-run `tessl skill lint` from scratch — deterministic, fast, no server-side state | No |
| **Review (Quality)** | CLI polling; server job still running | Call `tessl review view --last --json`; if `status=completed` use cached result and persist `tessl_run_id`; else continue polling | No — Tessl CLI natively supports detach/resume |
| **Scenario Generation** | After `tessl scenario generate`, before or during download to `<plugin>/evals/` | CLI polls on `generate` until `completed`/`failed`. If detached (Modal timeout), resume via `scenario view <gen_id> --json` until complete, then `scenario download <gen_id> -o <plugin>/evals` (download exits if still in progress). Checkpoint stores `gen_id` + stage. | Yes — fragile hand-off between server completion and evals/ on disk |
| **Eval** | During `--runs 3` polling | `eval run` polls by default; or `eval run --json` for immediate ID + `eval view <id> --json` on resume. Requires scenarios in `<plugin>/evals/` first — **no scenario-gen ID parameter**. | No — Tessl CLI detach/resume via eval view |
| **Review (Security)** | CLI polling; server job still running | Same as Review (Quality), parameterised with `judge_type=security` | No |

### `resume_checkpoint` Schema per Feature

Only Scenario Generation requires a checkpoint blob; all other features rely on Tessl CLI's native `view --last` resumability.

```jsonc
// Tessl: Scenario Generation — possible stage values
{
  "stage": "generated",              // server-side generate completed; evals/ not yet populated
  "gen_id": "019c4791-…",            // tessl scenario generation run ID (for view/download)
  "scenario_tmp_path": "/tmp/…"      // optional: where download landed before move into plugin/evals/
}
// or
{
  "stage": "moved"                   // files in <plugin>/evals/; eval not yet triggered
}
```

### Scenario → Eval Auto-Chain (Rule 4 — First Run Only)

```
WHEN scenario_gen.status transitions to 'completed'
  AND <plugin>/evals/ is non-empty          -- scenarios on disk (download succeeded)
  AND eval.status IN ('blocked', 'not_started')   -- first-run guard
THEN eval.status → 'queued' → 'running'    -- auto-transition within same Run Scan
  AND tessl eval run <plugin> --runs 3 -y   -- reads evals/ from disk; no scenario-gen ID
```

- If `scenario_gen` ends `failed` or `timed_out` → `eval` stays `blocked`.
- If `scenario_gen` is **re-run** after `eval` already `completed` → `eval.status` transitions to `stale`. This is **not** an auto-cascade to `queued`: the adapter detects `eval.status == 'completed'` and `scenario_gen.tessl_run_id` changed (or `scenario_gen.tessl_run_id_at` is newer than `eval.completed_at`), then sets `eval.status = 'stale'`. No new eval run fires automatically.

### Scenario Generation → Eval pipeline (Tessl CLI contract, slices 49–50)

Verified against [Tessl CLI reference](https://docs.tessl.io/reference/cli-commands) and [evaluate-skill-quality-using-scenarios](https://docs.tessl.io/improving-your-skills/evaluate-skill-quality-using-scenarios) (2026-08-24):

```
1. run_tessl() emits Eval row status=blocked
2. tessl scenario generate <plugin-path> --count 3     # CLI polls until completed/failed
3. gen_id ← scenario view --json (after generate; store as tessl_run_id)
4. tessl scenario download <gen_id> -o <plugin>/evals  # fails fast if still in_progress
5. scenario_gen row → completed; resume_checkpoint cleared
6. IF evals/ non-empty AND eval.status IN (blocked, not_started):
     tessl project repair (if needed)
     tessl eval run <plugin-path> --runs 3 -y          # reads evals/ from disk
7. eval_id ← eval view --json (or eval run --json on detach)
8. eval row → completed; upstream_run_ids.scenario_gen = gen_id (lineage only)
```

**Not supported by Tessl CLI**: passing `gen_id` to `eval run`. Eval always consumes on-disk scenarios. **`--workspace`** on `scenario generate` is for repo mode (`org/repo --commits …`), not plugin-path generation.

> **⚠ OPEN — Retry Invocation Mechanism**
>
> Whether a `failed`, `timed_out`, or `interrupted` Tessl feature row can be retried independently (a single-row Retry affordance on the dashboard) versus only by re-running the full scan is a **product decision explicitly PARKED** for a future pass (see Open Questions). This section describes the resume logic only. The schema (`resume_checkpoint`, `tessl_run_id`, `upstream_run_ids`) and the state model above are designed so either resolution remains possible without a breaking schema change.

---

## (c) ID Lineage Cross-Reads

Each feature that reads from a prior feature's persisted state does so by:
1. Looking up the prior feature's `tessl_run_id` from its own row's `upstream_run_ids` column (populated at start of the reading feature's run).
2. Calling `tessl <cmd> view <id> --json` to retrieve full detail.

### 7(a) — Review (Security) ← Review (Quality)

**What is read**: Quality Review's `tessl_run_id` (`rev_abc123`), then `tessl review view rev_abc123 --json` to fetch Quality findings in full.

**Purpose**: UI-level traceability — show Quality findings alongside Security findings so a human reviewer can prioritise which Security issues are most critical. This is **not** a CLI-level behavior change on the security scan itself: `tessl review run security` has no documented flag to alter its scan behavior based on prior findings.

**What is persisted**: `upstream_run_ids: { "review_quality": "rev_abc123" }` on the Security row, written at security-review start.

**Caveat**: If Quality Review has not yet completed (or `tessl_run_id` is null), Security Review proceeds without the cross-read. The `upstream_run_ids` field records `null` for `review_quality`, and the UI shows no linked findings.

### 7(b) — Scenario Generation / Eval ← Review (Quality)

**What is read**: Same Quality Review `tessl_run_id` lookup; `tessl review view <id> --json` to retrieve Quality findings.

**Threading findings into scenario generation**: The **plain CLI form** (`tessl scenario generate <plugin-path> [--count N]`) has no context-injection flag. `--workspace` applies to **repo** generation (`org/repo --commits …`), not plugin-path generation. To thread Quality findings into scenario generation, the **agent-assisted path** (`tessl install tessl-labs/tessl-skill-eval-scenarios`) is the only documented channel.

**Caveat — agent-assisted path in headless sandbox**: This path is designed around an interactive agent prompt. Whether it can be scripted from Tripwire's headless Modal sandbox orchestration is **unverified** (Coverage Gap C). Until verified, the plain CLI form is used for scenario generation, and the Quality findings are surfaced in the UI as context for human review of the generated scenarios rather than injected into the CLI call.

**What is persisted**: `upstream_run_ids: { "review_quality": "rev_abc123", "scenario_gen": "gen_abc123" }` on the Eval row. The `scenario_gen` ID enables cross-read via `tessl scenario view gen_abc123 --json` (slice 52); eval execution still uses filesystem `evals/`.

### 7(c) — Extended Cross-Feature Insights (v1 Not Wired)

The following cross-reads would plausibly add value but are **not wired in v1**. They are flagged here for v2 consideration:

| Direction | Potential value | Blocker / note |
|---|---|---|
| Eval ← Scenario Generation (`resume_checkpoint`) | Eval could confirm scenarios are in place by reading `resume_checkpoint.stage == "moved"` from the Scenario Gen row before starting, rather than relying solely on a filesystem check. | Not strictly necessary given the auto-chain gate in section (b). Low priority. |
| Review (Quality) → Lint findings | Lint structural issues (e.g. missing types, naming violations) could help a human reader prioritise which Quality findings to address first. | No CLI mechanism. UI side-by-side display only. Requires UI work. |
| Review (Security) → Snyk findings (deduplication) | Security Review findings (Snyk-powered via Tessl) could be cross-referenced against Tripwire's existing Snyk row findings to surface duplicates. | Requires either shared findings schema or a post-processing step. Flag for v2 dedup logic. |
| Any feature → prior scan_run results | On a re-run, adapters could compare new findings against a prior `scan_run_id`'s findings to detect regressions. | Requires querying `scan_run_scanners` across `scan_run_id` values. Not designed in v1. |

---

## (d) UI Flat Rows

### Row Order, Naming, and Initial State

The single existing `"Tessl"` row is replaced by 5 flat sibling rows, in this exact order, in the Scanner Outputs list. No nesting, no expand/collapse group — the same row component used by Cisco's 3 rows.

| Position | `scanner_source` | Day-1 pill | Notes |
|---|---|---|---|
| 1 | `Tessl: Lint` | live status (`completed` / `failed` / `unreachable`) | **IMPLEMENTED** (slice 46) — new row; auth-free `tessl skill lint` |
| 2 | `Tessl: Review (Quality)` | live status (`completed` / `needs_setup` / …) | **IMPLEMENTED** source string (slice 46); `tessl_run_id` capture **IMPLEMENTED unit** (slice 47) via `review view --last --json` |
| 3 | `Tessl: Scenario Generation` | `Not Available Yet` | UI placeholder only — not yet implemented |
| 4 | `Tessl: Eval` | `Not Available Yet` | UI placeholder only — not yet implemented |
| 5 | `Tessl: Review (Security)` | `Not Available Yet` | UI placeholder only — not yet implemented |

The 5 rows appear as a contiguous block where the single `"Tessl"` row used to be.

### Scanner Outputs Count

The header label (`Scanner Outputs (N)`) updates as follows:

- **Before expansion**: the current count reflects 1 Tessl row among the total.
- **After expansion (day 1)**: all 5 Tessl rows are counted — including the 3 "Not Available Yet" placeholders — so the count increases by 4 (e.g. `(6) → (10)`). This matches the Cisco precedent: Cisco's rows appear regardless of credential availability (they show `skipped_missing_credential`, not absent).

The dashboard derives the count from the **static constant list** of all 5 expected `scanner_source` strings plus actual DB rows for other scanners, not from the DB row count alone (since "Not Available Yet" rows are never inserted).

> **Open**: whether to include "Not Available Yet" rows in the count is a product/UX decision. The recommendation above (include them, consistent with Cisco) is the default, but is flagged in Open Questions for explicit sign-off.

### "Not Available Yet" Rendering Rules (3 Unbuilt Rows)

The dashboard holds a **static ordered list** of all 5 Tessl `scanner_source` values. For each value absent from the DB rows for the current `scan_run_id`, the `scannersView` map emits a sentinel object with `status: 'not_available_yet'`.

Rendering:
- Left accent bar: neutral/muted colour (not the status colours used for active rows).
- Row text: greyed out.
- Pill: `Not Available Yet` in muted style (no action affordance).
- No chevron / expand affordance.
- No `checks_run`, `duration`, or quality-score fields.
- No `onClick` handler — the row is purely informational.

These rows are **never inserted** into `scan_run_scanners` by the runner. The dashboard synthesises them client-side from the static list.

Implementation touch point: extend the `scannersView` map in `Tripwire.dc.html:1672–1698` to merge the static Tessl list with actual DB rows, emitting sentinel objects for the gaps. The existing `<sc-for>` loop renders them without changes; a conditional style branch on `scv.status === 'not_available_yet'` applies the muted styling.

### Pill Style Map

Extends `scannerStatusColor` and `scannerStatusLabel` in the dashboard JS:

| Status value | Display label | Colour role |
|---|---|---|
| `not_available_yet` | Not Available Yet | muted / disabled |
| `not_started` | Not Started | neutral (grey) |
| `needs_setup` | Needs Setup | warning (amber) |
| `blocked` | Blocked | warning (amber) |
| `queued` | Queued | info (blue) |
| `running` | Running | info (blue), pulsing |
| `retrying` | Retrying | info (blue) |
| `interrupted` | Interrupted | warning (amber) |
| `completed` | Completed | success (green) |
| `stale` | Stale | warning (amber) |
| `failed` | Failed | error (red) |
| `timed_out` | Timed Out | error (red) |

### `tesslQuality` Binding Scope Fix

The existing `tesslQuality` logic is implemented in `tesslInnerQuality` (`tripwire-status.js`) and is scoped to `scanner_source === "Tessl: Review (Quality)"`. Live attaches `output.quality_score` only for that source (`tripwire-live.js`). The quality score badge does not appear on Lint (slice 46 VERIFIED(unit)). Scenario Generation, Eval, and Security Review rows remain unbuilt (slice 48+).

---

## Open Questions

### 🚧 PARKED — Retry Invocation Mechanism (Rule 3)

Whether a `failed`, `timed_out`, or `interrupted` Tessl feature row can be **retried independently** (a single-row Retry affordance on the dashboard row) versus only by **re-running the full scan** is a **product decision explicitly deferred** to a future pass. It must not be resolved in this design document.

The schema (`tessl_run_id`, `resume_checkpoint`, `upstream_run_ids`) and the 12-state enum are designed so either resolution is possible without a breaking schema change:
- A single-row retry would transition the row from its terminal/paused state back to `queued`, leaving sibling rows untouched.
- A full-scan retry would reset all non-`completed` rows to `not_started`.

Both paths are compatible with the schema above. The retry control (UI affordance and invocation mechanism) is out of scope here.

### Still-Open Coverage Gaps

| # | Gap | Impact if unresolved |
|---|---|---|
| A | Does `tessl review run` / `tessl scenario generate` print a run ID to stdout at trigger time, or only via `view --last --json`? | **Partially resolved (2026-08-24).** `scenario generate` blocks/polls until complete — capture via `scenario view <id> --json`. `eval run --json` returns IDs immediately without polling. Review Quality (slice 47) captures via `review view --last --json` after `review run quality`, with fallback to run JSON `id`. Prefer explicit IDs over `--last` when the run payload includes one. |
| B | Is `tessl scenario view <id>` (explicit ID form) supported, or only `--last`? | **Resolved (2026-08-24).** Use explicit IDs for scenario view/download and eval/review view. |
| C | Is the agent-assisted scenario generation path usable from Tripwire's headless Modal sandbox? | If not, Quality Review findings cannot be threaded into scenario generation programmatically in v1. The fallback is UI-level display of Quality findings alongside the scenario generation row for human reference. |
| D | Should "Not Available Yet" rows be included in the Scanner Outputs count? | Minor UX decision. Recommendation: include (consistent with Cisco credential-absent rows). Requires explicit product sign-off. |
