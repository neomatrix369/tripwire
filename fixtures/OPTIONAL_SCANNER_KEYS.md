# Modal scanner-secret reference

This is the operational reference for `tripwire-scan-secrets`: the optional
scanner credentials that `./scripts/setup-modal.sh` may sync from `.env`.

For provider accounts, key procurement, and the full `.env` reference, use
[env-vars.md](../docs/user-guide/env-vars.md). Supabase platform credentials
are documented separately in [supabase-setup.md](../docs/user-guide/supabase-setup.md).

## Scanner-secret allowlist

`setup-modal.sh` copies only non-empty values for these keys. A missing value
skips that scanner engine (`skipped_missing_credential`); it never creates a
placeholder token.

| Scanner capability | Keys synced to `tripwire-scan-secrets` |
|---|---|
| Snyk scanning | `SNYK_TOKEN` |
| Tessl quality score | `TESSL_TOKEN`, `TESSL_WORKSPACE` |
| Cisco Skill Scanner LLM | `SKILL_SCANNER_LLM_API_KEY`, `SKILL_SCANNER_LLM_MODEL`, `SKILL_SCANNER_LLM_PROVIDER`, `SKILL_SCANNER_LLM_BASE_URL` |
| Cisco MCP Scanner LLM | `MCP_SCANNER_LLM_API_KEY`, `MCP_SCANNER_LLM_MODEL`, `MCP_SCANNER_LLM_BASE_URL` |
| Cisco AI Defense | `AI_DEFENSE_API_KEY`, `MCP_SCANNER_API_KEY`, `MCP_SCANNER_ENDPOINT` |

Scanner environment variable names stay upstream. Do not add `TRIPWIRE_*` or
`CISCO_AI_DEFENSE_API_KEY` aliases.

## Sync the secrets

```bash
./scripts/setup-modal.sh --secrets-only
```

Use `./scripts/setup-modal.sh` to sync secrets and deploy the scan app. Both
commands read the repository-root `.env`, use the allowlist above, and never
echo values.

## Manual fallback

Use this only when the helper script cannot run. `tripwire-supabase` is a
separate, required platform secret; it is included here only because the
manual fallback creates both Modal secrets.

```bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
modal secret create tripwire-supabase \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --force

modal secret create tripwire-scan-secrets \
  SNYK_TOKEN="$SNYK_TOKEN" \
  TESSL_TOKEN="$TESSL_TOKEN" \
  TESSL_WORKSPACE="$TESSL_WORKSPACE" \
  SKILL_SCANNER_LLM_API_KEY="$SKILL_SCANNER_LLM_API_KEY" \
  SKILL_SCANNER_LLM_MODEL="$SKILL_SCANNER_LLM_MODEL" \
  SKILL_SCANNER_LLM_PROVIDER="$SKILL_SCANNER_LLM_PROVIDER" \
  SKILL_SCANNER_LLM_BASE_URL="$SKILL_SCANNER_LLM_BASE_URL" \
  MCP_SCANNER_LLM_API_KEY="$MCP_SCANNER_LLM_API_KEY" \
  MCP_SCANNER_LLM_MODEL="$MCP_SCANNER_LLM_MODEL" \
  MCP_SCANNER_LLM_BASE_URL="$MCP_SCANNER_LLM_BASE_URL" \
  AI_DEFENSE_API_KEY="$AI_DEFENSE_API_KEY" \
  MCP_SCANNER_API_KEY="$MCP_SCANNER_API_KEY" \
  MCP_SCANNER_ENDPOINT="${MCP_SCANNER_ENDPOINT:-https://us.api.inspect.aidefense.security.cisco.com/api/v1}" \
  --force
```

If no scanner keys are set, `./scripts/setup-modal.sh --secrets-only` leaves
`tripwire-scan-secrets` unchanged and syncs only Supabase secrets.
