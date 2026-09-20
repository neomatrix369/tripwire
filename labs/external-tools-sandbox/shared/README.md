# Tripwire pattern reuse (lab)

This lab does **not** import Tripwire product modules at runtime. It
**mirrors** the same operator patterns so Modal/Docker behaviour stays familiar.

## Modal (preferred for daemons / Linux-only tools)

| Source | Pattern to copy |
|--------|-----------------|
| [`sandbox/scan_app.py`](../../../sandbox/scan_app.py) | `modal.App(...)`, `modal.Image.debian_slim(...)`, `.apt_install`, `.run_commands`, `@app.function(secrets=[modal.Secret.from_name(...)])`, `@app.local_entrypoint()` |
| [`scripts/setup-modal.sh`](../../../scripts/setup-modal.sh) | Check `modal` CLI; optional `MODAL_TOKEN_*`; never print secret values; `--force` secret sync |
| [`scripts/_modal_env_split.py`](../../../scripts/_modal_env_split.py) | Parse dotenv without expansion; allowlist keys; JSON summary of **names only** |
| [`cli/src/modalClient.js`](../../../cli/src/modalClient.js) | Spawn `modal run <app.py>` rather than calling remote functions from Node |
| [ADR-0003](../../../docs/adr/0003-modal-isolated-scanner-execution.md) | Isolated compute, hard timeouts, secrets via Modal Secret objects |
| [modal-setup.md](../../../docs/user-guide/modal-setup.md) | Operator auth flow (`modal setup` / tokens) |

Lab helper: [`modal_image.py`](./modal_image.py) — thin Image factory siblings can
import or copy into their `modal_app.py`.

**Secret naming:** use lab-scoped names such as
`external-tools-sandbox` (or per-tool `ext-tools-pizauth`) — do **not** write
into `tripwire-supabase` / `tripwire-scan-secrets`.

## Docker / Compose (fallback)

Tripwire product code has **no Dockerfiles**. Compose in this lab is new,
lab-only infrastructure.

| Convention | Why |
|------------|-----|
| One service per tool under `docker-compose.yml` | Isolation; siblings own build context |
| Compose **profiles** (`vibe-kanban`, `who-targets-me`, …, `all`) | Run one tool without building the rest |
| `env_file: .env` + `.env.example` | Match Tripwire env discipline; no secrets in git |
| `--rm` / ephemeral volumes for smoke | Match shell hygiene + Modal scratch-disk mindset |

Helper: [`docker-smoke.sh`](./docker-smoke.sh) — `build` + `run --rm` wrappers.

## What not to reuse

- Do not call `spawnScanSandbox` or deploy `tripwire-scan` for these tools.
- Do not put lab secrets into product Modal secret buckets.
- Do not add lab services to product CI quality gates unless requested.
