# Environment variables

> Procurement SSOT for every key in [`.env.example`](../../.env.example).
> Platform: procure accounts ([supabase-setup](./supabase-setup.md), [modal-setup](./modal-setup.md)) **before** `cp .env.example .env`.
> Omit any key you do not have — missing → that engine only (`skipped_missing_credential`).

Companion allowlist: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).

## Platform plumbing

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `SUPABASE_URL` | Platform / Live / Modal HTTP | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Live browser (optional) | Supabase → API → `anon` `public`. Or skip and use `serve-dashboard.mjs` proxy |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform writes + Modal | Supabase → API → `service_role` (server only) |
| `SUPABASE_DB_URL` | `tripwire setup` DDL | Supabase → Database → connection string (`postgresql://…`). Prefer Session pooler if Direct DNS fails |
| `MODAL_TOKEN_ID` | Optional non-interactive Modal | Modal → Settings → Tokens (prefer `modal setup` login) |
| `MODAL_TOKEN_SECRET` | Optional non-interactive Modal | Same as above |

## Tier B — Semantic (recommended MVP)

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `SNYK_TOKEN` | Snyk skill/MCP depth | [Snyk](https://snyk.io) account → API token |
| `SKILL_SCANNER_LLM_API_KEY` | Cisco Skill Scanner `--use-llm` | Your LLM provider API key (must match MODEL) |
| `SKILL_SCANNER_LLM_MODEL` | Skill LLM routing | e.g. `anthropic/claude-sonnet-4-20250514` or `openai/gpt-4o` |
| `SKILL_SCANNER_LLM_PROVIDER` | Custom / OpenAI-compatible | Optional; e.g. `openai` for custom BASE_URL |
| `SKILL_SCANNER_LLM_BASE_URL` | Custom LLM endpoint | Optional provider base URL |
| `SKILL_SCANNER_LLM_API_VERSION` | Azure-style APIs | Optional; commented in `.env.example` |
| `MCP_SCANNER_LLM_API_KEY` | Cisco MCP Scanner `behavioral` | LLM key (hard-errors if subcommand enabled without it) |
| `MCP_SCANNER_LLM_MODEL` | MCP LLM routing | e.g. `gpt-4o` / `openai/gpt-4o` |
| `MCP_SCANNER_LLM_BASE_URL` | Custom MCP LLM endpoint | Optional |
| `MCP_SCANNER_LLM_API_VERSION` | Azure-style APIs | Optional; commented in `.env.example` |
| `TESSL_TOKEN` | Tessl on Modal/CI | After `tessl login`, `tessl api-key create --workspace <name>`. Local smoke can use browser SSO only |
| `TESSL_WORKSPACE` | Tessl workspace name | Optional; scanners default to `default` |

## Tier C — Full depth (paid Cisco AI Defense)

| Key | Required for | Where to get it |
|-----|--------------|-----------------|
| `AI_DEFENSE_API_KEY` | Skill Scanner `--use-aidefense` | Security Cloud Control → AI Defense UI (`X-Cisco-AI-Defense-API-Key`) |
| `AI_DEFENSE_API_URL` | Custom AI Defense API host | Optional override; commented in `.env.example` |
| `MCP_SCANNER_API_KEY` | MCP Scanner cloud inspect | Same AI Defense UI |
| `MCP_SCANNER_ENDPOINT` | MCP inspect API base | Default in `.env.example`: US Cisco inspect endpoint |

## Optional (any tier)

No additional optional scanner keys are currently documented for this repository. Add them only after they are supported in code and scripts.

## Wire into Modal

```bash
./scripts/setup-modal.sh
# or secrets only: ./scripts/setup-modal.sh --secrets-only
```

See [modal-setup.md](./modal-setup.md). Manual CLI fallback is documented in [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md).
