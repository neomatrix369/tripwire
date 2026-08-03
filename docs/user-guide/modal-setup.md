# Modal setup

> Security experts only. Complete [supabase-setup](./supabase-setup.md) and fill platform keys in `.env` first.

## 1. Account + CLI

1. Create an account at [modal.com](https://modal.com).
2. Install and authenticate:

```bash
pip install modal
modal setup
# Prefer interactive login. Tokens (MODAL_TOKEN_ID / MODAL_TOKEN_SECRET) are optional.
```

## 2. One-shot sync + deploy

From repo root, with a filled `.env`:

```bash
./scripts/setup-modal.sh
```

What it does:

1. Reads allowlisted non-empty keys from `.env` (never prints values).
2. Syncs Modal secrets `tripwire-supabase` + `tripwire-scan-secrets` (`--force`).
3. Deploys `sandbox/scan_app.py`.

Useful flags:

| Flag | Effect |
|------|--------|
| `--secrets-only` | Sync secrets; skip deploy |
| `--deploy-only` | Deploy only (auth still checked) |
| `--non-interactive` | Fail if not authenticated and tokens unset |
| `--env-file PATH` | Use a non-default env file |

Allowlist detail: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).

## 3. Verify

```bash
modal app list
# Expect tripwire-scan (or your deployed app name) after a successful deploy
```

Then run a fixture scan and Live dashboard per [QUICKSTART → Security experts](../../QUICKSTART.md#security-experts).

## Next

→ [env-vars.md](./env-vars.md) (procurement SSOT) · back to [prerequisites](./prerequisites.md)
