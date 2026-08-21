# Modal setup

> Required for Live scans that use Modal. Complete [supabase-setup](./supabase-setup.md)
> and fill platform keys in `.env` first.

## 1. Account + CLI

1. Create an account at [modal.com](https://modal.com).
2. Install and authenticate:

```bash
pip install modal
modal setup
# Prefer interactive login. Tokens (MODAL_TOKEN_ID / MODAL_TOKEN_SECRET) are required only for non-interactive setups.
```

## 2. Optional non-interactive token pair (for CI/non-interactive runs)

If you need `./scripts/setup-modal.sh --non-interactive`, procure these from your
Modal account and set both values in `.env`:

1. Sign in at [modal.com](https://modal.com).
2. Go to **Settings → Tokens**.
3. Create a new token pair and copy values.

You can also run:

```bash
modal token new
```

and copy the token ID and token secret returned by the CLI.

Keep this pair empty if you use interactive `modal setup`.

## 3. One-shot sync + deploy

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

Then run a fixture scan and Live dashboard per [QUICKSTART → Live](../../QUICKSTART.md#live-advanced).

## Next

→ [env-vars.md](./env-vars.md) (procurement SSOT) · optional router:
[tiered-router-setup.md](./tiered-router-setup.md) ·
back to [prerequisites](./prerequisites.md)
