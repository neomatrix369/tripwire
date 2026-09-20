# pizauth OAuth — HITL questions

**Status: BLOCKED-HITL** — daemon is LIVE on `:14204`, but no real
`client_id` / `client_secret` was found in repo `.env` or lab `.env`.

Answer these so the next pass can reach **OAuth LIVE** (token via
`pizauth status` / `pizauth show`).

---

## Required

1. **Which IdP?**  
   - [ ] Google (Gmail / Google Cloud OAuth client)  
   - [ ] Microsoft (Entra ID / Azure AD / Office 365)  
   - [ ] Other (name + auth/token URI): _______________

2. **Client credentials** (put in `labs/external-tools-sandbox/.env` — never commit):
   - `PIZAUTH_CLIENT_ID=` …
   - `PIZAUTH_CLIENT_SECRET=` … (omit only if IdP allows public/native client)
   - `PIZAUTH_ACCOUNT_EMAIL=` … (optional `login_hint`)

3. **Redirect URI you will register in the IdP console** (must match exactly):
   - Recommended for this lab: `http://localhost:14204/`
   - Alternate (same host listen): `http://127.0.0.1:14204/`  
     Prefer **one** and register that one; pizauth emits `http://localhost:14204/` by default when `http_listen` uses port `14204`.

4. **Scopes** (defaults below — change if your app needs fewer/more):
   - Microsoft: IMAP + SMTP + `offline_access` (see README)
   - Google: `https://mail.google.com/` (see README)

5. **Browser login**: will you complete the auth URL on this machine’s
   default browser, or paste a URL into another browser and rely on the
   callback hitting this host’s `:14204`?

---

## Not found (scanned)

| Location | OAuth / pizauth client keys |
|----------|-----------------------------|
| repo `.env` | No `PIZAUTH_*`, `GOOGLE_*`, `MICROSOFT_*`, or `*_CLIENT_ID` / `*_CLIENT_SECRET` for OAuth |
| `labs/external-tools-sandbox/.env` | Missing (not created) |
| `config/pizauth.conf` | Placeholders only (`lab-placeholder-client-id`) |

Present unrelated secrets in repo `.env` (names only): `MODAL_TOKEN_ID`,
`MODAL_TOKEN_SECRET`, `SNYK_TOKEN`, `TESSL_TOKEN` — not usable as IdP OAuth clients.

---

## After you answer

```bash
cd labs/external-tools-sandbox
# fill .env from .env.example (PIZAUTH_PROVIDER + CLIENT_*)
./pizauth/scripts/oauth-setup.sh
# complete browser login when prompted
docker exec "$(docker compose --profile pizauth ps -q pizauth)" pizauth status
```

Expected success: `pizauth status` shows an account with an access token
(not `No access token`).
