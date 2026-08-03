# Quickstart

> Fast entrypoint by role and objective.

Pick one path, verify prerequisites, then follow the linked persona flow.

## Paths

| Path | Setup prerequisites | Start here |
|---|---|---|
| Normal users | [Node 22](docs/user-guide/prerequisites.md#tool-prerequisites) + [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md) | [docs/user-guide/persona-commands.md#normal-users](docs/user-guide/persona-commands.md#normal-users) |
| Developers | [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md) | [docs/user-guide/persona-commands.md#developers](docs/user-guide/persona-commands.md#developers) |
| Security experts | [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md) + [setup-commands.md](docs/user-guide/setup-commands.md) + [env-vars.md](docs/user-guide/env-vars.md) + [supabase-setup.md](docs/user-guide/supabase-setup.md) + [modal-setup.md](docs/user-guide/modal-setup.md) | [docs/user-guide/persona-commands.md#security-experts](docs/user-guide/persona-commands.md#security-experts) |

## Shared setup reference

- [Setup command catalog](docs/user-guide/setup-commands.md)
- [Persona flows](docs/user-guide/persona-commands.md)
- [Supabase setup](docs/user-guide/supabase-setup.md)
- [Modal setup](docs/user-guide/modal-setup.md)
- [Environment keys](docs/user-guide/env-vars.md)

## Daily workflow

- [Maintenance and bootstrap commands](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- [Regular checks](docs/user-guide/setup-commands.md#3-test-commands-when-needed)

## Normal users

Objective: see a running dashboard in Mock mode quickly.

1. [Confirm Node 22](docs/user-guide/prerequisites.md#node-version).
2. Follow the quick normal-user flow in [persona-commands.md#normal-users](docs/user-guide/persona-commands.md#normal-users) and start:

```bash
node scripts/serve-dashboard.mjs
```

3. In Guard, select **Mock (demo data)** and verify cards populate.

## Developers

Objective: run fixture discovery without cloud accounts.

1. [Confirm Node 22 and Python 3.12](docs/user-guide/prerequisites.md).
2. Use [persona-commands.md#developers](docs/user-guide/persona-commands.md#developers) for:
   - `tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner`
   - `tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json`
3. If you need local dashboard context, run:

```bash
node scripts/serve-dashboard.mjs
```

## Security experts

Objective: configure and run Live scans.

1. [Confirm all operator prerequisites](docs/user-guide/prerequisites.md).
2. Run setup docs in order:
   - [supabase-setup.md](docs/user-guide/supabase-setup.md)
   - [modal-setup.md](docs/user-guide/modal-setup.md)
   - [env-vars.md](docs/user-guide/env-vars.md)
3. Bootstrap env and secrets:

```bash
cp .env.example .env
tripwire setup
./scripts/setup-modal.sh
```

4. Continue in [persona-commands.md#security-experts](docs/user-guide/persona-commands.md#security-experts).

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
