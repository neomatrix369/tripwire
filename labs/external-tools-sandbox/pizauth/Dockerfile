# pizauth lab image — build from upstream source, run with lab config.
# Upstream: https://github.com/ltratt/pizauth/
# No secrets baked in; mount/override /config/pizauth.conf for real OAuth.

# Upstream master may require rustc newer than Docker Hub tags; pin release tag.
# Deps need rustc ≥ 1.89; duration APIs on master tip may need ≥ 1.96.
ARG RUST_IMAGE=rust:1.96-bookworm
ARG RUNTIME_IMAGE=debian:bookworm-slim
# Released tag (not floating master) for reproducible builds.
ARG PIZAUTH_REF=pizauth-1.1.0

FROM ${RUST_IMAGE} AS build
ARG PIZAUTH_REF
WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch "${PIZAUTH_REF}" \
      https://github.com/ltratt/pizauth.git . \
    && cargo build --release \
    && install -m 755 target/release/pizauth /usr/local/bin/pizauth

FROM ${RUNTIME_IMAGE}
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin pizauth

COPY --from=build /usr/local/bin/pizauth /usr/local/bin/pizauth
COPY config/pizauth.conf /config/pizauth.conf
COPY scripts/container-smoke.sh /usr/local/bin/container-smoke.sh
RUN chmod 755 /usr/local/bin/container-smoke.sh \
    && mkdir -p /tmp/runtime /var/lib/pizauth \
    && chown -R pizauth:pizauth /tmp/runtime /var/lib/pizauth /config

ENV HOME=/home/pizauth \
    XDG_RUNTIME_DIR=/tmp/runtime \
    XDG_CONFIG_HOME=/home/pizauth/.config \
    PIZAUTH_CONFIG_PATH=/config/pizauth.conf

USER pizauth
WORKDIR /home/pizauth
EXPOSE 14204

# Default: long-running server (compose). Override to smoke:
#   docker run --rm IMAGE /usr/local/bin/container-smoke.sh
ENTRYPOINT []
CMD ["pizauth", "server", "-d", "-c", "/config/pizauth.conf"]
