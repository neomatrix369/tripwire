# Architecture

This page is a **map of the parts**. Skip it until you can run the
[demo Quickstart](../QUICKSTART.md#try-the-demo-recommended).

System shape for Tripwire. Diagrams are Mermaid (text, version-controlled).

Start here: [QUICKSTART](../QUICKSTART.md) · Hub: [docs/README](./README.md) · Status: [STATUS.md](./STATUS.md)

[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Superlinked SIE](https://img.shields.io/badge/Superlinked%20SIE-0B1F3A?style=flat)](https://superlinked.com)
[![Alibaba Cloud Model Studio](https://img.shields.io/badge/Alibaba%20Cloud%20Model%20Studio-FF6A00?style=flat)](https://www.alibabacloud.com/product/modelstudio)

---

## 1. Context (C4 L1)

Who uses Tripwire, and what it talks to (no container tech detail).

```mermaid
C4Context
  title Tripwire — Context

  Person(user, "Tripwire user", "Installs, runs scans, and reviews findings")
  System(tripwire, "Tripwire", "Discovers skills/MCP targets, runs scanners, stores results")
  System_Ext(scanners, "Upstream scanners", "Skill/MCP/SCA analysis tools")
  System_Ext(cloudDb, "Hosted database", "Stores scan runs and findings")
  System_Ext(compute, "Serverless compute", "Isolated scanner execution")
  System_Ext(sie, "SIE / Model Studio", "Optional post-scan triage and escalation")

  Rel(user, tripwire, "1. Invokes scan / setup / route")
  Rel(tripwire, compute, "2. Spawns scan jobs")
  Rel(compute, scanners, "3. Runs scanner CLIs")
  Rel(tripwire, cloudDb, "4. Reads/writes scan data")
  Rel(compute, cloudDb, "5. Writes findings")
  Rel(tripwire, sie, "6. Optional tiered route")
```

---

## 2. Containers (C4 L2)

Deployable / runnable units inside the system boundary.

```mermaid
C4Container
  title Tripwire — Containers

  Person(user, "Tripwire user")

  System_Boundary(tw, "Tripwire") {
    Container(cli, "CLI", "Node.js", "Discovery, hashing, idempotency, Modal spawn, tiered route")
    Container(sandbox, "Sandbox app", "Python / Modal", "Acquire target, run adapters")
    ContainerDb(db, "Database", "Postgres / Supabase", "schema.sql, Realtime")
    Container(dash, "Dashboard", "HTML / JS", "Live/Mock UI; pathway strips; Escalated / SIE-only filters")
  }

  System_Ext(scanners, "Upstream scanners")
  System_Ext(sie, "SIE / Model Studio")

  Rel(user, cli, "1. tripwire scan / setup / route")
  Rel(user, dash, "2. Views Live, dry-discover, or demo results")
  Rel(cli, db, "3. Bootstrap + scan_run rows")
  Rel(cli, sandbox, "4. Spawn scan")
  Rel(sandbox, scanners, "5. Shell out")
  Rel(sandbox, db, "6. Findings / console")
  Rel(cli, sie, "7. Optional post-scan route")
  Rel(cli, db, "8. tiered_router findings")
  Rel(dash, db, "9. Realtime or poll")
```

### Repo layout (where containers live)

- `cli/` — `tripwire` Node CLI (`scan`, `setup`, `route`)
- `sandbox/` — Modal app + scanner adapters (`scanners.py`); unit tests in `sandbox/tests/`
- `db/schema.sql` — Postgres/Supabase DDL + rollup; anon SELECT + Realtime
- `prototypes/dc-dashboard/` — Live/Mock dashboard (Horizon A ship UI; prototype path). Shows router pathway strips (`Scan → ■` / `Scan → SIE → ■` / `Scan → SIE → Model Studio`) and Escalated / SIE-only filters — [reading-router-results.md](./user-guide/reading-router-results.md)
- `prototypes/sie-studio/` / `prototypes/model-studio/` — sample CLIs for router backends
- `scripts/` — setup (Supabase/Modal), `serve-dashboard.mjs`, hygiene gates, router fixtures
- `fixtures/` — smoke targets — [fixtures/README.md](../fixtures/README.md)
- `docs/research/adapters/scanner-output-adapters.md` — keep in sync with `sandbox/scanners.py`

### Future (not current Horizon A containers)

- `guard/` — PreToolUse-style Agent Guard hook. **Horizon A:** Won't / not a
  shipped production entry ([ADR-0015](./adr/0015-horizon-a-excludes-guard-and-drift.md)).
  **Wave H (Frontline, DECIDED plan-only):** slices 23–39 intend Claude Code
  hooks + `tripwire setup-agent-hooks` + `/tw-*` skills —
  [plan/TRAIL.md](./plan/TRAIL.md) Wave H. Code stub may exist; it is **not** a
  shipped production entry point yet. See [STATUS.md](./STATUS.md).

---

## 3. Key Flows

### Dry-discover (no Modal)

```mermaid
sequenceDiagram
  autonumber
  participant Op as Operator
  participant CLI as tripwire CLI

  Op->>CLI: tripwire scan --dry-discover path
  CLI-->>Op: Print discovered targets
  Note over CLI: Exits without spawning sandbox
```

### Full scan (Supabase + Modal + dashboard)

```mermaid
sequenceDiagram
  autonumber
  participant Op as Operator
  participant CLI as tripwire CLI
  participant SB as Modal sandbox
  participant DB as Supabase
  participant Route as SIE / Model Studio
  participant Dash as Dashboard

  Op->>CLI: tripwire scan path
  CLI->>DB: Ensure schema / create scan_run
  CLI->>SB: Spawn scanners
  SB->>DB: Findings / console_output
  CLI->>Route: Auto-route batch (optional; warn+skip if keys missing)
  Route-->>CLI: Triage / escalation
  CLI->>DB: tiered_router findings
  Dash->>DB: Realtime or poll
  Dash-->>Op: Live results UI
```

Manual re-route: `tripwire route --batch-id …` ([setup-commands.md](./user-guide/setup-commands.md#tiered-router-optional)).

### Tiered routing

Multi-scanner batches can disagree on severity, leave unusual scanner statuses
(timeout / unreachable), or produce low-confidence finding text. Operators need a
post-scan signal separate from raw scanner rows.

1. **SIE** (cheap / every item) decides whether to escalate using pre-computed
   `conflicting` + `unusual_status` plus its own `low_confidence` judgment.
2. **Model Studio** (stronger / escalate only) runs either **arbitration**
   (findings present) or **triage** (empty findings + coverage gap).
3. Persist one `tiered_router` finding per item (`routing_review` /
   `routing_decision` / `routing_triage`). Replace that item's prior router row
   only after a successful SIE decision — never batch-delete first.
4. Dashboard surfaces pathway strips and Escalated / SIE-only filters
   ([reading-router-results.md](./user-guide/reading-router-results.md)).

Missing SIE credentials → warn and skip (scan unaffected). See
[ADR-0016](./adr/0016-tiered-router-sie-model-studio.md).

### Quality attributes — severity rollup

`tripwire_rollup_item` aggregates **scanner** findings only. Rows with
`scanner_source = 'tiered_router'` are excluded so triage does not inflate
red/amber counts or `risk_score`. Card `heatmap_status` is worst-of actionable
scanner severities; finding-count chips are density, not colour
([ADR-0004](./adr/0004-supabase-system-of-record.md),
[ADR-0016](./adr/0016-tiered-router-sie-model-studio.md)).

`risk_score` (sort/trend only) =

`(3 × red_findings + 1 × amber_findings) / Σ checks_run` on completed scanners
for the latest run. Range ≥ 0 and unbounded; `null` when unscored. Dashboard
card colour must not be inferred from this number alone.

`quality_score` is the Tessl skill-review axis (0–100, higher better), written
by `run_tessl` / `_tessl_quality_score` and mapped into Live as `item.quality`.
It is orthogonal to findings and to `risk_score`. Dashboard skill cards surface
compact `Q N` / `Q —` / `Q ?` badges with a fixed `#score-tip-portal` (not delayed
native `title=`, not in-card absolute bubbles that clip under `overflow-y: auto`);
risk uses compact `R N.NN` badges (list header **Risk density**) with the same
portal tip pattern — slice 42 A9–A13 IMPLEMENTED on branch, nw-review APPROVED
(see [STATUS.md](./STATUS.md)). Operator chrome uses plain labels
(`Tessl quality`, locus/avail glossary) rather than schema snake_case.

---

## 4. Component Detail (C4 L3)

Omitted — container internals are readable from `cli/`, `sandbox/`, and
`prototypes/dc-dashboard/`. Add L3 only when a container becomes hard to navigate
from the code.

---

## 5. Decisions

- Formal ADRs: [adr/README.md](./adr/README.md)
- Planning decisions (slice waivers, priority): [plan/DECISIONS.md](./plan/DECISIONS.md)
- Slice progress: [plan/PROGRESS.md](./plan/PROGRESS.md)
