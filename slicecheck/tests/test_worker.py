from __future__ import annotations

import hashlib
import hmac
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from slicecheck.src import worker


class FakeRequest:
    def __init__(
        self,
        url: str,
        *,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        body: str = "",
    ) -> None:
        self.url = url
        self.method = method
        self.headers = headers or {}
        self._body = body

    async def text(self) -> str:
        return self._body


def signed_headers(body: str, secret: str) -> dict[str, str]:
    digest = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return {"x-hub-signature-256": f"sha256={digest}", "x-github-event": "pull_request"}


def response_json(response: worker.Response) -> dict[str, Any]:
    return json.loads(response.body)


def test_cloudflare_entrypoint_imports_without_package_context() -> None:
    source_dir = Path(__file__).parents[1] / "src"
    command = f"import sys; sys.path.insert(0, {str(source_dir)!r}); import worker"

    completed = subprocess.run(
        [sys.executable, "-c", command],
        capture_output=True,
        check=False,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature_before_fetching(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    async def should_not_run(*_args: object) -> str:
        nonlocal called
        called = True
        return ""

    monkeypatch.setattr(worker, "fetch_plan_section", should_not_run)
    request = FakeRequest(
        "https://slicecheck.example/webhook",
        method="POST",
        headers={"x-hub-signature-256": "sha256=bad", "x-github-event": "pull_request"},
        body="{}",
    )
    env = {
        "GITHUB_TOKEN": "token",
        "ANTHROPIC_API_KEY": "key",
        "GITHUB_WEBHOOK_SECRET": "long-random-secret-value",
    }

    response = await worker.handle_request(request, env)

    assert response.status == 401
    assert response_json(response)["error"] == "Invalid webhook signature"
    assert called is False


@pytest.mark.asyncio
async def test_valid_webhook_verifies_and_posts(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "action": "opened",
        "repository": {"full_name": "owner/repo"},
        "pull_request": {"number": 8, "title": "Build SliceCheck"},
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    posted: list[tuple[object, ...]] = []

    async def fake_plan(*_args: object) -> str:
        return "# Plan"

    async def fake_diff(*_args: object) -> str:
        return "+code"

    async def fake_verify(*args: object) -> dict[str, Any]:
        assert args == ("# Plan", "+code", "Build SliceCheck", "key")
        return {"verdict": "PASS", "gaps": [], "retry_prompt": None}

    async def fake_post(*args: object) -> None:
        posted.append(args)

    monkeypatch.setattr(worker, "fetch_plan_section", fake_plan)
    monkeypatch.setattr(worker, "fetch_pr_diff", fake_diff)
    monkeypatch.setattr(worker, "verify_with_claude", fake_verify)
    monkeypatch.setattr(worker, "post_verification_comment", fake_post)
    request = FakeRequest(
        "https://slicecheck.example/webhook",
        method="POST",
        headers=signed_headers(body, secret),
        body=body,
    )
    env = {
        "GITHUB_TOKEN": "token",
        "ANTHROPIC_API_KEY": "key",
        "GITHUB_WEBHOOK_SECRET": secret,
    }

    response = await worker.handle_request(request, env)

    assert response.status == 200
    assert response_json(response)["verdict"] == "PASS"
    assert posted == [
        ("owner/repo", 8, {"verdict": "PASS", "gaps": [], "retry_prompt": None}, "token")
    ]


@pytest.mark.asyncio
async def test_webhook_posts_error_when_github_fetch_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "action": "synchronize",
        "repository": {"full_name": "owner/repo"},
        "pull_request": {"number": 8, "title": "Build SliceCheck"},
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    posted: list[dict[str, Any]] = []

    async def broken_plan(*_args: object) -> str:
        raise RuntimeError("GitHub plan unavailable")

    async def fake_diff(*_args: object) -> str:
        return "+code"

    async def fake_post(_repo: str, _number: int, result: dict[str, Any], _token: str) -> None:
        posted.append(result)

    monkeypatch.setattr(worker, "fetch_plan_section", broken_plan)
    monkeypatch.setattr(worker, "fetch_pr_diff", fake_diff)
    monkeypatch.setattr(worker, "post_verification_comment", fake_post)
    request = FakeRequest(
        "https://slicecheck.example/webhook",
        method="POST",
        headers=signed_headers(body, secret),
        body=body,
    )
    env = {
        "GITHUB_TOKEN": "token",
        "ANTHROPIC_API_KEY": "key",
        "GITHUB_WEBHOOK_SECRET": secret,
    }

    response = await worker.handle_request(request, env)

    assert response.status == 200
    assert posted[0]["verdict"] == "ERROR"
    assert posted[0]["gaps"] == ["GitHub plan unavailable"]


@pytest.mark.asyncio
async def test_audit_validates_query_and_renders_html(monkeypatch: pytest.MonkeyPatch) -> None:
    env = {"GITHUB_TOKEN": "token", "ANTHROPIC_API_KEY": "key"}
    invalid = FakeRequest("https://slicecheck.example/audit?repo=not-a-repo")

    invalid_response = await worker.handle_request(invalid, env)

    assert invalid_response.status == 400

    async def fake_audit(*args: object) -> list[dict[str, Any]]:
        assert args == ("owner/repo", 5, "closed", "docs/PLAN.md", "token", "key")
        return []

    monkeypatch.setattr(worker, "run_audit", fake_audit)
    request = FakeRequest(
        "https://slicecheck.example/audit?repo=owner/repo&limit=5&state=closed&plan_file=docs/PLAN.md"
    )

    response = await worker.handle_request(request, env)

    assert response.status == 200
    assert response.headers["content-type"] == "text/html; charset=utf-8"
    assert response.headers["cache-control"] == "no-store"
    assert response.body.startswith("<!DOCTYPE html>")


@pytest.mark.asyncio
async def test_health_and_unknown_routes() -> None:
    health = await worker.handle_request(FakeRequest("https://slicecheck.example/health"), {})
    missing = await worker.handle_request(FakeRequest("https://slicecheck.example/"), {})

    assert health.status == 200
    assert response_json(health) == {"status": "ok"}
    assert missing.status == 404
