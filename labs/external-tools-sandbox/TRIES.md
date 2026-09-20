# External tools sandbox — aggregated try log

Append-only session rollup. Per-tool detail lives in each tool’s `TRIES.md`.
Timestamps UTC. No secrets.

## 2026-09-20T12:04Z — smoke-all (EXT_TOOLS_RUNTIME=docker)

| Tool | Result | Notes |
|------|--------|-------|
| vibe-kanban | PASS | Ephemeral `docker run` HTTP 200 UI |
| who-targets-me | PASS | `WTM_BUILD_OK` chrome+firefox |
| pizauth | PASS | container-smoke daemon bring-up |
| snare | FAIL (false) | Modal first failed (`cargo install snare` no binaries / 403). Docker path: ping 200 + bad-sig 401 **PASS**, then `smoke.sh: name: unbound variable` on EXIT trap → smoke-all counted FAIL |

Log: `.tries/session-20260920T120417Z.log`

## 2026-09-20T12:05Z — sibling LIVE compose (vibe + pizauth)

| Tool | Attempt | Result |
|------|---------|--------|
| vibe-kanban | `docker compose --profile vibe-kanban up -d` | **LIVE-RUNNING** healthy `:3000` HTTP 200 |
| vibe-kanban | Modal | SKIPPED — `MODAL_TOKEN_*` empty in `.env` |
| pizauth | `docker compose --profile pizauth up -d` | **LIVE-RUNNING** healthy `:14204`, `server_running:true` |
| who-targets-me | baseline smoke | BUILD PASS only (see tool TRIES) |

## 2026-09-20T12:06Z — snare sibling host attempts

| Attempt | Result |
|---------|--------|
| docker.sock / OrbStack without privileges | permission denied |
| `modal app list` | 403 Forbidden |
| host `cargo build` via `.vendor` | FAIL (corrupt/missing crate paths) |
| **Side effect** | Lab sources under `snare/` wiped to TRIES + vendor only |

## 2026-09-20T12:08Z — restore + fix

| Attempt | Result |
|---------|--------|
| Restore Dockerfile/smoke/config/prps/modal/README from prior agent transcript | OK |
| Fix EXIT trap (`SNARE_SMOKE_NAME` global) + prefer Docker when Modal tokens empty | OK |

## 2026-09-20T12:09Z — rerun + LIVE snare + WTM live-try

| Attempt | Result |
|---------|--------|
| `EXT_TOOLS_RUNTIME=docker ./snare/smoke.sh` | **PASS** exit 0 |
| `docker run -d --name ext-tools-snare-live -p 18000:8000` | **LIVE-RUNNING** ping 200 |
| Re-probe vibe `:3000` / pizauth `:14204` | 200 / listen + `server_running:true` |
| `./who-targets-me/live-try.sh` | **PARTIAL LIVE** (`load_ext=1` `webext=1`); FB login HITL. Host exit 127 after success (transient `xit` noise; script now `bash -n` clean) |

Log: `.tries/rerun-20260920T120908Z.log`

## 2026-09-20T12:11Z — final inventory probes

| Probe | Result |
|-------|--------|
| vibe `GET /` | 200 |
| pizauth listen | 404 (accepting) |
| snare signed ping | HTTP/1.1 200 OK |
| containers | vibe + pizauth + `ext-tools-snare-live` Up |

## 2026-09-20T12:20Z — snare port lock KEEP :18000

| Decision / probe | Result |
|------------------|--------|
| User path | **KEEP snare on host `:18000`**; do not free/take Graphiti `:8000` |
| Defaults | compose + smoke already `18000:8000` |
| Docs | README / INVENTORY / STATUS / TRIES updated with port lock |
| `ext-tools-snare-live` | Up `0.0.0.0:18000->8000/tcp` |
| `docker-graphiti-mcp-1` | still `0.0.0.0:8000->8000/tcp` (untouched) |
| signed ping `:18000` | **HTTP/1.1 200 OK** |
| bad sig `:18000` | **HTTP/1.1 401** |

## 2026-09-20T12:21Z — pizauth OAuth push

| Attempt | Result |
|---------|--------|
| Env key scan (repo `.env`, lab `.env`) | **NO** OAuth client_id/secret keys |
| LIVE re-probe `:14204` | healthy; `server_running:true`; redirect `http://localhost:14204/` |
| `./pizauth/scripts/oauth-setup.sh` (no creds) | **BLOCKED-HITL** exit 2 |
| Scaffold | QUESTIONS.md, provider examples, gitignore local conf, compose config path |

Detail: `pizauth/TRIES.md`. Verdict: daemon LIVE + OAuth **BLOCKED-HITL**.
