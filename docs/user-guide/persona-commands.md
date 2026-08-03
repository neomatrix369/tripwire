# Persona commands

> Role-specific commands grouped by objective.

Choose a path, verify prerequisites, then run persona-specific commands.

## Normal users

### Goal
See dashboard quickly with mock data.

### Commands

```bash
node scripts/serve-dashboard.mjs
```

- Open `http://127.0.0.1:8765/Tripwire.dc.html`
- In Guard, choose **Mock (demo data)**

### Verification

- Dashboard loads
- Guard shows a demo status chip

## Developers

### Goal
Iterate locally on fixtures and discovery output.

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
```

- Run fixture discovery for behavior checks before cloud setup.

### Security-expert preview scan examples

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
```

Use this only when platform keys and schema are provisioned.

## Security experts

### Goal
Run real Live scans with Supabase + Modal.

```bash
tripwire setup
./scripts/setup-modal.sh

tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

- In Guard, use **Live (Supabase)** to view real scan runs.

## Common command references

- Setup commands: [setup-commands.md](./setup-commands.md)
- Prerequisites: [prerequisites.md](./prerequisites.md)
- Command walkthrough by role: [../../QUICKSTART.md](../../QUICKSTART.md)
