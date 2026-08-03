# Quickstart

> Fast entrypoint for installation, scanning, and maintenance.

Follow this shared flow. Use local validation when useful, then configure Live
capabilities only when you need them.

## Shared setup reference

- [Setup command catalog](docs/user-guide/setup-commands.md)
- [Operational path (Install → Local validation → Live)](docs/user-guide/path-commands.md)
- [Supabase setup](docs/user-guide/supabase-setup.md)
- [Modal setup](docs/user-guide/modal-setup.md)
- [Environment keys](docs/user-guide/env-vars.md)

## Daily workflow

- [Maintenance and bootstrap commands](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- [Regular checks](docs/user-guide/setup-commands.md#7-test-commands-when-needed)

## Install and configure

1. [Confirm prerequisites](docs/user-guide/prerequisites.md).
2. Install and link the CLI using the [setup command catalog](docs/user-guide/setup-commands.md).
3. Prefer this role-neutral flow for onboarding and local validation:
   [path-commands.md](docs/user-guide/path-commands.md#local-validation-node-22--mock-dashboard)
4. Configure all five vendor paths in this onboarding order for full scan coverage:
   - [Supabase](docs/user-guide/supabase-setup.md): create the project and copy the platform credentials.
   - [Modal](docs/user-guide/modal-setup.md): authenticate and deploy the Live scan environment.
   - [Snyk](https://app.snyk.io): collect API token and map to `SNYK_TOKEN` in `.env`.
   - [Tessl](https://tessl.io): collect workspace token and map to `TESSL_TOKEN` / `TESSL_WORKSPACE`.
   - [Cisco AI Defense](https://developer.cisco.com): collect the LLM or AI Defense credentials for `AI_DEFENSE_*` and Cisco MCP scanner settings.
  - Use [env-vars.md](docs/user-guide/env-vars.md) to map each credential to `.env`.
    [OPTIONAL_SCANNER_KEYS.md](fixtures/OPTIONAL_SCANNER_KEYS.md) documents scanner-secret allowlist values and manual fallback behavior.
5. Bootstrap the environment and services:

```bash
cp .env.example .env
```

Open `.env` and complete each value immediately using the inline comment on that key as your fill-in guide.

Required for Live mode:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`

Values for full five-vendor scan coverage:

- `SNYK_TOKEN`
- `TESSL_TOKEN`, `TESSL_WORKSPACE`
- `SKILL_SCANNER_LLM_API_KEY`, `SKILL_SCANNER_LLM_MODEL`, `SKILL_SCANNER_LLM_PROVIDER`, `SKILL_SCANNER_LLM_BASE_URL`, `SKILL_SCANNER_LLM_API_VERSION`
- `MCP_SCANNER_LLM_API_KEY`, `MCP_SCANNER_LLM_MODEL`, `MCP_SCANNER_LLM_BASE_URL`, `MCP_SCANNER_LLM_API_VERSION`
- `AI_DEFENSE_API_KEY`, `AI_DEFENSE_API_URL`, `MCP_SCANNER_API_KEY`, `MCP_SCANNER_ENDPOINT`
- `MCP_SCANNER_ENDPOINT` (default is prefilled if you keep Cisco endpoint default)

Then run bootstrap:

```bash
tripwire setup
./scripts/setup-modal.sh
```

## Validate locally

Use either option before configuring Live services.

Prefer the detailed local path in one place:

- [Local validation (Node 22 + Mock)](docs/user-guide/path-commands.md#local-validation-node-22--mock-dashboard)

Use either option:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
```

In Guard, select **Mock (demo data)** to verify the dashboard with demo findings.

## Live capabilities

Run a fixture scan and review results in the Live dashboard:

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
```

Use [setup-commands.md](docs/user-guide/setup-commands.md) for the complete
setup, re-run, and maintenance command catalog.

## Troubleshooting shortcuts

- Live dashboard blank or stale → switch data source between Mock and Live in Guard.
- Missing scanner output → verify setup commands and key provisioning.
- `dry-discover` failures → confirm `cli` dependencies and `npm link` are done.

## Next steps

- Docs map: [docs/README.md](docs/README.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Capability status: [docs/STATUS.md](docs/STATUS.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

---

<!-- Primary stack -->
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

<!-- Scanner & partner -->
[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
