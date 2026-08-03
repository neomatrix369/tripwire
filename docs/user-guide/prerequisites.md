# Prerequisites

> Tools and accounts by role. Verify versions before copying `.env`.

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

This file answers “what I need before running commands” by path.

## Choose your path

| Role | Tools | Cloud accounts | Next |
|---------|-------|----------------|------|
| **Normal users** | Git, Node 22, npm | None | [QUICKSTART → Normal users](../../QUICKSTART.md#normal-users) — select **Mock** |
| **Developers** | Git, Node 22, npm, Python 3.12 (optional locally) | Optional: None | [QUICKSTART → Developers](../../QUICKSTART.md#developers) |
| **Security experts** | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal | [supabase-setup](./supabase-setup.md) → [modal-setup](./modal-setup.md) → [env-vars](./env-vars.md) |

Normal users and developers can start without Supabase or Modal; all paths share the same local bootstrap. Security experts add cloud credentials and perform full scan flow after the local baseline.
Procure cloud accounts and keys **before** `cp .env.example .env`.

## Verify versions

```bash
node -v    # v22.x (nvm use / fnm use if needed)
python3 -V # Python 3.12.x
git --version
```

Optional (security experts only):

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

## What each role does

- **Normal users** — open the dashboard with Mock data. Live is the UI default; switch to **Mock (demo data)** on the Guard tab.
- **Developers** — run and iterate `tripwire scan --dry-discover` on fixtures while improving the tool. No Modal spawn by default.
- **Security experts** — apply schema, sync Modal secrets, run real scans, and review Live findings.

Secrets SSOT: [env-vars.md](./env-vars.md). Allowlist notes: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).
