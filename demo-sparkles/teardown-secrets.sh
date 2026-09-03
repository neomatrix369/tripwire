#!/bin/bash
# demo-sparkles/teardown-secrets.sh
# Undo demo-sparkles/setup-secrets.sh:
#   1. Delete GITHUB_TOKEN / GITHUB_WEBHOOK_SECRET / ANTHROPIC_API_KEY from Cloudflare
#   2. Remove the local demo-sparkles webhook-secret cache
#
# Does NOT revoke gh / Anthropic / Cloudflare logins — only the Worker secrets
# and the local cache created by setup.
#
# Usage:
#   bash demo-sparkles/teardown-secrets.sh
#   WORKER_NAME=slicecheck bash demo-sparkles/teardown-secrets.sh
#   YES=1 bash demo-sparkles/teardown-secrets.sh   # skip confirmation

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_NAME="${WORKER_NAME:-slicecheck}"
WORKER_DIR="${WORKER_DIR:-$REPO_ROOT/slicecheck}"
WEBHOOK_SECRET_CACHE="${WEBHOOK_SECRET_CACHE:-$REPO_ROOT/secrets/slicecheck-webhook-secret}"
SECRET_NAMES=(GITHUB_TOKEN GITHUB_WEBHOOK_SECRET ANTHROPIC_API_KEY)

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

wrangler_creds_present() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || [ -n "${CLOUDFLARE_API_KEY:-}" ]; then
    return 0
  fi
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

delete_secret() {
  local name="$1"
  # wrangler prompts for confirmation; answer yes non-interactively.
  if printf 'y\n' | wrangler_cmd secret delete "$name" --name "$WORKER_NAME"; then
    echo "  ✅ Deleted Cloudflare secret: $name"
  else
    echo "  ⚠️  Could not delete $name (may already be absent)"
  fi
}

echo "━━━ SliceCheck — teardown Worker secrets ━━━"
echo "Worker: $WORKER_NAME"
echo "Will remove from Cloudflare: ${SECRET_NAMES[*]}"
echo "Will remove local cache:     $WEBHOOK_SECRET_CACHE"
echo ""

if [ "${YES:-0}" != "1" ]; then
  if [ -r /dev/tty ]; then
    printf "Proceed? [y/N] " >/dev/tty
    IFS= read -r reply </dev/tty
    case "$reply" in
      y|Y|yes|YES) ;;
      *) echo "Aborted."; exit 0 ;;
    esac
  else
    echo "❌ No TTY for confirmation. Re-run with YES=1 to proceed."
    exit 1
  fi
fi

# ── 1. Cloudflare auth (never re-login if already signed in) ─────────
echo "[1] Cloudflare (wrangler) auth..."
if wrangler_creds_present; then
  echo "  ✅ Already signed in — skipping login"
elif wrangler_cmd whoami 2>/dev/null | grep -Eqi 'Account Name|Email:|authenticated'; then
  echo "  ✅ Already signed in — skipping login"
else
  echo "  → No Cloudflare credentials found — opening wrangler login..."
  wrangler_cmd login
  echo "  ✅ Signed in"
fi

# ── 2. Delete secrets on the Worker ──────────────────────────────────
echo "[2] Deleting secrets from Cloudflare Worker '$WORKER_NAME'..."
if [ -d "$WORKER_DIR" ]; then
  cd "$WORKER_DIR"
fi

for secret_name in "${SECRET_NAMES[@]}"; do
  delete_secret "$secret_name"
done

# ── 3. Remove local demo-sparkles cache ──────────────────────────────
echo "[3] Removing local demo-sparkles secret cache..."
if [ -f "$WEBHOOK_SECRET_CACHE" ]; then
  rm -f "$WEBHOOK_SECRET_CACHE"
  echo "  ✅ Removed $WEBHOOK_SECRET_CACHE"
else
  echo "  ℹ️  No cache file at $WEBHOOK_SECRET_CACHE"
fi

# Drop empty secrets/ dir if we created only this file
if [ -d "$(dirname "$WEBHOOK_SECRET_CACHE")" ] && \
   [ -z "$(ls -A "$(dirname "$WEBHOOK_SECRET_CACHE")" 2>/dev/null || true)" ]; then
  rmdir "$(dirname "$WEBHOOK_SECRET_CACHE")" 2>/dev/null || true
fi

echo ""
echo "━━━ Teardown complete ━━━"
echo "Cloudflare Worker secrets removed; local webhook-secret cache cleared."
echo "Note: gh / Anthropic / wrangler logins were left in place."
echo "If a GitHub repo webhook still points at this Worker, delete it under"
echo "  Repo → Settings → Webhooks  (or: gh api repos/<owner>/<repo>/hooks)"
