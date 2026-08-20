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

### Stages (Install → Live → maintain)

1. **Fit** — [prerequisites](docs/user-guide/prerequisites.md).
2. **Install** — [CLI bootstrap](docs/user-guide/setup-commands.md#repository-and-cli-bootstrap) (same as demo step 2).
3. **Accounts** — [Supabase](docs/user-guide/supabase-setup.md) → [Modal](docs/user-guide/modal-setup.md) → Snyk / Tessl / Cisco via [env-vars](docs/user-guide/env-vars.md#vendor-procurement-quick-steps).
4. **Keys** — create `.env` only after you have values; fill with [env-vars.md](docs/user-guide/env-vars.md). Review billing/quotas first.
5. **Bootstrap** — [Live environment bootstrap](docs/user-guide/setup-commands.md#live-environment-bootstrap):

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

7. **Optional router** (after Live works) — [tiered-router-setup](docs/user-guide/tiered-router-setup.md), then:

```bash
tripwire route --batch-id <batch_id>
```

Read strips and filters: [reading-router-results.md](docs/user-guide/reading-router-results.md).

### Required Live keys (summary)

- Platform: `SUPABASE_*`, `MODAL_TOKEN_*`
- Full scanner coverage: `SNYK_TOKEN`, `TESSL_*`, Cisco Skill/MCP / AI Defense keys — see [env-vars](docs/user-guide/env-vars.md)
- Optional router: `SIE_*`, then Model Studio `DASHSCOPE_*` / `ALIBABA_OPENAI_BASE_URL`

If a scanner credential is missing, that engine is reported as skipped — not as a complete scan.

### Daily maintenance

- [Re-run and maintenance](docs/user-guide/setup-commands.md#re-run-and-maintenance-commands)
- [When it fails](docs/user-guide/setup-commands.md#when-it-fails)

---

## Next

- Docs map: [docs/README.md](docs/README.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Status: [docs/STATUS.md](docs/STATUS.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Screenshots: [docs/screenshots/](docs/screenshots/README.md)
