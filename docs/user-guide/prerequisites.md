# Prerequisites

> Canonical prerequisite page for all onboarding and command execution.

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

Use this page to determine what must be ready before running any command sequence.

## Who can set up and run Tripwire

Tripwire is for a developer, platform/operations engineer, security-minded
technical practitioner, or other product user. It is an early-adopter tool with
a hands-on setup and management component.

| Need | Required familiarity |
|---|---|
| Install and configure Tripwire | Terminal and shell commands; Git; Node/Python tooling; careful editing of `.env` and other configuration files |
| Run Live scans | The above, plus cloud account setup, credential handling, and deployment/configuration troubleshooting |
| Interpret results | Enough security background or interest to interpret findings and decide when to escalate them |

You do not need to be a security expert to install or use Tripwire. Contributors
follow the same product setup before using the development guide.

## Tools and capabilities

| Need | Tools | Accounts |
|---|---|---|
| Install, dry-discover, or use Mock | Git, Node 22, npm, Python 3.12 | None |
| Run Live scans and store findings | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal |
| Enable all scanner vendors | Above tools | Snyk + Tessl + Cisco AI Defense, in addition to Supabase + Modal |

## Before you start

```bash
git --version
node -v      # v22.x (.nvmrc)
npm -v       # supplied with the Node installation
python3 -V   # 3.12.x (.python-version)
```

- Use the [setup command catalog](./setup-commands.md) for concrete command runs.
- Use [QUICKSTART.md](../../QUICKSTART.md) for validation and scan workflows.

## Capability-specific notes

- Full scan coverage requires accounts and setup for all five vendors:
  Supabase, Modal, Snyk, Tessl, and Cisco AI Defense. Supabase and Modal enable
  Live mode; each scanner vendor enables its respective scanner engine.
- Create a disposable Supabase project and collect its connection values. Create and
  authenticate the Modal account. Create scanner-vendor accounts and obtain keys for
  Snyk, Tessl, and Cisco AI Defense before enabling those scanners.
- Copy `.env.example` to `.env` and add the values you collected **before** running
  Modal secret synchronization or deployment commands. Follow
  [supabase-setup.md](./supabase-setup.md), [modal-setup.md](./modal-setup.md), and
  [env-vars.md](./env-vars.md) for the exact account setup and key mapping.
- Supabase and Modal are the Live platform prerequisites. Snyk, Tessl, and Cisco AI
  Defense enable their respective scanner engines; a missing scanner key is
  reported as `skipped_missing_credential`, not silently treated as configured.
- Use demo mode and dry-discover when you want local validation without Live services.

## Five-vendor setup map

Open the applicable account/setup page for every Live capability you intend to
enable, then use [env-vars.md](./env-vars.md) to map the obtained values into
`.env`.

| Vendor | Account and setup reference | Values to collect |
|---|---|---|
| Supabase | [Supabase setup](./supabase-setup.md) and [Supabase Dashboard](https://supabase.com/dashboard) | Project URL, API keys, and database connection string |
| Modal | [Modal setup](./modal-setup.md) and [Modal](https://modal.com) | Authentication or a token pair for non-interactive setup |
| Snyk | [Snyk account/API tokens](https://app.snyk.io) and [vendor procurement steps](./env-vars.md#vendor-procurement-quick-steps) | `SNYK_TOKEN` |
| Tessl | [Tessl](https://tessl.io) and [vendor procurement steps](./env-vars.md#vendor-procurement-quick-steps) | `TESSL_TOKEN`, `TESSL_WORKSPACE` |
| Cisco AI Defense | [Cisco Developer](https://developer.cisco.com) and [vendor procurement steps](./env-vars.md#vendor-procurement-quick-steps) | AI Defense and MCP scanner credentials as applicable |

## Secrets SSOT

- `.env` keys: [env-vars.md](./env-vars.md)
- Optional key allowances: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
