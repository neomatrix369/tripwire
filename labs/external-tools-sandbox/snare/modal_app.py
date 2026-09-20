"""Modal smoke for softdevteam/snare (GitHub webhooks daemon).

Prefer Modal over local Docker for this lab tool: image installs Rust snare,
starts with the lab config + public fixture secret, sends a signed GitHub-style
ping, and returns PASS/FAIL evidence.

Usage (from this directory)::

    modal run modal_app.py
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import modal

LAB_DIR = Path(__file__).resolve().parent
CONF = (LAB_DIR / "config" / "snare.conf").read_text(encoding="utf-8")

# Public fixture from snare tests/auth.rs + GitHub webhook validation docs.
FAKE_SECRET = "secretsecret"
PING_BODY = (
    "{\n"
    ' "repository": {\n'
    ' "owner": {\n'
    ' "login": "testuser"\n'
    " },\n"
    ' "name": "testrepo"\n'
    " }\n"
    "}"
)
KNOWN_GOOD_SHA256 = (
    "d11297e14fe5286dd68fd58c5e23ea7fb45e60ceff51ec3eb3729400fcbcb4b2"
)

app = modal.App("ext-tools-snare")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "git",
        "curl",
        "ca-certificates",
        "build-essential",
        "pkg-config",
    )
    .run_commands(
        "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs "
        "| sh -s -- -y --default-toolchain stable",
        'export PATH="$HOME/.cargo/bin:$PATH" '
        "&& cargo install snare "
        "&& install -m 0755 \"$HOME/.cargo/bin/snare\" /usr/local/bin/snare",
        "useradd --create-home --shell /bin/bash --uid 10001 snare",
    )
    .env({"PATH": "/usr/local/bin:/root/.cargo/bin:/usr/bin:/bin"})
    .add_local_file(
        str(LAB_DIR / "config" / "snare.conf"),
        remote_path="/etc/snare/snare.conf",
        copy=True,
    )
)


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _wait_port(host: str, port: int, timeout_s: float = 45.0) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                return
        except OSError:
            time.sleep(0.2)
    raise TimeoutError(f"snare did not listen on {host}:{port} within {timeout_s}s")


def _http_post_raw(host: str, port: int, path: str, headers: dict[str, str], body: bytes) -> str:
    header_lines = [
        f"POST {path} HTTP/1.1",
        f"Host: {host}:{port}",
        f"Content-Length: {len(body)}",
        *[f"{k}: {v}" for k, v in headers.items()],
        "",
        "",
    ]
    payload = "\r\n".join(header_lines[:-1]).encode("ascii") + b"\r\n" + body
    with socket.create_connection((host, port), timeout=5.0) as sock:
        sock.sendall(payload)
        sock.settimeout(5.0)
        chunks: list[bytes] = []
        while True:
            try:
                chunk = sock.recv(4096)
            except socket.timeout:
                break
            if not chunk:
                break
            chunks.append(chunk)
            joined = b"".join(chunks)
            if b"\r\n\r\n" in joined:
                break
        return b"".join(chunks).decode("latin-1", errors="replace")


def _run_smoke_in_container() -> dict:
    conf_path = Path("/tmp/snare-lab.conf")
    conf_text = CONF.replace('listen = "0.0.0.0:8000";', 'listen = "127.0.0.1:8000";')
    conf_path.write_text(conf_text, encoding="utf-8")
    conf_path.chmod(0o644)

    log_path = Path("/tmp/snare-lab.log")
    with log_path.open("w", encoding="utf-8") as logf:
        # Drop to snare uid — snare refuses root without config `user =`.
        proc = subprocess.Popen(
            [
                "runuser",
                "-u",
                "snare",
                "--",
                "/usr/local/bin/snare",
                "-d",
                "-v",
                "-v",
                "-c",
                str(conf_path),
            ],
            stdout=logf,
            stderr=subprocess.STDOUT,
            env={**os.environ, "HOME": "/home/snare", "USER": "snare"},
        )

    evidence: dict = {
        "snare_bin": "/usr/local/bin/snare",
        "pid": proc.pid,
        "config_listen": "127.0.0.1:8000",
        "fake_secret": "(public fixture secretsecret)",
        "runtime": "modal",
    }

    try:
        _wait_port("127.0.0.1", 8000, timeout_s=45.0)
        evidence["listen"] = "ok"

        body = PING_BODY.encode("utf-8")
        sig = _sign(body, FAKE_SECRET)
        evidence["signature"] = f"sha256={sig}"
        evidence["signature_matches_upstream_fixture"] = sig == KNOWN_GOOD_SHA256
        evidence["body_len"] = len(body)

        headers = {
            "X-GitHub-Delivery": "72d3162e-cc78-11e3-81ab-4c9367dc0958",
            "X-Hub-Signature-256": f"sha256={sig}",
            "User-Agent": "GitHub-Hookshot/lab-smoke",
            "Content-Type": "application/json",
            "X-GitHub-Event": "ping",
            "X-GitHub-Hook-ID": "292430182",
            "X-GitHub-Hook-Installation-Target-ID": "79929171",
            "X-GitHub-Hook-Installation-Target-Type": "repository",
        }
        response = _http_post_raw("127.0.0.1", 8000, "/payload", headers, body)
        evidence["ping_response_head"] = response.split("\r\n", 1)[0]
        evidence["ping_ok"] = response.startswith("HTTP/1.1 200")

        bad_headers = dict(headers)
        bad_headers["X-Hub-Signature-256"] = "sha256=" + ("0" * 64)
        bad_headers["X-GitHub-Event"] = "issues"
        bad_resp = _http_post_raw("127.0.0.1", 8000, "/payload", bad_headers, body)
        evidence["bad_sig_response_head"] = bad_resp.split("\r\n", 1)[0]
        evidence["bad_sig_rejected"] = bad_resp.startswith("HTTP/1.1 401")

        evidence["log_tail"] = log_path.read_text(encoding="utf-8", errors="replace")[-2000:]

        if evidence["ping_ok"] and evidence["bad_sig_rejected"]:
            evidence["status"] = "PASS"
        elif evidence.get("listen") == "ok" and evidence["ping_ok"]:
            evidence["status"] = "PARTIAL"
        else:
            evidence["status"] = "FAIL"
        return evidence
    except Exception as exc:  # noqa: BLE001 — surface to operator as FAIL evidence
        evidence["error"] = f"{type(exc).__name__}: {exc}"
        evidence["log_tail"] = (
            log_path.read_text(encoding="utf-8", errors="replace")[-2000:]
            if log_path.exists()
            else ""
        )
        evidence["status"] = "FAIL"
        return evidence
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


@app.function(image=image, timeout=1200)
def smoke() -> dict:
    return _run_smoke_in_container()


@app.local_entrypoint()
def main() -> None:
    result = smoke.remote()
    print(json.dumps(result, indent=2))
    status = result.get("status", "FAIL")
    print(f"\nRESULT: {status}", file=sys.stderr)
    if status != "PASS":
        raise SystemExit(1)
