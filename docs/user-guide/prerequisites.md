# Prerequisites

> Tools and accounts by persona. Verify versions before copying `.env`.

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

This file answers “what I need before running commands” by path.

## Choose your path

| Persona | Tools | Cloud accounts | Next |
|---------|-------|----------------|------|
| **Demo viewer** | Git, Node 22, npm | None | [QUICKSTART → Demo](../../QUICKSTART.md#demo-viewer) — select **Mock** |
| **Scanner user** | Git, Node 22, npm | None | [QUICKSTART → Scanner](../../QUICKSTART.md#scanner-user) |
| **Platform operator** | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal | [supabase-setup](./supabase-setup.md) → [modal-setup](./modal-setup.md) → [env-vars](./env-vars.md) |

Demo and Scanner need **no** Supabase or Modal. Platform: procure accounts and keys **before** `cp .env.example .env`.

## Verify versions

```bash
node -v    # v22.x (nvm use / fnm use if needed)
python3 -V # Python 3.12.x
git --version
```

Optional (Platform only):

```bash
pip install modal
modal --version
```

## Dependency quick-check

```bash
cd cli
npm install
cd ..
node scripts/serve-dashboard.mjs
```

If `npm install` fails in `cli/`, rerun with a clean Node 22 environment:

```bash
nvm use 22
cd cli
rm -rf node_modules
npm install
cd ..
```

## What each persona does

- **Demo** — open the dashboard with Mock data. Live is the UI default; you must switch to **Mock (demo data)** on the Guard tab.
- **Scanner** — `tripwire scan --dry-discover` on a fixture. No Modal spawn.
- **Platform** — apply schema, sync Modal secrets, run a real scan, view Live dashboard.

Secrets SSOT: [env-vars.md](./env-vars.md). Allowlist notes: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).
