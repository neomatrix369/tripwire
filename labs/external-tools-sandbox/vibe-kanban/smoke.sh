#!/usr/bin/env bash
# Smoke: build vibe-kanban image, start server, assert HTTP 200.
# Runtime: docker (Modal API currently 403 — see README).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../shared/docker-smoke.sh
source "$ROOT/../shared/docker-smoke.sh"

IMAGE="${VIBE_KANBAN_IMAGE:-ext-tools-vibe-kanban:lab}"
PORT="${VIBE_KANBAN_SMOKE_PORT:-13000}"
NAME="vk-smoke-$$"
EVIDENCE="$ROOT/smoke-evidence.txt"
: >"$EVIDENCE"

log() { echo "$*" | tee -a "$EVIDENCE"; }

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "=== vibe-kanban smoke $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
log "image=$IMAGE host_port=$PORT"

log "Building image..."
lab_docker_build "$IMAGE" "$ROOT"

log "Starting container..."
docker run -d --name "$NAME" \
  -p "${PORT}:3000" \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e HOME=/data \
  -e http_proxy="${http_proxy:-}" \
  -e https_proxy="${https_proxy:-}" \
  -e HTTP_PROXY="${HTTP_PROXY:-}" \
  -e HTTPS_PROXY="${HTTPS_PROXY:-}" \
  "$IMAGE" >/dev/null

ok=0
code="000"
body_snip=""
for i in $(seq 1 30); do
  code="$(curl -s -o /tmp/vk-smoke-body.html -w '%{http_code}' "http://127.0.0.1:${PORT}/" || true)"
  if [[ "$code" == "200" ]]; then
    body_snip="$(head -c 160 /tmp/vk-smoke-body.html | tr '\n' ' ')"
    ok=1
    log "HTTP try=$i code=$code"
    break
  fi
  log "HTTP try=$i code=$code (waiting)"
  sleep 1
done

docker logs "$NAME" 2>&1 | tee -a "$EVIDENCE" | tail -20 >/dev/null || true

if [[ "$ok" -ne 1 ]]; then
  log "FAIL: expected HTTP 200 from http://127.0.0.1:${PORT}/ got code=$code"
  exit 1
fi

if ! grep -qi 'html\|vibe\|kanban\|DOCTYPE' /tmp/vk-smoke-body.html; then
  log "FAIL: response body did not look like the web UI"
  exit 1
fi

log "PASS: HTTP 200 UI response"
log "body_snip=${body_snip}"
log "Runtime: docker | Modal: skipped (API 403 / prefer Docker for HTTP smoke)"
echo "PASS"
exit 0
