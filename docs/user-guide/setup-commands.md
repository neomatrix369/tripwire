# Setup command catalog

> Canonical command list for one-off setup and maintenance tasks.

Use this page as the single source for shared setup commands. Persona-specific usage stays in [persona-commands.md](./persona-commands.md).

## 1) One-off setup commands

### Repository and CLI bootstrap

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
cd cli
npm install
npm link
cd ..
```

### Local dashboard bootstrap

```bash
node scripts/serve-dashboard.mjs
```

### Security env bootstrap (security experts)

Before running these commands, complete in order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)

```bash
cp .env.example .env
tripwire setup
# optional: ./scripts/setup-supabase.sh
```

### Modal bootstrap (security experts)

```bash
pip install modal
./scripts/setup-modal.sh
# Optional
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

## 2) Re-run and maintenance commands

### Schema refresh / redeploy

```bash
tripwire setup --force
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

### Maintenance checks

```bash
./scripts/quality-gates.sh --quick
./scripts/quality-gates.sh
```

## 3) Vendor key procurement quick paths (for scanner depth)

Use this section once you choose scanner depth:

- **Snyk**: open [app.snyk.io](https://app.snyk.io) → Settings → API Tokens → create token (`SNYK_TOKEN`).
- **Tessl**: open [tessl.io](https://tessl.io) → sign in → `tessl login` or UI token page → create workspace token (`TESSL_TOKEN`, optional `TESSL_WORKSPACE`).
- **Cisco AI Defense (optional Tier C)**:
  - Open [Cisco Developer](https://developer.cisco.com), locate AI Defense credentials for:
    - `AI_DEFENSE_API_KEY`
    - `MCP_SCANNER_API_KEY`
    - optional `AI_DEFENSE_API_URL`
    - optional `MCP_SCANNER_ENDPOINT` override.

## 4) End-to-end persona setup simulations

This section mirrors the first-time path for each role.

### Normal users (mock-first)

1. Confirm tool preconditions (`node --version`, `npm --version`).
2. Run:

```bash
node scripts/serve-dashboard.mjs
```

3. Open `http://127.0.0.1:8765/Tripwire.dc.html`, choose **Mock (demo data)**, verify cards and status chip render.

### Developers (no cloud)

1. Confirm local CLIs and package install (`node`, `npm`, `python3`).
2. Ensure CLI is linked (or run via `node cli/bin/tripwire.js` if preferred).
3. Run fixture discovery:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
```

4. Optionally validate dashboard shell with `node scripts/serve-dashboard.mjs`.

### Security experts (live)

1. Complete prerequisites, then setup order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)

2. Add keys in `.env`, then:

```bash
tripwire setup
./scripts/setup-modal.sh
./scripts/setup-modal.sh --secrets-only   # when scanner secrets only
```

3. Run a live scan and check results in dashboard:

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

## 5) Test commands (when needed)

```bash
cd cli && npm test
pytest sandbox/tests/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```

### Test command for full stack (optional)

See the contributor workflow in [../CONTRIBUTING.md](../../CONTRIBUTING.md) for the full checklist and command expectations.
