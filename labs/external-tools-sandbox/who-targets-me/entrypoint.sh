#!/usr/bin/env bash
# Build Who-Targets-Me extension artefacts inside the container.
# WTM_BUILD_TARGET: chrome | firefox | all (default)
set -euo pipefail

TARGET="${WTM_BUILD_TARGET:-all}"
cd /app

build_one() {
  local browser="$1"
  echo "==> npm run build:${browser}"
  npm run "build:${browser}"
  if [[ ! -f "build/${browser}/manifest.json" ]]; then
    echo "FAIL: missing build/${browser}/manifest.json" >&2
    exit 1
  fi
  echo "OK  build/${browser}/manifest.json"
}

case "${TARGET}" in
  chrome)
    build_one chrome
    ;;
  firefox)
    build_one firefox
    ;;
  all)
    build_one chrome
    build_one firefox
    ;;
  *)
    echo "FAIL: unknown WTM_BUILD_TARGET='${TARGET}' (use chrome|firefox|all)" >&2
    exit 1
    ;;
esac

if [[ -d /dist ]]; then
  echo "==> copying build/ → /dist/"
  mkdir -p /dist
  cp -a build/. /dist/
fi

echo ""
echo "Artefacts:"
find build -maxdepth 2 -type f \( -name 'manifest.json' -o -name '*.js' \) | head -40
echo ""
echo "WTM_BUILD_OK target=${TARGET}"
echo "NOTE: web-ext start / Facebook login is HITL — not required for this smoke."
