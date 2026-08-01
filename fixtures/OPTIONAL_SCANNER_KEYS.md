# Optional scanner depth keys — add to Modal when ready
#
# Local template: `.env.example` (upstream Cisco / Snyk / Tessl key names)
#
# Naming: product CLI is `tripwire`. Env *keys* stay upstream. Modal secret *names*
# are Tripwire-owned (`tripwire-supabase`, `tripwire-scan-secrets`). Do not invent
# TRIPWIRE_* or CISCO_AI_DEFENSE_API_KEY env aliases for scanner tools.
#
# MVP already has SNYK_TOKEN in Modal secret `tripwire-scan-secrets`.
# These unlock deeper engines; omit until you have accounts/keys.
# Missing key → that engine only (`skipped_missing_credential`); never invent tokens.
#
# Tier B (Semantic — recommended MVP)
#   Cisco LLM engines are LiteLLM BYO — key must match MODEL (and BASE_URL when needed).
#   Defaults if MODEL unset: Cisco Skill Scanner → Anthropic; Cisco MCP Scanner → OpenAI (gpt-4o).
#   SKILL_SCANNER_LLM_API_KEY / _MODEL / _PROVIDER / _BASE_URL  — skill `--use-llm`
#   MCP_SCANNER_LLM_API_KEY / _MODEL / _BASE_URL [/ _API_VERSION] — mcp `behavioral`
#                                Same API key value can fill both *_API_KEY names.
#   TESSL_TOKEN                — Tessl skill quality_score (headless/Modal only).
#                                Not the short device code from `tessl login`.
#                                Local smoke: `tessl login` (browser SSO) is enough.
#                                Modal/CI: create workspace API key after SSO
#                                (`tessl api-key create --workspace <name>` or Tessl UI).
#
# Tier C (Full depth — paid Cisco AI Defense)
#   AI_DEFENSE_API_KEY         — Cisco Skill Scanner `--use-aidefense`
#   MCP_SCANNER_API_KEY        — Cisco MCP Scanner AI Defense cloud inspect
#   MCP_SCANNER_ENDPOINT       — US default:
#                                https://us.api.inspect.aidefense.security.cisco.com/api/v1
#   (optional) AI_DEFENSE_API_URL
#
# Optional (any tier)
#   VIRUSTOTAL_API_KEY         — binary hash checks; omit freely
#
# Platform plumbing (Phase 0/1 — separate Modal secret)
#   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → secret `tripwire-supabase`
#
# Update / recreate secrets when adding keys (preferred):
#
#   ./scripts/setup-modal.sh --secrets-only
#   # or full auth + secrets + deploy: ./scripts/setup-modal.sh
#
# The script reads repo-root `.env`, keeps only non-empty allowlisted keys
# (lists above), overwrites Modal secrets with `--force`, and never echoes values.
# Tier A (no scanner keys) gets sentinel TRIPWIRE_SCANNER_TIER=A so the secret
# is non-empty (Modal requires ≥1 key).
#
# Manual CLI fallback (same allowlist):
#
#   unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
#   modal secret create tripwire-supabase \
#     SUPABASE_URL="$SUPABASE_URL" \
#     SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
#     --force
#   modal secret create tripwire-scan-secrets \
#     SNYK_TOKEN="$SNYK_TOKEN" \
#     TESSL_TOKEN="$TESSL_TOKEN" \
#     SKILL_SCANNER_LLM_API_KEY="$SKILL_SCANNER_LLM_API_KEY" \
#     SKILL_SCANNER_LLM_MODEL="$SKILL_SCANNER_LLM_MODEL" \
#     SKILL_SCANNER_LLM_PROVIDER="$SKILL_SCANNER_LLM_PROVIDER" \
#     SKILL_SCANNER_LLM_BASE_URL="$SKILL_SCANNER_LLM_BASE_URL" \
#     MCP_SCANNER_LLM_API_KEY="$MCP_SCANNER_LLM_API_KEY" \
#     MCP_SCANNER_LLM_MODEL="$MCP_SCANNER_LLM_MODEL" \
#     MCP_SCANNER_LLM_BASE_URL="$MCP_SCANNER_LLM_BASE_URL" \
#     AI_DEFENSE_API_KEY="$AI_DEFENSE_API_KEY" \
#     MCP_SCANNER_API_KEY="$MCP_SCANNER_API_KEY" \
#     MCP_SCANNER_ENDPOINT="${MCP_SCANNER_ENDPOINT:-https://us.api.inspect.aidefense.security.cisco.com/api/v1}" \
#     VIRUSTOTAL_API_KEY="$VIRUSTOTAL_API_KEY" \
#     --force
#
# Upstream key names above — do not invent `CISCO_AI_DEFENSE_API_KEY` aliases.
# (TRIPWIRE_SCANNER_TIER is the setup-script Tier A sentinel only — not a scanner key.)
