#!/bin/bash
# demo-sparkles/setup-secrets.sh
# Resolve SliceCheck Worker secrets at runtime (sign in when needed) and
# upload them with wrangler — no manual paste into `wrangler secret put`.
#
# Sources:
#   GITHUB_TOKEN          — gh auth (login/refresh) → gh auth token
#   GITHUB_WEBHOOK_SECRET — reused from env / secrets/ cache, else generated
#   ANTHROPIC_API_KEY     — env, else interactive console.anthropic.com flow
#
# Usage:
#   bash demo-sparkles/setup-secrets.sh
#   WORKER_NAME=slicecheck bash demo-sparkles/setup-secrets.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_NAME="${WORKER_NAME:-slicecheck}"
WORKER_DIR="${WORKER_DIR:-$REPO_ROOT/slicecheck}"
WEBHOOK_SECRET_CACHE="${WEBHOOK_SECRET_CACHE:-$REPO_ROOT/secrets/slicecheck-webhook-secret}"
ANTHROPIC_CONSOLE_URL="https://console.anthropic.com/settings/keys"

redact() {
  local value="$1"
  local len=${#value}
  if [ "$len" -le 8 ]; then
    echo "********"
  else
    echo "${value:0:4}…${value: -4} (len=$len)"
  fi
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "❌ Required command not found: $1"
    exit 1
  }
}

wrangler_cmd() {
  if command -v wrangler >/dev/null 2>&1; then
    wrangler "$@"
  else
    need_cmd npx
    npx --yes wrangler "$@"
  fi
}

put_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | wrangler_cmd secret put "$name" --name "$WORKER_NAME"
  echo "  ✅ $name → $(redact "$value")"
}

echo "━━━ SliceCheck — setup Worker secrets ━━━"
echo "Worker: $WORKER_NAME"
echo ""

need_cmd gh
need_cmd openssl
need_cmd python3

# ── 1. Cloudflare auth ──────────────────────────────────────────────
echo "[1] Cloudflare (wrangler) auth..."

wrangler_creds_present() {
  # API token in env counts as authenticated — never open a browser login.
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || [ -n "${CLOUDFLARE_API_KEY:-}" ]; then
    return 0
  fi
  # OAuth session from a prior `wrangler login`.
  local conf
  for conf in \
    "${XDG_CONFIG_HOME:-$HOME/.config}/wrangler/config/default.toml" \
    "$HOME/Library/Preferences/.wrangler/config/default.toml" \
    "$HOME/.wrangler/config/default.toml"
  do
    if [ -f "$conf" ] && grep -Eq '^[[:space:]]*oauth_token[[:space:]]*=' "$conf"; then
      return 0
    fi
  done
  return 1
}

if wrangler_creds_present; then
  echo "  ✅ Already signed in (local wrangler credentials found) — skipping login"
elif wrangler_cmd whoami 2>/dev/null | grep -Eqi 'Account Name|Email:|authenticated'; then
  echo "  ✅ Already signed in (wrangler whoami) — skipping login"
else
  echo "  → No Cloudflare credentials found — opening wrangler login..."
  wrangler_cmd login
  echo "  ✅ Signed in"
fi

# ── 2. GitHub token via gh ───────────────────────────────────────────
echo "[2] GitHub token..."
GITHUB_TOKEN_VALUE="${GITHUB_TOKEN:-}"
GH_SCOPES="repo,read:org,admin:repo_hook"

github_token_ok() {
  local token="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $token" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user || true)
  [ "$code" = "200" ]
}

if [ -n "$GITHUB_TOKEN_VALUE" ] && github_token_ok "$GITHUB_TOKEN_VALUE"; then
  echo "  ✅ Using GITHUB_TOKEN from environment ($(redact "$GITHUB_TOKEN_VALUE"))"
else
  if [ -n "$GITHUB_TOKEN_VALUE" ]; then
    echo "  → Env GITHUB_TOKEN rejected by API — falling back to gh auth"
  fi

  if ! gh auth status -h github.com >/dev/null 2>&1; then
    echo "  → GitHub CLI not authenticated — browser login ($GH_SCOPES)..."
    gh auth login -h github.com -p https -w -s "$GH_SCOPES"
  fi

  GITHUB_TOKEN_VALUE="$(gh auth token 2>/dev/null || true)"
  if [ -z "$GITHUB_TOKEN_VALUE" ] || ! github_token_ok "$GITHUB_TOKEN_VALUE"; then
    echo "  → Token missing/invalid — refresh then login if needed..."
    gh auth refresh -h github.com -s "$GH_SCOPES" 2>/dev/null || \
      gh auth login -h github.com -p https -w -s "$GH_SCOPES"
    GITHUB_TOKEN_VALUE="$(gh auth token)"
  fi

  if ! github_token_ok "$GITHUB_TOKEN_VALUE"; then
    echo "❌ GitHub token still invalid after sign-in"
    exit 1
  fi
  echo "  ✅ Resolved via gh ($(redact "$GITHUB_TOKEN_VALUE"))"
