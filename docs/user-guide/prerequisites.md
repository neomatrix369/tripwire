# Prerequisites

> Canonical prerequisite page for all onboarding and command execution.

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

Use this page to determine what must be ready before running any command sequence.

## Tools and capabilities

| Need | Tools | Accounts |
|---|---|---|
| Install, dry-discover, or use Mock | Git, Node 22, npm, Python 3.12 | None |
| Run Live scans and store findings | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal |

## Before you start

```bash
git --version
node -v      # v22.x (.nvmrc)
python3 -V   # 3.12.x (.python-version)
```

- Use the [setup command catalog](./setup-commands.md) for concrete command runs.
- Use [QUICKSTART.md](../../QUICKSTART.md) for validation and scan workflows.

## Capability-specific notes

- Provision Supabase and Modal **before** copying `.env.example` to `.env` when using Live scans.
- Use demo mode and dry-discover when you want local validation without Live services.

## Secrets SSOT

- `.env` keys: [env-vars.md](./env-vars.md)
- Optional key allowances: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
