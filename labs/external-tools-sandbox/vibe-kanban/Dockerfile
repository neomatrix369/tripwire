# vibe-kanban local server — prebuilt linux binary from npm CDN.
# Upstream: https://github.com/BloopAI/vibe-kanban (sunsetting; still runnable).
# Smoke bar: HTTP 200 on PORT (default 3000).

FROM debian:bookworm-slim

ARG TARGETARCH
ARG VK_BINARY_TAG=v0.1.44-20260424091429
ARG VK_R2_BASE=https://npm-cdn.vibekanban.com

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/*

# Map Docker TARGETARCH → upstream platform dir names.
RUN set -eux; \
  case "${TARGETARCH}" in \
    amd64) plat=linux-x64 ;; \
    arm64) plat=linux-arm64 ;; \
    *) echo "unsupported TARGETARCH=${TARGETARCH}" >&2; exit 1 ;; \
  esac; \
  url="${VK_R2_BASE}/binaries/${VK_BINARY_TAG}/${plat}/vibe-kanban.zip"; \
  echo "Downloading ${url}"; \
  curl -fsSL -o /tmp/vibe-kanban.zip "${url}"; \
  unzip -o /tmp/vibe-kanban.zip -d /usr/local/bin; \
  chmod +x /usr/local/bin/vibe-kanban; \
  rm -f /tmp/vibe-kanban.zip; \
  test -x /usr/local/bin/vibe-kanban

ENV HOST=0.0.0.0 \
    PORT=3000 \
    HOME=/data \
    VK_BINARY_TAG=${VK_BINARY_TAG}

WORKDIR /data
VOLUME ["/data"]
EXPOSE 3000

# Browser open fails harmlessly in containers (no xdg-open).
CMD ["/usr/local/bin/vibe-kanban"]
