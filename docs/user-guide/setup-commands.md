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

Create `.env`, then fill its values using [env-vars.md](./env-vars.md).
That page is the single source for vendor accounts, key procurement, and
key-to-feature mapping.

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

## 5) End-to-end setup and run

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

2. Copy `.env.example` to `.env`, then fill every applicable value using
   [env-vars.md](./env-vars.md). It is the only vendor-account, credential,
   and key-to-feature reference. Use
   [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md) only
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

## 6) Test commands (when needed)

```bash
cd cli && npm test
pytest                              # sandbox/tests via pyproject testpaths
pytest sandbox/tests/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```

### Test command for full stack (optional)

See the contributor workflow in [../CONTRIBUTING.md](../../CONTRIBUTING.md) for the full checklist and command expectations.
