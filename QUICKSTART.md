# Quickstart

> Get Tripwire working in a few steps.

**Tripwire** finds AI add-ons, checks them for risk, and shows results in one screen.

| Path | Effort | What you get |
|---|---|---|
| [Try the demo](#try-the-demo-recommended) | **Recommended** — no cloud accounts | Local discovery + Mock dashboard |
| [Live scan](#live-advanced) | **Advanced** — five vendors + `.env` | Real scans stored online |

Hub for every other task: [docs/README.md](docs/README.md).

---

## Try the demo (Recommended)

1. Check tools: [prerequisites](docs/user-guide/prerequisites.md) (Node 22, Python 3.12).
2. Install the CLI:

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
cd cli && npm install && npm link && cd ..
```

3. Run a safe discovery check and open the Mock dashboard:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Use **Mock (demo data)** in Guard.
Click **Open Dashboard →** past the landing intro if shown.

More commands: [setup-commands.md](docs/user-guide/setup-commands.md).

Contributors: complete [Dev hygiene](CONTRIBUTING.md#dev-hygiene) before your first change.

---

## Live (Advanced)

Do these in order. Do not expect Live findings until accounts, `.env`, schema, and Modal are ready.

> **Minimum Viable Live:** start with **Supabase + Modal only** (store + sandbox). Add Snyk / Tessl / Cisco accounts and keys when you want full scanner coverage. Missing scanner keys soft-skip that engine — they do not block platform Live.

### Stages (Setup → Configure → run → maintain)

1. **Fit** — [prerequisites](docs/user-guide/prerequisites.md) (Account vs Keys map).
2. **Install** — [CLI bootstrap](docs/user-guide/setup-commands.md#repository-and-cli-bootstrap) (same as demo step 2).
3. **A. Create accounts (Setup)** — [Supabase](docs/user-guide/supabase-setup.md) → [Modal](docs/user-guide/modal-setup.md). Optional scanners: account steps under [env-vars procurement](docs/user-guide/env-vars.md#vendor-procurement-quick-steps).
4. **B. Configure keys** — create `.env` only after you have values; fill with [env-vars.md](docs/user-guide/env-vars.md) (Configure SSOT). Review billing/quotas first.
5. **C. Bootstrap commands** — [Live environment bootstrap](docs/user-guide/setup-commands.md#live-environment-bootstrap):

```bash
cp .env.example .env
# fill keys using env-vars.md
tripwire setup
./scripts/setup-modal.sh
```

6. **Scan + review**:

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
# Open Live (Supabase) in the dashboard
```

> **Gotcha:** a missing scanner key means that engine was **skipped**, not that the skill is “all clear.” Platform Live can still succeed with Supabase + Modal alone.

7. **Optional router** (after Live works) — [tiered-router-setup](docs/user-guide/tiered-router-setup.md), then:

```bash
tripwire route --batch-id <batch_id>
```

Read strips and filters: [reading-router-results.md](docs/user-guide/reading-router-results.md).

### Required Live keys (summary)

- **MVP Live:** `SUPABASE_*`, `MODAL_TOKEN_*`
- Full scanner coverage: `SNYK_TOKEN`, `TESSL_*`, Cisco Skill/MCP / AI Defense keys — see [env-vars](docs/user-guide/env-vars.md)
- Optional router: `SIE_*`, then Model Studio `DASHSCOPE_*` / `ALIBABA_OPENAI_BASE_URL`

### Daily maintenance

Cheat lines (full catalog linked):

- Re-scan unchanged content: `tripwire scan --force <path>` — [re-run](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- Re-route a batch: `tripwire route --batch-id <batch_id>` — [tiered router](docs/user-guide/setup-commands.md#tiered-router-optional)
- Secrets-only Modal redeploy: `./scripts/setup-modal.sh --secrets-only` — [same section](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- Failures: [When it fails](docs/user-guide/setup-commands.md#when-it-fails)

---

## Next

- Docs map: [docs/README.md](docs/README.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Status: [docs/STATUS.md](docs/STATUS.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Screenshots: [docs/screenshots/](docs/screenshots/README.md)