fi

# ── 3. Webhook secret (stable across re-runs) ────────────────────────
echo "[3] GitHub webhook secret..."
GITHUB_WEBHOOK_SECRET_VALUE="${GITHUB_WEBHOOK_SECRET:-}"

if [ -z "$GITHUB_WEBHOOK_SECRET_VALUE" ] && [ -f "$WEBHOOK_SECRET_CACHE" ]; then
  GITHUB_WEBHOOK_SECRET_VALUE="$(tr -d '[:space:]' < "$WEBHOOK_SECRET_CACHE")"
  echo "  ✅ Reusing cached secret at $WEBHOOK_SECRET_CACHE ($(redact "$GITHUB_WEBHOOK_SECRET_VALUE"))"
fi

if [ -z "$GITHUB_WEBHOOK_SECRET_VALUE" ]; then
  GITHUB_WEBHOOK_SECRET_VALUE="slicecheck-$(openssl rand -hex 16)"
  mkdir -p "$(dirname "$WEBHOOK_SECRET_CACHE")"
  printf '%s\n' "$GITHUB_WEBHOOK_SECRET_VALUE" > "$WEBHOOK_SECRET_CACHE"
  chmod 600 "$WEBHOOK_SECRET_CACHE"
  echo "  ✅ Generated + cached at $WEBHOOK_SECRET_CACHE ($(redact "$GITHUB_WEBHOOK_SECRET_VALUE"))"
fi

if [ "${#GITHUB_WEBHOOK_SECRET_VALUE}" -lt 20 ]; then
  echo "❌ GITHUB_WEBHOOK_SECRET must be at least 20 characters"
  exit 1
fi

# ── 4. Anthropic API key ─────────────────────────────────────────────
echo "[4] Anthropic API key..."
ANTHROPIC_API_KEY_VALUE="${ANTHROPIC_API_KEY:-}"

if [ -z "$ANTHROPIC_API_KEY_VALUE" ]; then
  echo "  → ANTHROPIC_API_KEY not in environment."
  echo "    Opening Anthropic console — create/copy an API key, then paste below."
  if command -v open >/dev/null 2>&1; then
    open "$ANTHROPIC_CONSOLE_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$ANTHROPIC_CONSOLE_URL" >/dev/null 2>&1 || true
  else
    echo "    Visit: $ANTHROPIC_CONSOLE_URL"
  fi
  # Read from the controlling terminal so piping this script still works.
  if [ -r /dev/tty ]; then
    printf "  Paste ANTHROPIC_API_KEY: " >/dev/tty
    IFS= read -r ANTHROPIC_API_KEY_VALUE </dev/tty
  else
    echo "❌ No TTY to read the key. Export ANTHROPIC_API_KEY and re-run."
    exit 1
  fi
fi

ANTHROPIC_API_KEY_VALUE="$(printf '%s' "$ANTHROPIC_API_KEY_VALUE" | tr -d '[:space:]')"
if [ -z "$ANTHROPIC_API_KEY_VALUE" ]; then
  echo "❌ Empty ANTHROPIC_API_KEY"
  exit 1
fi
echo "  ✅ Resolved ($(redact "$ANTHROPIC_API_KEY_VALUE"))"

# ── 5. Upload to Worker ──────────────────────────────────────────────
echo "[5] Uploading secrets to Worker '$WORKER_NAME'..."
if [ -d "$WORKER_DIR" ]; then
  cd "$WORKER_DIR"
fi

put_secret GITHUB_TOKEN "$GITHUB_TOKEN_VALUE"
put_secret GITHUB_WEBHOOK_SECRET "$GITHUB_WEBHOOK_SECRET_VALUE"
put_secret ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY_VALUE"

echo ""
echo "━━━ Done ━━━"
echo "Webhook signing secret (use this when registering the GitHub webhook):"
echo "  $GITHUB_WEBHOOK_SECRET_VALUE"
echo "Cached at: $WEBHOOK_SECRET_CACHE"
echo ""
echo "Register webhook (if needed):"
echo "  Payload URL: https://${WORKER_NAME}.<your-subdomain>.workers.dev/webhook"
echo "  Content type: application/json"
echo "  Secret: (value printed above)"
echo "  Events: Pull requests"
