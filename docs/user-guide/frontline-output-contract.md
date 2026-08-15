# Frontline dual output contract

> Evidence state: **VERIFIED** against code + `internal-docs/04_frontline/main_prompt.md` (2026-08-15, slice 26).
> SSOT for `/tw-verify`, `/tw-scan`, and `/tw-self-check` human + machine output (slices 27–30).

Source prompt: [`internal-docs/04_frontline/main_prompt.md`](../../internal-docs/04_frontline/main_prompt.md) § OUTPUT FORMAT.

## Audiences

Every `/tw-*` status response must support two audiences with the **same** per-artifact facts:

1. **Human** — Markdown table (one row per artifact)
2. **Machine** — JSON object with an `artifacts` array

## Human Markdown table

Fixed columns (order matters):

| Name | Type | Status | Note |
|------|------|--------|------|
| `example-skill` | skill | 🟢 GREEN (fresh) | — |

| Column | Meaning |
|--------|---------|
| **Name** | Resolved artifact name (or the unresolved query for `not-found`) |
| **Type** | `skill` / `mcp` / `tool` / `—` when unknown |
| **Status** | Display string for the six UI states (below) |
| **Note** | Operator hint; RED must include the block warning |

## Six UI states

| State | Display | When |
|-------|---------|------|
| `fresh` | 🟢 GREEN / 🟠 AMBER / 🔴 RED (with RAG label) | Scan result within N-day validity window |
| `stale` | ⚠️ STALE | Scan exists but older than N days (`scan_validity_days`, default 14) |
| `unscanned` | 🚫 UNSCANNED | No usable scan record (grey / missing / fail-closed error) |
| `scanning` | ⏳ SCANNING | Scan submitted, not yet complete |
| `not-found` | ❓ NOT FOUND | Name resolution returned no match |
| `red` | 🔴 RED + bold block warning | Supabase `heatmap_status` = `red` (always include block note) |

RED always carries: **"Will be blocked when Tripwire is enabled"** — never silently omit this.

### `heatmap_status` → UI mapping

Supabase `items.heatmap_status` values observed in `guard/guard_hook.py`:
`green`, `amber`, `red`, `grey`, `error`.

| Source | Maps to UI | Notes |
|--------|------------|-------|
| `heatmap_status=green` + within N days | `fresh` with RAG `green` | Below default red threshold → approve |
| `heatmap_status=amber` + within N days | `fresh` with RAG `amber` | Blocked only when threshold is `red_and_amber` |
| `heatmap_status=red` + within N days | `fresh` with RAG `red` **and** state callout `red` | Always `will_be_blocked: true` when enforcement enabled |
| `heatmap_status=grey` or missing item | `unscanned` | Guard fails closed (`never scanned`) |
| `heatmap_status=error` | `unscanned` (fail-closed) | Treated like unscanned for enforcement |
| Scan older than N days (any RAG) | `stale` | Derived from `scanned_at` / latest completed run — **not** a heatmap enum |
| `scan_runs.status=running` (or equivalent in-flight) | `scanning` | Derived from run/batch lifecycle — **not** a heatmap enum |
| Name resolution miss | `not-found` | Skill/MCP resolution — **not** from Supabase |

`stale`, `scanning`, and `not-found` are **resolution / lifecycle** states. They are not values of `heatmap_status`.

## Machine JSON shape

```json
{
  "artifacts": [
    {
      "name": "vuln-runtime-download",
      "resolved_path": "/path/to/skill",
      "type": "skill",
      "state": "fresh",
      "rag": "red",
      "scanned_at": "2026-08-01T10:00:00Z",
      "stale": false,
      "will_be_blocked": true,
      "note": "rated red — at/above threshold"
    }
  ]
}
```

Required per-artifact fields:

| Field | Type | Meaning |
|-------|------|---------|
| `name` | string | Display / query name |
| `resolved_path` | string \| null | Filesystem or URL path when resolved |
| `type` | string \| null | `skill` / `mcp` / `tool` |
| `state` | string | One of the six UI states |
| `rag` | string \| null | `green` / `amber` / `red` when known; null for unscanned/not-found/scanning |
| `scanned_at` | string \| null | ISO-8601 last completed scan time |
| `stale` | boolean | `true` when past N-day window |
| `will_be_blocked` | boolean | `true` when enforcement would block this artifact |
| `note` | string | Human-facing note (must include block warning when RED) |

## Observed `tripwire scan` JSON (introspection)

Production path: `cli/src/orchestrator.js` → `runScan` prints one JSON object to stdout.

**Observed shape (dispatch confirmation — not the dual-output artifact row):**

```json
{
  "batch_id": "<uuid>",
  "scan_run_ids": ["<uuid>", "..."],
  "failed_targets": [
    { "target": "<path-or-url>", "error": "<message>" }
  ]
}
```

| Field | Observed | Role for `/tw-*` |
|-------|----------|------------------|
| `batch_id` | yes | Submit confirmation / follow-up routing |
| `scan_run_ids` | yes | Per-target run IDs when dispatch succeeded |
| `failed_targets[]` | yes | `{ target, error }` for dispatch failures |

`--dry-discover` prints the discovered **targets list** (not the `runScan` result) and exits without spawning sandboxes.

There is **no** synchronous status-lookup CLI. Per-artifact RAG / staleness for `/tw-verify` comes from Supabase (`items.heatmap_status` + scan timestamps), same pattern as `guard/guard_hook.py`.

### BACKLOG — scan → dual-output map

| Dual-output field | From `tripwire scan` today? | Source for skills 28–30 |
|-------------------|-----------------------------|-------------------------|
| `name` / `type` / `resolved_path` | partial (discover targets only) | Name resolution + discover |
| `state` / `rag` / `stale` / `scanned_at` | **no** | Supabase `items` + scan_runs |
| `will_be_blocked` / `note` | **no** | Guard threshold + enable flag |
| `batch_id` / `scan_run_ids` | **yes** | Echo in `/tw-scan` confirmation (skill 29) |

Do not invent scan-stdout fields that are not listed above. Skills compose dual-output rows from Supabase + resolution; they use `batch_id` / `scan_run_ids` only as submit receipts.

## Links

- Skills that consume this contract: slices [27](../plan/slices/08-H-frontline-agent-hooks/slice-27-tw-enable-disable.md)–[30](../plan/slices/08-H-frontline-agent-hooks/slice-30-tw-self-check.md)
  (`/tw-enable` / `/tw-disable` are config toggles only — they do not emit this table;
  `/tw-verify` implements the table via `guard.verify.verify_artifacts`, slice 28)
- Operator setup / hooks: [setup-commands.md](setup-commands.md)
- Gate evidence: [`docs/plan/gate-evidence/slice-26.json`](../plan/gate-evidence/slice-26.json) ·
  [`slice-27.json`](../plan/gate-evidence/slice-27.json) ·
  [`slice-28.json`](../plan/gate-evidence/slice-28.json)
