#!/usr/bin/env bash
# Sync Tripwire Modal secrets from .env and deploy sandbox/scan_app.py.
#
# Usage (from repo root):
#   ./scripts/setup-modal.sh
#   ./scripts/setup-modal.sh --secrets-only
#   ./scripts/setup-modal.sh --deploy-only
#   ./scripts/setup-modal.sh --non-interactive
#   ./scripts/setup-modal.sh --env-file /path/to/.env
#
# Never prints secret values — only key names and Modal CLI status.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env"
SECRETS_ONLY=0
DEPLOY_ONLY=0
NON_INTERACTIVE=0

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-modal.sh [options]

  --env-file PATH     Path to .env (default: repo-root .env)
  --secrets-only      Sync Modal secrets only (skip deploy)
  --deploy-only       Deploy only (skip secret sync; still checks auth)
  --non-interactive   Fail if not authenticated and MODAL_TOKEN_* unset
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --secrets-only)
      SECRETS_ONLY=1
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=1
      shift
      ;;
    --non-interactive)
      NON_INTERACTIVE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$SECRETS_ONLY" -eq 1 && "$DEPLOY_ONLY" -eq 1 ]]; then
  echo "error: --secrets-only and --deploy-only are mutually exclusive" >&2
  exit 1
fi

if ! command -v modal >/dev/null 2>&1; then
  echo "error: modal CLI not found. Install with: pip install modal" >&2
  exit 1
fi

# Match fixtures/OPTIONAL_SCANNER_KEYS.md — proxies break Modal auth/API.
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy || true

TMP_DIR=""
cleanup() {
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}"
  fi
}
trap cleanup EXIT

# Load MODAL_TOKEN_* from env file into this shell without exporting everything
# (values stay in this process only for token set).
load_modal_tokens_from_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == export\ * ]] && line="${line#export }"
    key="${line%%=*}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    case "$key" in
      MODAL_TOKEN_ID|MODAL_TOKEN_SECRET) ;;
      *) continue ;;
    esac
    value="${line#*=}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    if [[ ${#value} -ge 2 ]]; then
      local q="${value:0:1}"
      if [[ "$q" == '"' || "$q" == "'" ]] && [[ "${value: -1}" == "$q" ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi
    export "$key=$value"
  done < "$file"
}

# Bound Modal CLI calls that may hang on bad network/proxy.
modal_ok() {
  if command -v timeout >/dev/null 2>&1; then
    timeout 25 modal "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout 25 modal "$@"
  else
    # macOS without GNU timeout: Python alarm wrapper
    python3 - "$ROOT" "$@" <<'PY'
import os, signal, subprocess, sys
root, args = sys.argv[1], sys.argv[2:]
def _alarm(signum, frame):
    raise SystemExit(124)
signal.signal(signal.SIGALRM, _alarm)
signal.alarm(25)
raise SystemExit(subprocess.call(["modal", *args], cwd=root))
PY
  fi
}

ensure_auth() {
  if modal_ok token info >/dev/null 2>&1; then
    echo "Modal auth: already logged in"
    return 0
  fi

  load_modal_tokens_from_file "$ENV_FILE"

  if [[ -n "${MODAL_TOKEN_ID:-}" && -n "${MODAL_TOKEN_SECRET:-}" ]]; then
    echo "Modal auth: setting token from MODAL_TOKEN_ID / MODAL_TOKEN_SECRET"
    modal_ok token set \
      --token-id "$MODAL_TOKEN_ID" \
      --token-secret "$MODAL_TOKEN_SECRET" \
      --verify
    return
  fi

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    echo "error: not authenticated with Modal and MODAL_TOKEN_ID/SECRET unset." >&2
    echo "  Run \`modal token new\` once, or set tokens in .env, then re-run." >&2
    exit 1
  fi

  echo "Modal auth: launching interactive login (modal token new)"
  modal token new
}

sync_secrets() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "error: env file not found: $ENV_FILE" >&2
    echo "  Copy .env.example to .env and fill SUPABASE_* (plus any scanner keys)." >&2
    exit 1
  fi

  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tripwire-modal.XXXXXX")"
  local supabase_out="$TMP_DIR/tripwire-supabase.env"
  local scan_out="$TMP_DIR/tripwire-scan-secrets.env"

  local summary
  summary="$(
    python3 "$ROOT/scripts/_modal_env_split.py" \
      --env-file "$ENV_FILE" \
      --supabase-out "$supabase_out" \
      --scan-out "$scan_out"
  )"

  local supabase_keys scan_keys
  supabase_keys="$(python3 -c 'import json,sys; print(", ".join(json.load(sys.stdin)["supabase_keys"]))' <<<"$summary")"
  scan_keys="$(python3 -c 'import json,sys; print(", ".join(json.load(sys.stdin)["scan_keys"]))' <<<"$summary")"

  echo "Syncing secret tripwire-supabase (keys: $supabase_keys)"
  modal_ok secret create tripwire-supabase --from-dotenv "$supabase_out" --force

  if [[ -n "$scan_keys" ]]; then
    echo "Syncing secret tripwire-scan-secrets (keys: $scan_keys)"
    modal_ok secret create tripwire-scan-secrets --from-dotenv "$scan_out" --force
  else
    echo "No scanner keys in .env — skipping tripwire-scan-secrets."
  fi
}

deploy_app() {
  echo "Deploying sandbox/scan_app.py"
  # Deploy can legitimately take longer than auth/secret calls — no short alarm.
  modal deploy "$ROOT/sandbox/scan_app.py"
}

ensure_auth

if [[ "$DEPLOY_ONLY" -eq 0 ]]; then
  sync_secrets
fi

if [[ "$SECRETS_ONLY" -eq 0 ]]; then
  deploy_app
fi

echo "Done."
