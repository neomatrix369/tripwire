# Architecture

System shape for Tripwire. Diagrams are Mermaid (text, version-controlled).

Repo entry: [README.md](../README.md) · Status: [STATUS.md](./STATUS.md)

---

## 1. Context (C4 L1)

Who uses Tripwire, and what it talks to (no container tech detail).

```mermaid
C4Context
  title Tripwire — Context

  Person(operator, "Operator", "Runs scans and reviews findings")
  Person(demo, "Demo viewer", "Views Mock dashboard")
  System(tripwire, "Tripwire", "Discovers skills/MCP targets, runs scanners, stores results")
  System_Ext(scanners, "Upstream scanners", "Skill/MCP/SCA analysis tools")
  System_Ext(cloudDb, "Hosted database", "Stores scan runs and findings")
  System_Ext(compute, "Serverless compute", "Isolated scanner execution")

  Rel(demo, tripwire, "Views dashboard")
  Rel(operator, tripwire, "1. Invokes scan / setup")
  Rel(tripwire, compute, "2. Spawns scan jobs")
  Rel(compute, scanners, "3. Runs scanner CLIs")
  Rel(tripwire, cloudDb, "4. Reads/writes scan data")
  Rel(compute, cloudDb, "5. Writes findings")
```

---

## 2. Containers (C4 L2)

Deployable / runnable units inside the system boundary.

```mermaid
C4Container
  title Tripwire — Containers

  Person(operator, "Operator")

  System_Boundary(tw, "Tripwire") {
    Container(cli, "CLI", "Node.js", "Discovery, hashing, idempotency, Modal spawn")
    Container(sandbox, "Sandbox app", "Python / Modal", "Acquire target, run adapters")
    ContainerDb(db, "Database", "Postgres / Supabase", "schema.sql, Realtime")
    Container(dash, "Dashboard", "HTML / JS", "Live or Mock findings UI")
    Container(guard, "Guard hook", "Hook", "PreToolUse-style (Phase 4)")
  }

  System_Ext(scanners, "Upstream scanners")

  Rel(operator, cli, "1. tripwire scan / setup")
  Rel(operator, dash, "2. Views results")
  Rel(cli, db, "3. Bootstrap + scan_run rows")
  Rel(cli, sandbox, "4. Spawn scan")
  Rel(sandbox, scanners, "5. Shell out")
  Rel(sandbox, db, "6. Findings / console")
  Rel(dash, db, "7. Realtime or poll")
```

### Repo layout (where containers live)

- `cli/` — `tripwire` Node CLI
- `sandbox/` — Modal app + scanner adapters (`scanners.py`)
- `db/schema.sql` — Postgres/Supabase DDL + rollup; anon SELECT + Realtime
- `prototypes/dc-dashboard/` — Live/Mock dashboard
- `scripts/` — setup (Supabase/Modal), `serve-dashboard.mjs`, hygiene gates
- `guard/` — PreToolUse-style hook (Phase 4)
- `fixtures/` — smoke targets — [fixtures/README.md](../fixtures/README.md)
- `docs/research/adapters/scanner-output-adapters.md` — keep in sync with `sandbox/scanners.py`

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
  participant Dash as Dashboard

  Op->>CLI: tripwire scan path
  CLI->>DB: Ensure schema / create scan_run
  CLI->>SB: Spawn scanners
  SB->>DB: Findings / console_output
  Dash->>DB: Realtime or poll
  Dash-->>Op: Live results UI
```

---

## 4. Component Detail (C4 L3)

Omitted — container internals are readable from `cli/`, `sandbox/`, and
`prototypes/dc-dashboard/`. Add L3 only when a container becomes hard to navigate
from the code.

---

## 5. Decisions

- Planning decisions: [plan/DECISIONS.md](./plan/DECISIONS.md)
- Slice progress: [plan/PROGRESS.md](./plan/PROGRESS.md)
- Formal ADRs (`docs/adr/`) — none yet; add when a major technology or boundary
  choice needs a durable record
