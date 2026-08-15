# Setup command catalog

> Canonical command list for one-off setup and maintenance tasks.

Use this page as the single source for shared setup, validation, scan, and
maintenance commands.

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

## 2) Local validation (Node 22 + Mock dashboard)

Use Node 22 for local validation:

```bash
node --version
npm --version
python3 -V
```

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

Use **Mock (demo data)** on Guard during local validation.

## 3) Live environment bootstrap

Before running these commands, complete in order:

- [supabase-setup.md](./supabase-setup.md)
- [modal-setup.md](./modal-setup.md)
- [env-vars.md](./env-vars.md)

Create `.env`, then fill its values using [env-vars.md](./env-vars.md).
That page is the single source for vendor accounts, key procurement, and
key-to-feature mapping. Provision Supabase, Modal, Snyk, Tessl, and Cisco AI
Defense before this step for the recommended complete Live setup.

```bash
cp .env.example .env
tripwire setup
# optional: ./scripts/setup-supabase.sh
```

### Frontline agent hooks (Claude Code PreToolUse)

Claude Code has **no native install-event hook**. The workaround is a one-shot
operator install:

```bash
tripwire setup-agent-hooks
```

Single install path for Wave H handlers (requires Tripwire Python package
importable, e.g. repo `.venv` / `uv run`). This installs templates to
`~/.tripwire/hooks/` with owner-only mode `700`, writes
`~/.tripwire/config.json` on first run only (`enable=true`,
`scan_validity_days=14` — see `guard/config.py` / slice 23), and registers a
PreToolUse command in `~/.claude/settings.json`. Re-runs are idempotent
(config preserved; hook not duplicated). Fixture/testing overrides:
`--home <dir>` and `--claude-settings <path>`.

**Enable / disable smoke (operator):** after install, set
`"enable": true` in `~/.tripwire/config.json` — PreToolUse blocks unscanned or
RED artifacts. Set `"enable": false` — the same PreToolUse call is approved
(full bypass). Scripted smoke:
`pytest guard/tests/test_live_enforce_smoke.py -q`.

**`/tw-*` dual output contract:** human Markdown table + machine JSON shape,
`heatmap_status` → six UI states, and observed `tripwire scan` stdout fields —
see [frontline-output-contract.md](frontline-output-contract.md).

### Verify Supabase access

After `tripwire setup`, confirm the anon key (what the browser dashboard uses)
can read all tables. Run this whenever you change RLS settings or hit a
"Connection error" in the dashboard:

```bash
./scripts/check-supabase.sh
```

### Live dashboard

The dashboard needs a local proxy to talk to Supabase. Start it before opening
the dashboard in Live mode — it must stay running while you use the dashboard:

```bash
node scripts/serve-dashboard.mjs
# Open: http://127.0.0.1:8765/Tripwire.dc.html → select Live (Supabase)
```

The proxy writes `prototypes/dc-dashboard/tripwire-dashboard.config.js` on
startup. If you restart the proxy on a different port, reload the dashboard so
it picks up the new config.

### Modal bootstrap

```bash
pip install modal
./scripts/setup-modal.sh
# Optional
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

## 4) Re-run and maintenance commands

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

### Tiered router (optional)

> **Missing credentials → warn and skip.** Scans still complete. Without
> `SIE_ENDPOINT` / `SIE_API_KEY`, auto-route and `tripwire route` log a warning
> and leave scanner findings unchanged. Model Studio keys are needed only when
> SIE escalates.

After a Live scan, Tripwire auto-routes the batch when **SIE** keys are set.
Provision accounts with [sie-setup.md](./sie-setup.md) and (for escalation)
[model-studio-setup.md](./model-studio-setup.md); key map:
[env-vars.md](./env-vars.md#optional--tiered-router-sie--model-studio).
Design: [ADR-0016](../adr/0016-tiered-router-sie-model-studio.md). UI:
[reading-router-results.md](./reading-router-results.md).

| Keys present | Behaviour |
|---|---|
| Neither SIE nor Model Studio | Warn + skip routing |
| SIE only | Every item assessed; `routing_review` when not escalated; escalate paths that need Model Studio soft-fail with a failure note in `routing_review` |
| SIE + Model Studio | Full path: review, arbitration (`routing_decision`), or triage (`routing_triage`) |

**Idempotency:** replace-on-success per item — the prior `tiered_router` row for
that scan_run is replaced only after a successful SIE decision. There is no
batch-wide DELETE first, so a SIE outage cannot wipe existing dashboard strips.

Re-run routing manually:

```bash
tripwire route --batch-id <batch_id>
# optional overrides (CLI → env → code default):
# tripwire route --batch-id <batch_id> --sie-model gen-4b --model-studio-model qwen3.8-max
```

Defaults: `SIE_MODEL=gen-4b`, `MODEL_STUDIO_MODEL=qwen3.8-max`. The finding
`message` is a JSON envelope (`signals`, `models`, `reasoning`) — see ADR-0016.

Dashboard Mock fixtures include `tiered_router` findings. To seed Live conflict /
timeout fixtures for UI checks (requires Supabase service-role in `.env`):

```bash
node scripts/seed-router-fixtures.js
```

Then open the Live dashboard and use Escalated / SIE-only filters — details in
[reading-router-results.md](./reading-router-results.md).

## 5) Test commands (when needed)

```bash
cd cli && npm test
pytest                              # sandbox/tests via pyproject testpaths
pytest sandbox/tests/test_acquire_target.py
cd prototypes/dc-dashboard && npm test
```

### Test command for full stack (optional)

See the contributor workflow in [../CONTRIBUTING.md](../../CONTRIBUTING.md) for the full checklist and command expectations.
