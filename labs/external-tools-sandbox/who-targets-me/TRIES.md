# Who-Targets-Me — LIVE / PARTIAL try log

Append-only. Each attempt: timestamp (UTC), command, result, verdict notes.

Verdict vocabulary: **LIVE** | **PARTIAL LIVE** | **BUILD PASS** | **FAIL** | **HITL**

---

## 2026-09-20T12:04:00Z — baseline (prior evidence)

| Field | Value |
|-------|--------|
| Command | `./smoke.sh` (docker `who-targets-me:lab`) |
| Result | `WTM_BUILD_OK target=all`; chrome+firefox `manifest.json` present |
| Verdict | **BUILD PASS** |
| Notes | See `EVIDENCE.md` / `smoke-logs/smoke-20260920-125603.log`. Login/web-ext not exercised. |

---

## 2026-09-20T12:07:15Z — live-try.sh (Docker: apt chromium+xvfb, build chrome, probes A/B/C)

| Field | Value |
|-------|--------|
| Command | `WTM_LIVE_TIMEOUT=90 ./live-try.sh` |
| Log | `smoke-logs/live-try-20260920-120715.log` |
| Build | `WTM_BUILD_OK target=chrome` (Chromium 153.0.8010.52 bookworm) |
| Probe A | `chromium --headless=new --load-extension=build/chrome --dump-dom about:blank` → **OK** (exit 0, dump-dom written) |
| Probe B | `xvfb-run web-ext run --target chromium …` → **FAIL** (`xvfb-run: error: xauth command not found`, rc=3) |
| Probe C | Facebook login → **HITL** (not automated; no credentials) |
| Verdict | **PARTIAL LIVE** (`WTM_PARTIAL_LIVE`; load_ext=1 webext=0) |
| Notes | Extension flags accepted by Chromium headless. web-ext blocked by missing `xauth` package. Full FB session = HITL. |

---

## 2026-09-20T12:08:12Z — web-ext retry with xauth

| Field | Value |
|-------|--------|
| Command | `docker run --rm --entrypoint bash who-targets-me:lab -lc '… apt install chromium xvfb xauth …; xvfb-run web-ext run --target chromium --source-dir ./build/chrome …'` (timeout 90s) |
| Log | `smoke-logs/live-try-webext-20260920-120812.log` |
| Result | web-ext stdout: `Running web extension from /app/build/chrome`; `The extension will reload if any source file changes`; `Last extension reload: 12:08:38 GMT+0000`; process killed by `timeout` → rc=124 (expected while browser stays up) |
| Verdict | **PARTIAL LIVE** (`WEBEXT_STARTED=1`) |
| Notes | Confirms temporary extension load via web-ext under Xvfb inside Docker. No Facebook session → not full **LIVE**. |

---

## 2026-09-20T12:08:12Z — Facebook / full LIVE (same session, probe C)

| Field | Value |
|-------|--------|
| Command | N/A (no automated FB login) |
| Result | Skipped — requires interactive Facebook + WTM account |
| Verdict | **FAIL / HITL** for full **LIVE** |
| Notes | Keep PARTIAL LIVE from extension load / web-ext start. |

---

## Summary (latest)

| Layer | Status |
|-------|--------|
| npm build (chrome+firefox) | **BUILD PASS** |
| Chromium `--load-extension` in Docker | **PARTIAL LIVE** |
| `web-ext run` under Xvfb in Docker | **PARTIAL LIVE** |
| Facebook login / ad-targeting session | **HITL** (blocks full LIVE) |

**Overall: PARTIAL LIVE** (BUILD PASS + extension loaded / web-ext started; FB = HITL).

---

## 2026-09-20T12:11:00Z — smoke.sh regression check (build path intact)

| Field | Value |
|-------|--------|
| Command | `WTM_BUILD_TARGET=chrome ./smoke.sh` |
| Result | `WTM_BUILD_OK target=chrome`; exit 0 |
| Verdict | **BUILD PASS** (unchanged; `live-try.sh` did not break smoke path) |

## 2026-09-20T12:09:14Z — live-try.sh (PARTIAL LIVE)

| Field | Value |
|-------|--------|
| Command | `./live-try.sh` (Chromium + Xvfb + web-ext inside `who-targets-me:lab`) |
| Result | `WTM_LIVE_SUMMARY load_ext=1 webext=1 partial=1` → **WTM_PARTIAL_LIVE** |
| Probe A | chromium `--load-extension` headless dump-dom exit 0 |
| Probe B | web-ext under xvfb started / extension installed (rc=124 timeout expected) |
| Probe C | Facebook login — **HITL** (not automated) |
| Notes | Log: `smoke-logs/live-try-20260920-120914.log`. No long-running host daemon (extension artefact). |

### Verdict

**PARTIAL LIVE** (extension load path proven). Full LIVE needs interactive FB session / user browser.
