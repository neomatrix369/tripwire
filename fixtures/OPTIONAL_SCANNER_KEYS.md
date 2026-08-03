# Optional scanner depth keys

Use this file as a setup reference. Add keys only when you are ready to enable optional scanners.

## Environment/key naming convention

- Product CLI is `tripwire`.
- Env key names stay upstream (Cisco / Snyk / Tessl).
- Modal secret names are Tripwire-owned:
  - `tripwire-supabase`
  - `tripwire-scan-secrets`
- Do **not** invent `TRIPWIRE_*` or `CISCO_AI_DEFENSE_API_KEY` aliases for scanner tools.

MVP already has `SNYK_TOKEN` in Modal secret `tripwire-scan-secrets`.
These unlock deeper engines.
Missing keys skip only that engine (`skipped_missing_credential`), never invent tokens.

## Tier B (Semantic — recommended MVP)

Cisco LLM engines are LiteLLM BYO. The key must match `MODEL` (and `BASE_URL` when needed).

- **Defaults when model is unset**
  - Cisco Skill Scanner → Anthropic
  - Cisco MCP Scanner → OpenAI (`gpt-4o`)

### Skill scanner

- `SKILL_SCANNER_LLM_API_KEY`
- `SKILL_SCANNER_LLM_MODEL`
- `SKILL_SCANNER_LLM_PROVIDER`
- `SKILL_SCANNER_LLM_BASE_URL`

Used with: `tripwire scan --use-llm`.

### MCP scanner

- `MCP_SCANNER_LLM_API_KEY`
- `MCP_SCANNER_LLM_MODEL`
- `MCP_SCANNER_LLM_BASE_URL`
- `MCP_SCANNER_LLM_API_VERSION` (optional)

Used with: `tripwire mcp --behavioral`.

The same API key value may be used for both `*_API_KEY` variables.

### Tessl quality score scanner

- `TESSL_TOKEN` — required for headless/Modal quality-score flow
  - Not the short device code from `tessl login`.
  - Local smoke test: `tessl login` (browser SSO) is sufficient.
  - Modal/CI: create a workspace API key after SSO (`tessl api-key create --workspace <name>` or via Tessl UI).
- `TESSL_WORKSPACE` — optional; scanners default to `default`

## Tier C (Full depth — paid Cisco AI Defense)

- `AI_DEFENSE_API_KEY` — Cisco Skill Scanner `--use-aidefense`
- `MCP_SCANNER_API_KEY` — Cisco MCP Scanner AI Defense cloud inspect
- `MCP_SCANNER_ENDPOINT` — US default: `https://us.api.inspect.aidefense.security.cisco.com/api/v1`
- `AI_DEFENSE_API_URL` — optional

## Platform plumbing (Phase 0/1)

Separate secret: `tripwire-supabase`

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` — for local / `tripwire setup` DDL only (not Modal)
  - Use session pooler URI when direct `db.<ref>.supabase.co` fails DNS (project paused / IPv6)

## Vendor account setup + key procurement

Use this section when you need explicit procurement flow for each vendor.

## Snyk

1. Open [Snyk](https://app.snyk.io) and create or sign in.
2. Go to **Settings → API Tokens**.
3. Create a token and set it as `SNYK_TOKEN`.

Set when `tripwire scan` uses Snyk-enabled flows (scanner mode from your CLI path).

## Tessl

1. Open [Tessl](https://tessl.io), create/sign in.
2. Run `tessl login` (browser SSO for local smoke).
3. Create a workspace API key:
   - `tessl api-key create --workspace <name>`
4. Set `TESSL_TOKEN` and optional `TESSL_WORKSPACE`.

## Cisco scanner integrations

1. Open [Cisco Developer / Security site](https://developer.cisco.com).
2. Create/access Security Cloud or AI Defense credentials.
3. Set:
   - `SKILL_SCANNER_LLM_API_KEY` + `SKILL_SCANNER_LLM_MODEL` + optional provider fields for `tripwire scan --use-llm`
   - `MCP_SCANNER_LLM_API_KEY` + `MCP_SCANNER_LLM_MODEL` + optional provider fields for `tripwire mcp --behavioral`
4. For Tier C paid AI Defense:
   - `AI_DEFENSE_API_KEY` (Skill Scanner `--use-aidefense`)
   - `MCP_SCANNER_API_KEY` + `MCP_SCANNER_ENDPOINT`
   - Optional `AI_DEFENSE_API_URL`

Missing values are allowed: missing credentials skip that scanner engine.

## Updating secrets

Prefer the helper script:

```bash
./scripts/setup-modal.sh --secrets-only
```

Or full bootstrap:

```bash
./scripts/setup-modal.sh
```

The script reads repo-root `.env`, keeps only non-empty allowlisted keys (listed above), and overwrites Modal secrets with `--force`.
It never echoes values.

## Manual CLI fallback (same allowlist)

```bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
modal secret create tripwire-supabase \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --force

modal secret create tripwire-scan-secrets \
  SNYK_TOKEN="$SNYK_TOKEN" \
  TESSL_TOKEN="$TESSL_TOKEN" \
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

If no scanner keys are set, `./scripts/setup-modal.sh --secrets-only` leaves `tripwire-scan-secrets` unchanged and only syncs Supabase secrets.
```

## Key reminder

Upstream scanner keys above are canonical.
