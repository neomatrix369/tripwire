# pizauth lab (external tools sandbox)

> Upstream: [ltratt/pizauth](https://github.com/ltratt/pizauth/) — Command-line
> OAuth2 authentication daemon.
>
> **Runtime: both** (Docker primary for smoke; Modal alternate one-shot).

## What this lab proves

| Check | How | State |
|-------|-----|-------|
| Build / install | Multi-stage Dockerfile / Modal `rust_base` @ tag `pizauth-1.1.0` | BUILD PASS |
| Ephemeral smoke | `./smoke.sh` (docker or modal) | SMOKE PASS |
| **Live daemon** | `docker compose --profile pizauth up -d` or `./scripts/live-up.sh` | **LIVE-RUNNING** |
| Status / socket / listen | `pizauth info -j`, unix socket, HTTP `:14204` | Proven while Up |
| Auth URL (placeholders) | `pizauth show lab` → ERROR + authorisation URL | Proven |
| **Real OAuth token** | `oauth-setup.sh` + browser IdP login | **BLOCKED-HITL** |

## Bring it LIVE (preferred)

```bash
cd labs/external-tools-sandbox
./pizauth/scripts/live-up.sh
# leaves container healthy on http://127.0.0.1:14204/
# stop: docker compose --profile pizauth stop pizauth
```

Attempt log: [`TRIES.md`](./TRIES.md) · HITL asks: [`QUESTIONS.md`](./QUESTIONS.md)

## OAuth token (HITL)

pizauth supports any OAuth2 IdP with auth/token URIs. This lab ships templates for:

| Provider | Console | Redirect URI to register |
|----------|---------|--------------------------|
| **Microsoft** / Entra / Office 365 | Azure App registration | `http://localhost:14204/` |
| **Google** / Gmail | Google Cloud → Credentials (Web client) | `http://localhost:14204/` |

Examples (no secrets): `config/pizauth.conf.example.microsoft`,
`config/pizauth.conf.example.google`.

### Steps

1. Create an OAuth client at Google or Microsoft; add redirect URI
   **`http://localhost:14204/`** (exact, including trailing `/`).
2. Copy `labs/external-tools-sandbox/.env.example` → `.env` and set:
   - `PIZAUTH_PROVIDER=google` or `microsoft`
   - `PIZAUTH_CLIENT_ID` / `PIZAUTH_CLIENT_SECRET`
   - optional `PIZAUTH_ACCOUNT_EMAIL`
3. Run setup (writes gitignored `config/pizauth.local.conf`, recreates daemon):

```bash
cd labs/external-tools-sandbox
./pizauth/scripts/oauth-setup.sh
# optional: PIZAUTH_OAUTH_WAIT_SECS=300 ./pizauth/scripts/oauth-setup.sh
```

4. Open the printed authorisation URL in a browser; complete login.
5. Prove token:

```bash
CID=$(docker compose --profile pizauth ps -q pizauth)
docker exec "$CID" pizauth status    # must NOT say "No access token"
docker exec "$CID" pizauth show lab  # prints access token (keep private)
```

**Never commit** `.env` or `config/pizauth.local.conf`.

## Quick smoke (ephemeral — exits after checks)

```bash
cd labs/external-tools-sandbox/pizauth
./smoke.sh
# Modal:
EXT_TOOLS_RUNTIME=modal ./smoke.sh
```

## Layout

```
pizauth/
├── Dockerfile
├── modal_app.py
├── smoke.sh
├── QUESTIONS.md              # HITL credential asks
├── config/pizauth.conf       # placeholders only
├── config/pizauth.conf.example.{microsoft,google}
├── scripts/live-up.sh
├── scripts/oauth-setup.sh    # waits for env → local conf → browser URL
├── scripts/container-smoke.sh
├── .env.example
└── README.md
```

## Secrets policy

- **Never** commit real OAuth client secrets.
- Lab config uses `lab-placeholder-client-id` / `lab-placeholder-client-secret`.
- Real creds → `.env` + `oauth-setup.sh` → gitignored `pizauth.local.conf`.

## Notes

- Build pins upstream tag **`pizauth-1.1.0`** and Docker builder image
  **`rust:1.96-bookworm`**.
- Server must run with `-d` in containers (no syslog detach).
- Socket path: `$XDG_RUNTIME_DIR/pizauth/pizauth.sock`.
- Live `pizauth show` emits `redirect_uri=http://localhost:14204/` when listen
  port is `14204` — register that URI at the IdP.
- Compose service `pizauth` is in the shared `docker-compose.yml`
  (profile `pizauth` / `all`).
