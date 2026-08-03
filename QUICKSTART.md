# Quickstart

> Fast entrypoint for installation, scanning, and maintenance.

Follow this shared flow. Use local validation when useful, then configure Live
capabilities only when you need them.

## Shared setup reference

- [Setup command catalog](docs/user-guide/setup-commands.md)
- [Supabase setup](docs/user-guide/supabase-setup.md)
- [Modal setup](docs/user-guide/modal-setup.md)
- [Environment keys](docs/user-guide/env-vars.md)

## Daily workflow

- [Maintenance and bootstrap commands](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- [Regular checks](docs/user-guide/setup-commands.md#3-test-commands-when-needed)

## Install and configure

1. [Confirm prerequisites](docs/user-guide/prerequisites.md).
2. Install and link the CLI using the [setup command catalog](docs/user-guide/setup-commands.md).
3. Configure Live capabilities when needed, in this order:
   - [supabase-setup.md](docs/user-guide/supabase-setup.md)
   - [modal-setup.md](docs/user-guide/modal-setup.md)
   - [env-vars.md](docs/user-guide/env-vars.md)
4. Bootstrap the environment and services:

```bash
cp .env.example .env
tripwire setup
./scripts/setup-modal.sh
```

## Validate locally

Use either option before configuring Live services:

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
