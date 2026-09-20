#!/usr/bin/env bash
# Bring pizauth up and leave it running for inspection.
# Usage: ./scripts/live-up.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
cd "$ROOT"

echo "==> docker compose --profile pizauth up -d --build"
docker compose --profile pizauth up -d --build

echo "==> wait for health / listen"
for _ in $(seq 1 30); do
  CID="$(docker compose --profile pizauth ps -q pizauth 2>/dev/null || true)"
  if [[ -n "$CID" ]]; then
    if docker exec "$CID" pizauth info -j -c /config/pizauth.conf 2>/dev/null \
      | grep -q '"server_running":true'; then
      break
    fi
  fi
  sleep 1
done

CID="$(docker compose --profile pizauth ps -q pizauth)"
echo "==> container: $CID"
docker compose --profile pizauth ps pizauth
echo "==> host HTTP (404 = listening with empty path):"
curl -sS -o /dev/null -w "http_code=%{http_code}\n" --connect-timeout 3 http://127.0.0.1:14204/ || true
echo "==> info:"
docker exec "$CID" pizauth info -j -c /config/pizauth.conf
echo "==> status:"
docker exec "$CID" pizauth status
echo "==> socket:"
docker exec "$CID" ls -la /tmp/runtime/pizauth/pizauth.sock
echo ""
echo "LIVE: pizauth reachable on http://127.0.0.1:14204/ (compose profile pizauth)"
echo "Stop with: docker compose --profile pizauth stop pizauth"
