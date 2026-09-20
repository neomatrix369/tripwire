# Who Targets Me (lab)

Browser extension that surfaces political ad targeting on social media.

- Upstream: [WhoTargetsMe/Who-Targets-Me](https://github.com/WhoTargetsMe/Who-Targets-Me)
- **Runtime: docker** (primary). **Modal** optional for remote npm build only.
- Smoke bar: `npm run build:chrome` / `build:firefox` succeeds; artefacts under `build/<browser>/`.
- LIVE bar (optional): `./live-try.sh` — Chromium `--load-extension` + `web-ext` under Xvfb in Docker = **PARTIAL LIVE**. Facebook login = **HITL** (blocks full LIVE).

## Why Docker first

This is a **browser extension**. Meaningful interactive use needs a host browser
(`web-ext run`). Modal can still compile webpack artefacts in Linux; it cannot
replace a logged-in Facebook session. Prefer Compose/Docker for the lab smoke.

## Quick start (Docker)

From repo root (branch `lab/external-tools-sandbox`):

```bash
cd labs/external-tools-sandbox
./who-targets-me/smoke.sh
# or:
docker compose --profile who-targets-me up --build
```

Build one browser only:

```bash
WTM_BUILD_TARGET=chrome ./who-targets-me/smoke.sh
WTM_BUILD_TARGET=firefox ./who-targets-me/smoke.sh
```

Compose copies artefacts into the named volume `wtm-dist` (mounted at `/dist`).

## Optional Modal remote build

Requires Modal auth (`modal setup` or `MODAL_TOKEN_*` in lab `.env` — never commit secrets):

```bash
cd labs/external-tools-sandbox/who-targets-me
modal run modal_app.py --targets all
# or via smoke:
EXT_TOOLS_RUNTIME=modal ./smoke.sh
```

No Modal secrets are required for build-only smoke.

## LIVE probe (PARTIAL — Docker)

Build-only smoke is unchanged (`./smoke.sh`). Optional browser load:

```bash
./who-targets-me/live-try.sh
```

Installs Chromium + Xvfb (+ `xauth`) in the container, builds chrome, then:

1. `chromium --headless=new --load-extension=…`
2. `web-ext run --target chromium` under `xvfb-run`

Expect **PARTIAL LIVE** when web-ext prints `Running web extension from …`.
Facebook / WTM account login remains **HITL** — not automated.

Try log: [`TRIES.md`](./TRIES.md).

## Secrets

| Item | In git? | Notes |
|------|---------|--------|
| Facebook email/password | **No** | HITL only; placeholders in lab `.env.example` |
| WTM API keys | **No** | Not needed for build smoke |
| Modal tokens | **No** | Lab `.env` / `modal setup` |

Do not commit `vendor/` clones; the Dockerfile clones upstream at image build.

### Node version note

Upstream `.node-version` is **v16**. The lab image uses **Node 20 on
Debian bookworm** because `node:16-bullseye-slim` hit debian-security 404s on
arm64 during `apt-get install git`. Webpack 5 builds succeed with
`NODE_OPTIONS=--openssl-legacy-provider`.

## Layout

| File | Role |
|------|------|
| `Dockerfile` | Node 20 bookworm image; `git clone` + `npm ci` |
| `entrypoint.sh` | Runs `build:chrome` / `build:firefox`; verifies `manifest.json` |
| `smoke.sh` | Docker (default) or Modal **build** smoke |
| `live-try.sh` | Optional Docker Chromium / web-ext LIVE probe |
| `modal_app.py` | Optional remote build |
| `TRIES.md` | Append-only LIVE/PARTIAL try log |
| `EVIDENCE.md` | Dated PASS/PARTIAL record |
| `.env.example` | Tool-local pointers (optional; root lab `.env.example` is SSOT) |

## Status

See [`../STATUS.md`](../STATUS.md) row **who-targets-me** and [`EVIDENCE.md`](./EVIDENCE.md).
