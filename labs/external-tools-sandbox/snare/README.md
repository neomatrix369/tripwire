# snare — GitHub webhooks daemon (lab)

Upstream: [softdevteam/snare](https://github.com/softdevteam/snare)

**Runtime: docker** (Modal preferred in theory; API 403 here — Docker used)
**BUILD: PASS** · **LIVE-RUNNING: PASS** (`ext-tools-snare-live` → `http://127.0.0.1:18000`)

## What this lab proves

1. Builds Rust `snare` in a **Linux** Docker image (macOS host cannot compile snare).
2. Starts durable container with lab config + public fixture secret `secretsecret`.
3. Signed GitHub-style `ping` → `HTTP/1.1 200`.
4. Bad signature → `HTTP/1.1 401`.

## Quick start

```bash
cd labs/external-tools-sandbox/snare
./smoke.sh   # builds, ensures live container, signed ping

# Compose (default host port is already 18000)
cd ..
docker compose --profile snare up -d --build
```

Live check:

```bash
docker ps --filter name=ext-tools-snare-live
# then ./smoke.sh or see EVIDENCE.md
```

## Layout

| Path | Role |
|------|------|
| `Dockerfile` | Multi-stage Rust build; runs as uid 10001 |
| `modal_app.py` | Modal smoke (blocked by 403 in this env) |
| `config/snare.conf` | Listen `0.0.0.0:8000` (container) + fixture secret |
| `smoke.sh` | Docker live smoke (leaves container running on host `:18000`) |
| `TRIES.md` / `EVIDENCE.md` | Attempt log + verdict |

## Secrets

Lab uses the **public** fixture secret only. Do not commit real webhook secrets.

## Port lock (DECIDED — do not change)

| Service | Host port | Notes |
|---------|-----------|-------|
| **Graphiti** | `:8000` | Owns host 8000 — do not free or remap for this lab |
| **snare (this lab)** | `:18000` | Default `SNARE_HOST_PORT=18000`; maps `18000:8000` (container still listens 8000) |

Do **not** move snare onto host `:8000`. Do **not** ask Graphiti to vacate it.
