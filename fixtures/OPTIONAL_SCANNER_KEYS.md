# Modal scanner-secret reference

This is the operational reference for `tripwire-scan-secrets`: the scanner
credentials that `./scripts/setup-modal.sh` may sync from `.env`.

For every provider account, credential value, and environment-variable meaning,
use [env-vars.md](../docs/user-guide/env-vars.md). This file owns only the
Modal secret allowlist and its manual CLI fallback.

## Scope boundary

Do not use this file to choose providers, create accounts, obtain credentials,
or determine `.env` values. Those decisions belong exclusively to
[env-vars.md](../docs/user-guide/env-vars.md). The key names below are repeated
only to define the subset that can be copied into the Modal scanner secret; they
are not a second key catalogue.

## Scanner-secret allowlist

`setup-modal.sh` copies only non-empty values for these keys. Configure every
listed capability for the recommended complete Live setup. A missing value safely
skips that scanner engine (`skipped_missing_credential`); it never creates a
placeholder token, but this is a degraded diagnostic path.

| Scanner capability | Keys synced to `tripwire-scan-secrets` |
|---|---|
| Snyk scanning | `SNYK_TOKEN` |
| Tessl quality score | `TESSL_TOKEN`, `TESSL_WORKSPACE` |
| Cisco Skill Scanner LLM | `SKILL_SCANNER_LLM_API_KEY`, `SKILL_SCANNER_LLM_MODEL`, `SKILL_SCANNER_LLM_PROVIDER`, `SKILL_SCANNER_LLM_BASE_URL`, `SKILL_SCANNER_LLM_API_VERSION` |
| Cisco MCP Scanner LLM | `MCP_SCANNER_LLM_API_KEY`, `MCP_SCANNER_LLM_MODEL`, `MCP_SCANNER_LLM_BASE_URL`, `MCP_SCANNER_LLM_API_VERSION` |
| Cisco AI Defense | `AI_DEFENSE_API_KEY`, `AI_DEFENSE_API_URL`, `MCP_SCANNER_API_KEY`, `MCP_SCANNER_ENDPOINT` |

Scanner environment variable names stay upstream. Do not add `TRIPWIRE_*` or
`CISCO_AI_DEFENSE_API_KEY` aliases.

## Sync the secrets

```bash
./scripts/setup-modal.sh --secrets-only
```

Use `./scripts/setup-modal.sh` to sync secrets and deploy the scan app. Both
commands read the repository-root `.env`, use the allowlist above, and never
echo values.

## No manual secret command

Do not replace `./scripts/setup-modal.sh --secrets-only` with a hand-written
`modal secret create ... --force` command. The helper filters empty scanner
values before updating `tripwire-scan-secrets`; a manual command can overwrite
an existing value with a blank one.

If no scanner keys are set, the helper leaves `tripwire-scan-secrets` unchanged
and syncs only the required Supabase secret.
