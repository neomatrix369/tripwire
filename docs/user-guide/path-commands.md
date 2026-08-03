# Shared onboarding command paths

This document is the role-neutral command map for onboarding and day-to-day operator flow.

Start here, then follow the referenced task pages for deeper details.

## 1) Install and bootstrap

1. Confirm prerequisites:

- [prerequisites](./prerequisites.md)

2. Install and link the CLI:

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
cd cli
npm install
npm link
cd ..
```

3. Continue with shared command catalog:

- [setup-commands.md](./setup-commands.md)

## Local validation (Node 22 + Mock dashboard)

Use this when you want to validate installation before provisioning live services.

1. Confirm minimum versions:

```bash
node --version
npm --version
python3 -V
```

2. Verify fixture discovery:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
```

3. Start the dashboard and select **Mock (demo data)**:

```bash
node scripts/serve-dashboard.mjs
```

Expected results:

- Mock cards render.
- Dashboard source defaults to local demo data.
- No Supabase or Modal account required.

## 3) Live capability setup and scan

Provision only what you need:

- [Supabase setup](./supabase-setup.md)
- [Modal setup](./modal-setup.md)
- [Environment reference](./env-vars.md)

Before copying environment variables, create any optional scanner accounts and collect keys for the vendor you enable:

- **Snyk**: API token from [app.snyk.io](https://app.snyk.io).
- **Tessl**: workspace token from [tessl.io](https://tessl.io).
- **Cisco AI Defense**: LLM or AI Defense credentials from [Cisco Developer](https://developer.cisco.com).

Complete bootstrap:

```bash
cp .env.example .env
tripwire setup
./scripts/setup-modal.sh
```

Run a live scan:

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
```

## 4) Re-run and maintenance

- Re-run setup after dependency changes:

```bash
tripwire setup --force
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

- Regular maintenance:

```bash
./scripts/quality-gates.sh --quick
./scripts/quality-gates.sh
```

- Targeted test checks:

```bash
cd cli && npm test
pytest sandbox/tests/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```
