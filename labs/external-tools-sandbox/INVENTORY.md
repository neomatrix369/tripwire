# External tools sandbox — LIVE inventory

Generated: **2026-09-20T12:11:14Z**. Do not commit secrets.
Verdicts: **LIVE-RUNNING** | **PARTIAL LIVE** | **BUILD-ONLY** | **FAIL**.

| Tool | Live-running? | Runtime | Last smoke | Try count | Outcomes log | HITL blockers |
|------|---------------|---------|------------|-----------|--------------|---------------|
| Shared scaffold | n/a (PASS) | n/a | `scripts/smoke-all.sh` | 1 | compose + `.env.example` + shared helpers | none |
| vibe-kanban | **LIVE-RUNNING** | docker | PASS — compose healthy, `GET :3000/` → **200** (re-probed 12:11Z) | 3 | ephemeral smoke HTTP 200; compose up healthy; Modal skipped (empty `MODAL_TOKEN_*`) | Modal tokens / API 403 for Modal path |
| who-targets-me | **PARTIAL LIVE** | docker | BUILD PASS + live-try PARTIAL (`load_ext=1` `webext=1`) | 3 | chrome+firefox build OK; Chromium `--load-extension` + `web-ext` under Xvfb OK | Facebook login / real browser session |
| pizauth | **LIVE-RUNNING** (OAuth **BLOCKED-HITL**) | docker (Modal ephemeral also PASS earlier) | Daemon PASS; OAuth setup exit 2 (no creds); redirect URI proven `http://localhost:14204/` | 9 | rust pin → Docker/Modal PASS → compose LIVE → env scan NO CREDS → oauth-setup BLOCKED-HITL | Which IdP (Google/Microsoft)? `PIZAUTH_CLIENT_ID`/`SECRET` + register redirect `http://localhost:14204/` |
| snare | **LIVE-RUNNING** | docker | PASS — signed ping **200** + bad sig **401**; live `:18000` | 8+ | Modal fail (crates.io / 403); Docker PASS then trap `set -u` false FAIL; restored wiped sources; trap fixed; live container up; **port lock KEEP :18000** | Modal auth; **Graphiti=:8000 / snare=:18000 (do not change)**; real GitHub webhook secret |

## Currently up (host)

| Container | Port | Probe |
|-----------|------|-------|
| `external-tools-sandbox-vibe-kanban-1` | `3000` | `curl http://127.0.0.1:3000/` → 200 |
| `external-tools-sandbox-pizauth-1` | `14204` | listen OK (HTTP 404); `pizauth info -j -c /config/pizauth.conf` → `server_running:true` |
| `ext-tools-snare-live` | `18000`→8000 | signed GitHub-style `ping` → `HTTP/1.1 200 OK` |

**Port lock:** Graphiti owns host `:8000`; snare lab stays on host `:18000` (do not change).

who-targets-me has **no long-running daemon** (browser extension). Live bar = load extension / web-ext start inside Docker.

## Smoke-all (this session)

```
PASS  vibe-kanban
PASS  who-targets-me
PASS  pizauth
FAIL  snare   # false FAIL: Docker evidence PASS then EXIT trap unbound `name` under set -u
```

Re-smoke after trap fix: **`EXT_TOOLS_RUNTIME=docker ./snare/smoke.sh` → PASS** (exit 0).

Aggregated attempt log: [`TRIES.md`](./TRIES.md). Per-tool: `*/TRIES.md`.
