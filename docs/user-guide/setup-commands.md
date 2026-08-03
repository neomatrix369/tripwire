# Setup command catalog

> Canonical command list for one-off setup and maintenance tasks.

Use this page as the single source for shared setup, validation, scan, and
maintenance commands.

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

## 2) Local validation (Node 22 + Mock dashboard)

Use Node 22 for local validation:

```bash
node --version
npm --version
python3 -V
```

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

Use **Mock (demo data)** on Guard during local validation.

## 3) Live environment bootstrap

Before running these commands, complete in order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)
- Configure only the scanner integrations you need:
  - **Snyk**: set `SNYK_TOKEN`.
  - **Tessl**: set `TESSL_TOKEN` and, if needed, `TESSL_WORKSPACE`.
  - **Cisco**: set the LLM or AI Defense keys required by the scanner mode you enable.
  - Use [env-vars.md](./env-vars.md) for vendor account steps and key-to-feature mapping.

```bash
cp .env.example .env
tripwire setup
# optional: ./scripts/setup-supabase.sh
```

### Modal bootstrap

```bash
pip install modal
./scripts/setup-modal.sh
# Optional
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

## 4) Re-run and maintenance commands

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

## 5) Vendor key procurement quick paths (for scanner depth)

Use this section once you choose scanner depth:

- **Snyk**: open [app.snyk.io](https://app.snyk.io) → Settings → API Tokens → create token (`SNYK_TOKEN`).
- **Tessl**: open [tessl.io](https://tessl.io) → sign in → `tessl login` or UI token page → create workspace token (`TESSL_TOKEN`, optional `TESSL_WORKSPACE`).
- **Cisco AI Defense (optional Tier C)**:
  - Open [Cisco Developer](https://developer.cisco.com), locate AI Defense credentials for:
    - `AI_DEFENSE_API_KEY`
    - `MCP_SCANNER_API_KEY`
    - optional `AI_DEFENSE_API_URL`
    - optional `MCP_SCANNER_ENDPOINT` override.

## 6) End-to-end setup and run

### Local validation

1. Confirm tool preconditions (`node --version`, `npm --version`).
2. Run:

```bash
node scripts/serve-dashboard.mjs
```

3. Open `http://127.0.0.1:8765/Tripwire.dc.html`, choose **Mock (demo data)**, verify cards and status chip render.

### Discovery validation

1. Confirm local CLIs and package install (`node`, `npm`, `python3`).
2. Ensure CLI is linked (or run via `node cli/bin/tripwire.js` if preferred).
3. Run fixture discovery:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
```

4. Optionally validate dashboard shell with `node scripts/serve-dashboard.mjs`.

### Live setup and scan

1. Complete prerequisites, then setup order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)

2. Create or obtain the credentials you need, then paste them into `.env`:

   - [Supabase](./supabase-setup.md): create a project and copy `SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` (plus the optional anon key).
   - [Modal](./modal-setup.md): create an account and authenticate with `modal setup`;
     `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` are only needed for non-interactive use.
   - [Snyk](https://app.snyk.io): create an API token and set `SNYK_TOKEN` when using Snyk scans.
   - [Tessl](https://tessl.io): create a workspace API key and set `TESSL_TOKEN` (and optional `TESSL_WORKSPACE`) when using Tessl scans.
   - [Cisco AI Defense](https://developer.cisco.com): obtain the LLM or AI Defense credentials required by the Cisco scanner mode you enable.

   See [env-vars.md](./env-vars.md) for the exact scanner key-to-feature mapping.
   Use [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md) only
   when syncing scanner credentials to Modal.

3. Run:

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

## 7) Test commands (when needed)

```bash
cd cli && npm test
pytest                              # sandbox/tests via pyproject testpaths
pytest sandbox/tests/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```

### Test command for full stack (optional)

See the contributor workflow in [../CONTRIBUTING.md](../../CONTRIBUTING.md) for the full checklist and command expectations.
