# snare — attempt log

Goal: **LIVE** listening daemon + signed ping (fixture secret OK).

## Try: docker-desktop-ps — 2026-09-20T12:05:51Z

```
$ docker ps
permission denied while trying to connect to the docker API at unix://$HOME/.orbstack/run/docker.sock
```

## Try: orbstack-docker-ps — 2026-09-20T12:05:51Z

```
$ DOCKER_HOST=orbstack docker ps
permission denied while trying to connect to the docker API at unix://$HOME/.orbstack/run/docker.sock
```

## Try: modal-app-list — 2026-09-20T12:06:49Z

```
$ modal app list
╭─ Error ──────────────────────────────────────────────────────────────────────╮
│ 403 Forbidden                                                                │
╰──────────────────────────────────────────────────────────────────────────────╯
```

## Try: fetch-snare-tarball — 2026-09-20T12:06:49Z

```
$ curl codeload ... | tar
OK Cargo.toml present
```

## Try: cargo-build-release — 2026-09-20T12:06:53Z

```
$ cargo build --release
FAIL exit=101
error: failed to read .../.vendor/cargo-home/registry/.../hex-0.4.3/Cargo.toml
```

## Try: smoke-all Modal then Docker — 2026-09-20T12:04:30Z

| Step | Result |
|------|--------|
| Modal `cargo install snare` | FAIL — crates.io package has no binaries; also Modal API flaky/403 |
| Docker build + run `:18000` | **PASS** evidence: ping `HTTP/1.1 200`, bad sig `401` |
| Script EXIT trap | FAIL — `name: unbound variable` under `set -u` after `run_docker` returned → smoke-all reported FAIL |

Evidence: `.smoke-evidence/smoke-20260920T120430Z.json` (`status: PASS`).

## Try: restore wiped lab sources — 2026-09-20T12:08Z

Sibling wiped Dockerfile/smoke/config/prps/modal/README. Restored from prior agent transcript. Trap fixed (`SNARE_SMOKE_NAME`). Prefer Docker when Modal tokens empty.

## Try: docker smoke re-run — 2026-09-20T12:09:09Z

```
$ EXT_TOOLS_RUNTIME=docker ./smoke.sh
RESULT: PASS (exit 0)
```

## Try: long-lived LIVE container — 2026-09-20T12:09:14Z

```
$ docker run -d --name ext-tools-snare-live -p 18000:8000 ext-tools-snare:lab
signed ping → HTTP/1.1 200 OK
```

**Verdict: LIVE-RUNNING (docker on host :18000).** Modal unverified.

**Port lock (DECIDED):** Graphiti=`:8000`, snare lab=`:18000` (compose/smoke default `SNARE_HOST_PORT=18000` → `18000:8000`). Do **not** free Graphiti’s `:8000` or remap snare onto it.

## HITL

- Populate real Modal tokens if Modal path required
- Real GitHub webhook secret for non-lab hooks
- Port conflict with Graphiti: **resolved by KEEP snare on :18000** (no further action)

## Try: resolve-snare-port KEEP :18000 — 2026-09-20T12:20:21Z

User decision: **KEEP snare on host `:18000`**. Do **not** free/take Graphiti’s `:8000`.

| Check | Result |
|-------|--------|
| Compose default `SNARE_HOST_PORT` | already `${SNARE_HOST_PORT:-18000}:8000` |
| `smoke.sh` default | `HOST_PORT="${SNARE_HOST_PORT:-18000}"` |
| Docs lock (README / INVENTORY / STATUS / TRIES / sandbox README / `.env.example`) | Graphiti=`:8000`, snare=`:18000` — do not change |
| Live container | `ext-tools-snare-live` Up `0.0.0.0:18000->8000/tcp` |
| Graphiti undisturbed | `docker-graphiti-mcp-1` `0.0.0.0:8000->8000/tcp` |
| Signed ping `:18000` | **HTTP/1.1 200 OK** |
| Bad signature `:18000` | **HTTP/1.1 401** |

Evidence curl (repo-shaped body + fixture secret):

```
$ curl -sS -D- -o /dev/null -X POST http://127.0.0.1:18000/payload \
    -H 'Content-Type: application/json' \
    -H 'X-GitHub-Event: ping' \
    -H "X-Hub-Signature-256: sha256=<hmac-sha256(secretsecret, body)>" \
    --data-binary @- <<'JSON'
{ "repository": { "owner": { "login": "testuser" }, "name": "testrepo" } }
JSON
HTTP/1.1 200 OK
```

**Verdict: port conflict RESOLVED by KEEP `:18000`. LIVE ping re-verified.**
