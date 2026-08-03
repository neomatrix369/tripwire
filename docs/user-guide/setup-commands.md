# Setup command catalog

> Canonical command list for one-off setup and maintenance tasks.

Use this page as the single source for shared setup commands. Persona-specific usage stays in [persona-commands.md](./persona-commands.md).

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

### Local dashboard bootstrap

```bash
node scripts/serve-dashboard.mjs
```

### Security env bootstrap (security experts)

Before running these commands, complete in order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)

```bash
cp .env.example .env
tripwire setup
# optional: ./scripts/setup-supabase.sh
```

### Modal bootstrap (security experts)

```bash
pip install modal
./scripts/setup-modal.sh
# Optional
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

## 2) Re-run and maintenance commands

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

## 3) Test commands (when needed)

```bash
cd cli && npm test
pytest sandbox/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```

### Test command for full stack (optional)

See the contributor workflow in [../CONTRIBUTING.md](../../CONTRIBUTING.md) for the full checklist and command expectations.
