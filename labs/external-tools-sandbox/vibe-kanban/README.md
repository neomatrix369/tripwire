# vibe-kanban (lab)

Upstream: [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban) (sunsetting; lab still runs the prebuilt binary).

**Runtime: docker** (Modal entry present but unverified — workspace `modal app list` returns 403).

## What this does

Runs the official **linux** `vibe-kanban` binary (CDN: `npm-cdn.vibekanban.com`, pin `v0.1.44-20260424091429`) inside Docker with `HOST=0.0.0.0` / `PORT=3000`. No secrets required for the HTTP smoke bar.

Agent auth (Claude Code, Codex, etc.) is optional and HITL — not needed to prove the server starts.

## Quick start

```bash
# From repo root (branch lab/external-tools-sandbox)
cd labs/external-tools-sandbox/vibe-kanban
./smoke.sh

# Or Compose (from labs/external-tools-sandbox)
docker compose --profile vibe-kanban up --build
# UI: http://127.0.0.1:${VIBE_KANBAN_PORT:-3000}/
```

## Modal (optional / blocked)

```bash
# Requires working Modal auth (see docs/user-guide/modal-setup.md)
modal run ./modal_app.py
```

As of 2026-09-20 this workspace gets `403 Forbidden` from the Modal API, so smoke uses Docker only.

## Files

| File | Role |
|------|------|
| `Dockerfile` | Debian slim + pinned CDN binary |
| `smoke.sh` | Build, run, assert HTTP 200 + HTML |
| `modal_app.py` | Lab Modal app (binary fetch smoke) |
| `smoke-evidence.txt` | Last smoke log (gitignored if present under data) |

## Smoke bar (VERIFIED)

Container starts; `GET /` returns **HTTP 200** with HTML UI.
