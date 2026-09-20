#!/usr/bin/env bash
# Smoke: Who-Targets-Me npm extension build (chrome and/or firefox).
# Exit 0 = PASS (build artefacts present). Facebook login is NOT required.
#
# Usage (from this directory):
#   ./smoke.sh
#   WTM_BUILD_TARGET=chrome ./smoke.sh
#   EXT_TOOLS_RUNTIME=modal ./smoke.sh
#
# Compose:
#   docker compose --profile who-targets-me up --build
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_ROOT="$(cd "${HERE}/.." && pwd)"
# shellcheck source=../shared/docker-smoke.sh
source "${LAB_ROOT}/shared/docker-smoke.sh"

IMAGE="${WTM_IMAGE_TAG:-who-targets-me:lab}"
TARGET="${WTM_BUILD_TARGET:-all}"
RUNTIME="${EXT_TOOLS_RUNTIME:-docker}"

echo "who-targets-me smoke — runtime=${RUNTIME} target=${TARGET}"

run_docker() {
  echo "==> docker build ${IMAGE}"
  lab_docker_build "${IMAGE}" "${HERE}"

  echo "==> docker run (build smoke)"
  # Env must precede image; shared helper places args after the tag as CMD.
  docker run --rm \
    -e http_proxy="${http_proxy:-}" \
    -e https_proxy="${https_proxy:-}" \
    -e HTTP_PROXY="${HTTP_PROXY:-}" \
    -e HTTPS_PROXY="${HTTPS_PROXY:-}" \
    -e "WTM_BUILD_TARGET=${TARGET}" \
    "${IMAGE}"
}

run_compose() {
  echo "==> docker compose --profile who-targets-me"
  (
    cd "${LAB_ROOT}"
    docker compose --profile who-targets-me build who-targets-me
    docker compose --profile who-targets-me run --rm \
      -e "WTM_BUILD_TARGET=${TARGET}" \
      who-targets-me
  )
}

run_modal() {
  if ! command -v modal >/dev/null 2>&1; then
    echo "FAIL: modal CLI not found (pip install modal && modal setup)" >&2
    exit 1
  fi
  echo "==> modal run modal_app.py --targets ${TARGET}"
  (cd "${HERE}" && modal run modal_app.py --targets "${TARGET}")
}

case "${RUNTIME}" in
  modal)
    run_modal
    ;;
  compose)
    run_compose
    ;;
  docker | auto | *)
    run_docker
    ;;
esac

echo ""
echo "PASS  who-targets-me — npm build artefacts OK (login = PARTIAL/HITL, not required)"
