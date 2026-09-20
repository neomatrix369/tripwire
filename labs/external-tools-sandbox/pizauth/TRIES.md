# pizauth lab — attempt log

Every build / smoke / live try (success **and** failure). Timestamps UTC.

| When (UTC) | Attempt | Command | Result | Notes |
|------------|---------|---------|--------|-------|
| 2026-09-20T11:52Z | BUILD docker (rust:1.85) | `./smoke.sh` → `docker build` | **FAIL** | Deps need rustc ≥1.89 (`darling`/`wincode`) |
| 2026-09-20T11:54Z | BUILD docker (rust:1.89, ref=master) | `./smoke.sh` | **FAIL** | Unstable `Duration::from_mins` on master tip |
| 2026-09-20T11:57Z | BUILD docker (rust:1.96, tag=`pizauth-1.1.0`) | `./smoke.sh` | **PASS** (ephemeral) | Socket + `info`/`status` + `:14204` + `show` auth URL; container exits after smoke |
| 2026-09-20T12:00Z | SMOKE Modal | `EXT_TOOLS_RUNTIME=modal ./smoke.sh` | **PASS** (ephemeral) | Same checks inside Modal; app stops when entrypoint ends. Run: https://modal.com/apps/neomatrix369/main/ap-5JVJpcpoL5juWTDUpMEgoU |
| 2026-09-20T12:05:09Z | **LIVE** compose | `docker compose --profile pizauth up -d --build` | **PASS LIVE-RUNNING** | Container `external-tools-sandbox-pizauth-1` Up; host `curl :14204` → HTTP 404 (listen OK); `pizauth info -j` → `server_running:true`; socket `pizauth.sock`; `status` → `lab: No access token` |
| 2026-09-20T12:06Z | LIVE health wait | `docker inspect` health after ~50s | **PASS** | `health=healthy running=true`; still listening on host `:14204` |

## LIVE verification (re-run anytime)

```bash
cd labs/external-tools-sandbox
docker compose --profile pizauth up -d --build
docker compose --profile pizauth ps pizauth
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:14204/   # expect 404
CID=$(docker compose --profile pizauth ps -q pizauth)
docker exec "$CID" pizauth info -j -c /config/pizauth.conf
docker exec "$CID" pizauth status
docker exec "$CID" ls -la /tmp/runtime/pizauth/pizauth.sock
```

Stop (when done inspecting):

```bash
docker compose --profile pizauth stop pizauth
# or: docker compose --profile pizauth down
```

## Modal note

Modal smoke proves build + ephemeral daemon. Long-lived Modal serve was **not** required once Docker compose stayed up. Prefer compose for inspection (`0.0.0.0:14204`).

## HITL / OAuth

Placeholders remain in `config/pizauth.conf` until real credentials are supplied.
| When (UTC) | Attempt | Command | Result | Notes |
|------------|---------|---------|--------|-------|
| 2026-09-20T12:20Z | OAuth env scan | repo `.env` + lab `.env` key-name scan | **NO CREDS** | No `PIZAUTH_*` / Google / Microsoft client keys; only `MODAL_*` / `SNYK_TOKEN` / `TESSL_TOKEN` present |
| 2026-09-20T12:20Z | LIVE re-probe | `curl :14204` + `info -j -c` + `status` + `show lab` | **PASS daemon** | healthy; `server_running:true`; `redirect_uri=http://localhost:14204/`; status → pending auth (placeholders) |
| 2026-09-20T12:21Z | oauth-setup no secrets | `./scripts/oauth-setup.sh` | **BLOCKED-HITL** exit 2 | Missing `PIZAUTH_PROVIDER` + `PIZAUTH_CLIENT_ID`; documents redirect URI |
| 2026-09-20T12:21Z | HITL scaffolding | QUESTIONS.md, `.env.example` keys, provider examples, gitignore `pizauth.local.conf`, compose `-c` from env | **DONE** | Ready once IdP + client secrets provided |

## OAuth progress

| Milestone | State |
|-----------|-------|
| Daemon LIVE `:14204` | **YES** |
| Auth URL generation (`show`) | **YES** (placeholder client) |
| Real `client_id`/`client_secret` | **NO** — HITL |
| Browser login + token in `status` | **NO** — blocked on credentials |
