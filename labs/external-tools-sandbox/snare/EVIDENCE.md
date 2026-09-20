# snare — evidence (2026-09-20)

## Verdict

**PASS** — BUILD + LIVE-RUNNING

| Check | Result | Evidence |
|-------|--------|----------|
| Rust build | PASS (Docker multi-stage) | `docker build -t ext-tools-snare:lab` |
| Daemon listening | PASS | `ext-tools-snare-live` `0.0.0.0:18000->8000/tcp` |
| Signed ping | PASS | `HTTP/1.1 200 OK` |
| Bad signature | PASS | `HTTP/1.1 401` |
| Modal | FAIL 403 | Prefer Docker for this tool |

## Live endpoint

- Container: `ext-tools-snare-live` (`--restart unless-stopped`)
- URL: `http://127.0.0.1:18000/payload` (any POST path accepted)
- Secret (lab fixture only): `secretsecret`
- **Port lock:** Graphiti host `:8000`; snare lab host `:18000` → container `:8000` (do not change)

## Artefacts

- `.smoke-evidence/live-ping.json`
- `.smoke-evidence/container-logs.tail.txt`
- `.smoke-evidence/docker-build.log`
- `TRIES.md`

## Re-prove

```bash
cd labs/external-tools-sandbox/snare
./smoke.sh
# or
curl -sS -D- -o /dev/null -X POST http://127.0.0.1:18000/payload \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: ping' \
  -H "X-Hub-Signature-256: sha256=$(python3 -c 'import hmac,hashlib; print(hmac.new(b"secretsecret", open(0,"rb").read(), hashlib.sha256).hexdigest())')" \
  --data-binary @- <<'JSON'
{
 "repository": {
 "owner": {
 "login": "testuser"
 },
 "name": "testrepo"
 }
}
JSON
```
