# Evidence — pizauth lab

**Verdict: LIVE-RUNNING daemon + OAuth BLOCKED-HITL** — 2026-09-20

Upstream: [ltratt/pizauth](https://github.com/ltratt/pizauth/) @ tag `pizauth-1.1.0`

| Layer | Status | Evidence |
|-------|--------|----------|
| BUILD | PASS | Docker image + Modal image compile `pizauth` 1.1.0 |
| SMOKE (ephemeral) | PASS | Docker `./smoke.sh` and Modal `EXT_TOOLS_RUNTIME=modal ./smoke.sh` |
| **LIVE-RUNNING** | **PASS** | compose healthy `:14204`, `server_running:true` |
| OAuth token | **BLOCKED-HITL** | No client credentials in env; `oauth-setup.sh` exit 2 |

## LIVE-RUNNING probe (2026-09-20T12:20Z UTC)

```text
NAME                               STATUS                    PORTS
external-tools-sandbox-pizauth-1   Up (healthy)              0.0.0.0:14204->14204/tcp

host curl http://127.0.0.1:14204/  → http_code=404
pizauth info -j -c /config/pizauth.conf → server_running:true, http_port=14204
pizauth status → lab: Access token pending authentication
pizauth show lab → auth URL with redirect_uri=http://localhost:14204/
```

## OAuth prep (no secrets)

- `.env.example` keys: `PIZAUTH_PROVIDER`, `PIZAUTH_CLIENT_ID`, `PIZAUTH_CLIENT_SECRET`, …
- `scripts/oauth-setup.sh` → gitignored `config/pizauth.local.conf`
- Provider examples: `config/pizauth.conf.example.{google,microsoft}`
- HITL asks: [`QUESTIONS.md`](./QUESTIONS.md)

## Reproduce daemon

```bash
cd labs/external-tools-sandbox
./pizauth/scripts/live-up.sh
```

Full attempt history: [`TRIES.md`](./TRIES.md)
