# Reading tiered router results

> How to interpret pathway strips, Escalated / SIE-only filters, and
> `tiered_router` finding categories after optional post-scan routing
> ([ADR-0016](../adr/0016-tiered-router-sie-model-studio.md)).

Setup first: [sie-setup.md](./sie-setup.md) · [model-studio-setup.md](./model-studio-setup.md) ·
[setup-commands.md § Tiered router](./setup-commands.md#tiered-router-optional).

## What you are looking at

After a batch is routed, each processed item has one finding with
`scanner_source = tiered_router`. That row is **informational triage**, not a
fourth scanner engine: it does not inflate heatmap risk scores (rollup excludes
`tiered_router`). Card colour still comes from scanner findings — **worst
actionable severity** (any red → red; amber-only → amber; else green when
scanners completed cleanly). A finding-count chip is density, not colour.

## Pathway strips (always visible on the card)

| Strip | Meaning |
|---|---|
| `Scan → ■` | SIE was never called for this item (keys missing / soft-skip). Prior strip preserved when re-route skips. |
| `Scan → SIE → ■` | SIE reviewed the item and **did not** escalate to Model Studio |
| `Scan → SIE → Model Studio` | SIE escalated; Model Studio ran arbitration or triage |

Open the finding tooltip for model IDs (`SIE=…` · `MS=…` or `—`), signal flags,
and the claim label below.

## Filter chips

| Chip | Matches | Use when |
|---|---|---|
| **Escalated** | `routing_decision` or `routing_triage` | Model Studio actually ran |
| **SIE-only** | `routing_review` | SIE ran; Model Studio did **not** |

Severity chips (red / amber / green) still filter by heatmap severity. Escalated
and SIE-only are independent of colour.

## Categories and severity meaning

Same `severity` column, different meaning by `category`:

| Category | Claim label in UI | `severity` means |
|---|---|---|
| `routing_review` | **SIE only — not escalated** (and/or **No Model Studio call**) | Vulnerability-style rollup severity for the item (or soft-fail / skip note) |
| `routing_decision` | **Arbitration:** | Arbitrated vulnerability severity when scanners disagreed or confidence was low |
| `routing_triage` | **Triage urgency:** | Coverage-gap **urgency** (re-scan priority) — not a vuln verdict |

## Soft-fail behaviour

- **Missing SIE keys** → scan still succeeds; auto-route / `tripwire route` warns
  and skips. No new router rows for those items.
- **SIE keys present, Model Studio keys missing** → SIE can still write
  `routing_review` rows; escalation paths that need Model Studio soft-fail into a
  review row with a failure note when appropriate.
- **SIE outage on re-run** → replace-on-success only: prior strips are not
  batch-deleted before the run.

## Preview without a Live route

1. Mock dashboard already includes `tiered_router` fixtures — open
   [http://127.0.0.1:8765/Tripwire.dc.html](http://127.0.0.1:8765/Tripwire.dc.html)
   with `node scripts/serve-dashboard.mjs` and toggle **Escalated** / **SIE-only**.
2. Gallery shots: [screenshots README](../screenshots/README.md) (router section).
3. Live conflict / timeout fixtures (needs Supabase `.env`):

```bash
node scripts/seed-router-fixtures.js
```

Prerequisites: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (same as Live scans).
The script upserts fixture items (`Conflict Test Skill`, timeout-style coverage
gaps), scanner rows, and findings so you can exercise Live UI without waiting for
a real multi-scanner disagreement. Re-open the dashboard in **Live** mode after
seeding.

## Manual re-route

```bash
tripwire route --batch-id <batch_id>
# tripwire route --batch-id <batch_id> --sie-model gen-4b --model-studio-model qwen3.8-max
```

See [setup-commands.md](./setup-commands.md#tiered-router-optional) for the key
matrix and flags.

## Related

- Design rationale: [ADR-0016](../adr/0016-tiered-router-sie-model-studio.md)
- Architecture flow: [ARCHITECTURE.md](../ARCHITECTURE.md#tiered-routing)
- Sample CLIs (iterate without a full scan): [prototypes/sie-studio](../../prototypes/sie-studio/README.md),
  [prototypes/model-studio](../../prototypes/model-studio/README.md)
