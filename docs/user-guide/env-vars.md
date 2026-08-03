# Environment variables

> Procurement SSOT for every key in [`.env.example`](../../.env.example).
> For the recommended complete Live setup, provision all five vendors before
> `cp .env.example .env`: [Supabase](./supabase-setup.md),
> [Modal](./modal-setup.md), Snyk, Tessl, and Cisco AI Defense.
> If a scanner credential is absent, the runtime safely reports
> `skipped_missing_credential` for that engine. Treat this as a degraded
> diagnostic path, not complete scan coverage.
>
> **Cost and billing:** creating accounts, provisioning resources, deploying
> Modal apps, and running Live scans can incur charges or consume provider
> quotas. Review billing and usage controls for all five vendors before
> proceeding; use the local Mock path when you do not intend to incur costs.
>
> Keep vendor account and key-procurement instructions on this page. The
> [setup command catalog](./setup-commands.md) owns command order; the
> [Modal scanner-secret reference](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
> owns only the Modal secret allowlist and safe sync behavior.

Companion allowlist: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).

## Scope boundary

This is the sole reference for provider accounts, credential procurement, every
`.env` key, and key-to-capability mapping. Do not duplicate those explanations
in the Modal secret reference. [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
only projects a selected subset of these already-defined keys into
`tripwire-scan-secrets`; repeated names there are operational allowlist entries,
not a second environment-variable schema.

## Platform plumbing

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `SUPABASE_URL` | Platform / Live / Modal HTTP | [supabase-setup](./supabase-setup.md) → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Live browser | [supabase-setup](./supabase-setup.md) → API → `anon` `public`; if needed use `scripts/serve-dashboard.mjs` proxy instead |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform writes + Modal | [supabase-setup](./supabase-setup.md) → API → `service_role` (server only) |
| `SUPABASE_DB_URL` | `tripwire setup` DDL | [supabase-setup](./supabase-setup.md) → Database → connection string (`postgresql://…`) |
| `MODAL_TOKEN_ID` | Non-interactive Modal setup | [modal-setup](./modal-setup.md) → Settings / Tokens or `modal token new` |
| `MODAL_TOKEN_SECRET` | Non-interactive Modal setup | [modal-setup](./modal-setup.md) → Settings / Tokens or `modal token new` |

## Tier B — Semantic (recommended MVP)

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `SNYK_TOKEN` | Snyk skill/MCP depth | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `SKILL_SCANNER_LLM_API_KEY` | Cisco Skill Scanner `--use-llm` | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `SKILL_SCANNER_LLM_MODEL` | Skill LLM routing | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `SKILL_SCANNER_LLM_PROVIDER` | Custom / OpenAI-compatible | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `SKILL_SCANNER_LLM_BASE_URL` | Custom LLM endpoint | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `SKILL_SCANNER_LLM_API_VERSION` | Azure-style APIs | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_LLM_API_KEY` | Cisco MCP Scanner `behavioral` | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_LLM_MODEL` | MCP LLM routing | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_LLM_BASE_URL` | Custom MCP LLM endpoint | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_LLM_API_VERSION` | Azure-style APIs | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `TESSL_TOKEN` | Tessl on Modal/CI | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `TESSL_WORKSPACE` | Tessl workspace name | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |

## Tier C — Full depth (paid Cisco AI Defense)

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `AI_DEFENSE_API_KEY` | Skill Scanner `--use-aidefense` | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `AI_DEFENSE_API_URL` | Custom AI Defense API host | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_API_KEY` | MCP Scanner cloud inspect | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |
| `MCP_SCANNER_ENDPOINT` | MCP inspect API base | [Vendor procurement quick-steps](#vendor-procurement-quick-steps) in this file |

## Wire into Modal

```bash
./scripts/setup-modal.sh
# or secrets only: ./scripts/setup-modal.sh --secrets-only
```

See [modal-setup.md](./modal-setup.md). The [Modal scanner-secret reference](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
explains the allowlist and why the helper must be used instead of a manual
secret-creation command.

## Vendor procurement quick-steps

- **Supabase (platform-required):** [supabase-setup](./supabase-setup.md)
  1. Sign in at [supabase.com/dashboard](https://supabase.com/dashboard), create or select a project.
  2. Copy `SUPABASE_URL` and API keys from **Project Settings → API**.
  3. Copy `SUPABASE_DB_URL` from **Project Settings → Database**.
- **Modal (platform required for live scan):** [modal-setup](./modal-setup.md)
  1. Sign in at [modal.com](https://modal.com).
  2. If using non-interactive setup: go to **Settings → Tokens** and create a token pair.
  3. Copy `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` from token details.
  4. If you only use interactive setup, skip both values and keep them blank.
- **Snyk:** open [app.snyk.io](https://app.snyk.io) → Settings → API Tokens and create/copy a token for `SNYK_TOKEN`.
- **Tessl:** open [tessl.io](https://tessl.io), create/login; use Tessl UI token page or `tessl api-key create --workspace <name>` for `TESSL_TOKEN`, and set `TESSL_WORKSPACE`.
- **Cisco AI Defense:** open [Cisco Developer](https://developer.cisco.com) and locate AI Defense credentials for:
  - `AI_DEFENSE_API_KEY`
  - `MCP_SCANNER_API_KEY`
  and optionally set `MCP_SCANNER_ENDPOINT` only for non-default hosts.
