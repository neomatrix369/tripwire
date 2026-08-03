# Prerequisites

> Canonical prerequisite page for all onboarding and command execution.

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

Use this page to determine what must be ready before running any command sequence.

## Roles and requirements

| Role | Tools | Accounts |
|---|---|---|
| **Normal users** | Git, Node 22, npm | None |
| **Developers** | Git, Node 22, npm, Python 3.12 (optional locally) | None |
| **Security experts** | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal |

## Before you start

```bash
git --version
node -v      # v22.x (.nvmrc)
python3 -V   # 3.12.x (.python-version)
```

- Use the [setup command catalog](./setup-commands.md) for concrete command runs.
- Use the [persona command guide](./persona-commands.md) for role-specific workflows.

## Account-specific notes

- Security experts must provision Supabase + Modal **before** copying `.env.example` to `.env`.
- If you are not running Live scans, keep setup cloud-free and use demo mode for dashboard checks.

## Role outcomes

- **Normal users**: dashboard access via demo mode without cloud dependencies.
- **Developers**: run fixture-only discovery and iterate safely.
- **Security experts**: run schema bootstrap, modal secret sync/deploy, and full scanner flows.

## Secrets SSOT

- `.env` keys: [env-vars.md](./env-vars.md)
- Optional key allowances: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
