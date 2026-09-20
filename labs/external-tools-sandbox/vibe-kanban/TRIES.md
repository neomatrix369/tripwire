# vibe-kanban — try log

Do not commit secrets. Record outcomes only (pass/fail/skip + opaque reason).

## 2026-09-20T12:05:12Z — Docker Compose LIVE

| Field | Value |
|-------|-------|
| Attempt | `docker compose --profile vibe-kanban up -d --build` |
| Result | **PASS** — LIVE-RUNNING |
| Probe | `GET http://127.0.0.1:3000/` → HTTP **200** (try 2); re-probe after 2s → **200**; health → **healthy** |
| Container | `external-tools-sandbox-vibe-kanban-1` Up (healthy), `0.0.0.0:3000->3000/tcp` |
| Body | HTML UI (`<!DOCTYPE html>`, vibe-kanban favicon) |
| Notes | Profile-scoped start only; did not stop sibling containers |

Prior smoke (ephemeral `docker run`): see `smoke-evidence.txt` — HTTP 200 at host port 13000 (2026-09-20T11:56:25Z).

## 2026-09-20T12:05:12Z — Modal

| Field | Value |
|-------|-------|
| Attempt | `modal run ./modal_app.py` |
| Result | **SKIPPED** |
| Reason | `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` not active in repo `.env` (commented placeholders only; no live values). Per gate: retry Modal only when tokens available. |
| Secrets | not printed |

---

## Verdict

**LIVE-RUNNING (docker):** UI listening on `:3000`, healthy, HTTP 200 confirmed.
**Modal:** unverified this session (tokens unavailable).
