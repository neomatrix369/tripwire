# Who-Targets-Me smoke evidence

| Field | Value |
|-------|--------|
| Date | 2026-09-20 |
| Verdict | **PARTIAL LIVE** — BUILD PASS + extension loaded / `web-ext` started in Docker. Facebook login = **HITL** (blocks full LIVE). |
| Runtime | docker (`who-targets-me:lab`) |
| Build | `./smoke.sh` → `WTM_BUILD_OK` chrome+firefox `manifest.json` |
| LIVE probes | `./live-try.sh` + web-ext/xauth retry — see [`TRIES.md`](./TRIES.md) |
| Result lines | Probe A: Chromium `--load-extension` dump-dom OK; Probe B: `Running web extension from /app/build/chrome` (rc=124 timeout); Probe C: FB = HITL |
| Image | `node:20-bookworm-slim` + upstream clone @ master (`@whotargetsme/who-targets-me@1.15.0`); live probes apt-install Chromium 153 + xvfb + xauth |
| Notes | Webpack size warnings only (non-fatal). `smoke.sh` remains build-only; `live-try.sh` is optional LIVE probe. |

Full logs: `smoke-logs/` (gitignored).
