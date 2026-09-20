# Build softdevteam/snare (Rust GitHub webhooks daemon) for lab smoke.
# snare refuses to run as root unless config sets `user = "..."` — we run as
# non-root instead.
#
# Build:  docker build -t ext-tools-snare:lab .
# Run:    docker run --rm -p 8000:8000 ext-tools-snare:lab

FROM rust:bookworm AS build

WORKDIR /src
RUN git clone --depth 1 https://github.com/softdevteam/snare.git .
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --shell /bin/bash --uid 10001 snare

COPY --from=build /src/target/release/snare /usr/local/bin/snare
COPY config/snare.conf /etc/snare/snare.conf
COPY prps/ /prps/
RUN chmod +x /prps/lab/echo \
  && mkdir -p /etc/snare \
  && chown -R snare:snare /etc/snare /prps

USER snare
WORKDIR /home/snare

EXPOSE 8000

# -d: stay in foreground (no daemonise); -v -v: info logs for smoke evidence
CMD ["snare", "-d", "-v", "-v", "-c", "/etc/snare/snare.conf"]
