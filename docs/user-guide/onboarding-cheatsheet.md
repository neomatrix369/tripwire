# Onboarding cheatsheet: commands by purpose

This page answers the “what do I run first?” question with practical snippets.
If you only remember one page, this is it.

## 1) Quick orientation by persona

| Persona | First objective | One-liner |
|---------|-----------------|-----------|
| Demo viewer | See dashboard in 2–3 min | `node scripts/serve-dashboard.mjs` |
| Scanner user | Validate fixtures without cloud | `tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner` |
| Platform operator | Run a real scan in Live mode | `tripwire setup && ./scripts/setup-modal.sh && tripwire scan ...` |
| Contributor | Make safe PR-ready edits | follow [CONTRIBUTING.md](../../CONTRIBUTING.md) |

---

## 2) Prerequisites (common + path-specific)

> Verify before any one-off setup step.

```bash
git --version
node -v      # v22.x (from .nvmrc)
python3 -V   # 3.12.x (from .python-version)
```

### By persona

- **Demo viewer**: Git + Node 22
- **Scanner user**: Git + Node 22 + npm
- **Platform operator**: Git + Node 22 + Python 3.12 + Supabase account + Modal account

For path-specific dependencies, follow:
[prerequisites.md](./prerequisites.md) → [supabase-setup.md](./supabase-setup.md) → [modal-setup.md](./modal-setup.md) → [env-vars.md](./env-vars.md).

---

## 3) One-off setup (run only once unless your machine changes)

### Demo setup

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
node scripts/serve-dashboard.mjs
# then Guard tab → Mock (demo data)
```

### Scanner setup

```bash
cd cli
npm install
npm link
cd ..
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
```

### Platform setup (full stack)

```bash
cp .env.example .env
# Fill required keys using env-vars.md:
#  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
#  optional scanner keys can be added later

cd cli && npm install && npm link && cd ..
tripwire setup

pip install modal
./scripts/setup-modal.sh

tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
```

---

## 4) Regular commands (do these repeatedly)

### Demo operations

```bash
node scripts/serve-dashboard.mjs
tripwire scan --dry-discover ./fixtures/skills/safe-changelog-writer
```

### Scan operations

```bash
# fixture exploration
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json

# live scan
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/safe-time-server
```

### Dashboard checks

```bash
node scripts/serve-dashboard.mjs
# Guard tab: Live for Supabase, Mock for local demo
```

---

## 5) Maintenance commands (scheduled / after updates)

Use these after dependency/schema/secret changes.

```bash
tripwire setup --force                  # re-apply latest DB schema + policies
./scripts/setup-modal.sh --secrets-only  # update Modal secrets only
./scripts/setup-modal.sh --deploy-only   # redeploy sandbox image after local scan logic updates

cd cli && npm test                      # CLI tests
pytest sandbox/test_acquire_target.py     # sandbox dispatch smoke
cd prototypes/dc-dashboard && npm test    # Live dashboard coverage tests

./scripts/quality-gates.sh --quick      # pre-push sanity
./scripts/quality-gates.sh             # full project-level checks
```

---

## 6) Where to go next

- [QUICKSTART](../../QUICKSTART.md) — path-specific first-run steps
- [README](../../README.md) — project map and command references
- [docs/README.md](../README.md) — full doc map
- [fixtures/README.md](../../fixtures/README.md) — fixture behavior matrix
- [STATUS.md](../STATUS.md) — what has been verified
