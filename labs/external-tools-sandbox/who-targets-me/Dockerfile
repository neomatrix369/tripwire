# Who-Targets-Me — lab image for npm extension builds (chrome / firefox).
# Upstream: https://github.com/WhoTargetsMe/Who-Targets-Me (.node-version: v16)
# Lab uses Node 20 on bookworm (Node 16 bullseye apt mirrors 404 on arm64).
# Smoke bar: build artefacts exist. Facebook login is HITL / not required for PASS.

FROM node:20-bookworm-slim

LABEL org.opencontainers.image.title="who-targets-me-lab"
LABEL org.opencontainers.image.source="https://github.com/WhoTargetsMe/Who-Targets-Me"
LABEL lab.tool="who-targets-me"

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG WTM_REPO=https://github.com/WhoTargetsMe/Who-Targets-Me.git
ARG WTM_REF=master

# Clone at image build — do not commit upstream into git (vendor/ is gitignored).
RUN git clone --depth 1 --branch "${WTM_REF}" "${WTM_REPO}" .

# Webpack 5 on Node 17+ may need the legacy OpenSSL provider.
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm ci

COPY entrypoint.sh /usr/local/bin/wtm-entrypoint.sh
RUN chmod +x /usr/local/bin/wtm-entrypoint.sh

# Optional volume mount point for compose (wtm-dist → /dist).
VOLUME ["/dist"]

ENV WTM_BUILD_TARGET=all

ENTRYPOINT ["/usr/local/bin/wtm-entrypoint.sh"]
