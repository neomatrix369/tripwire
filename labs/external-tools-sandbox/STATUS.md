# External tools sandbox — status board

<!--
Sibling agents update **only their own row**. Shared infra owner updates
the Shared row and keeps the table structure stable.

Status: PENDING | IN_PROGRESS | PASS | PARTIAL | FAIL | BLOCKED_HITL
Runtime: modal | docker | both | undecided
-->

| Tool | Status | Runtime | Evidence / notes | Updated |
|------|--------|---------|------------------|---------|
| Shared infra | PASS | n/a | Folder, compose, smoke-all, `.env.example`, shared helpers; see `INVENTORY.md` + `TRIES.md` | 2026-09-20 |
| vibe-kanban | PASS | docker | **LIVE-RUNNING** compose healthy `:3000` HTTP 200 (re-probed 12:11Z). Modal SKIPPED (empty `MODAL_TOKEN_*`). | 2026-09-20 |
| who-targets-me | PARTIAL | docker | BUILD PASS chrome+firefox; **PARTIAL LIVE** via `live-try.sh` (Chromium `--load-extension` + web-ext/Xvfb). FB login = HITL. | 2026-09-20 |
| pizauth | BLOCKED_HITL | both | Daemon **LIVE-RUNNING** `:14204`. OAuth = **BLOCKED-HITL** (no client_id/secret). Scaffold: `oauth-setup.sh`, QUESTIONS.md, redirect `http://localhost:14204/`. | 2026-09-20 |
| snare | PASS | docker | **LIVE-RUNNING** `ext-tools-snare-live` `:18000` signed ping 200 / bad-sig 401. Modal blocked (403 / crates.io). **Port lock:** Graphiti=`:8000`, snare lab=`:18000` — do not change. | 2026-09-20 |

## Smoke command

```bash
./labs/external-tools-sandbox/scripts/smoke-all.sh
```

## Inventory

- [`INVENTORY.md`](./INVENTORY.md) — LIVE vs BUILD outcomes
- [`TRIES.md`](./TRIES.md) — aggregated attempt log
