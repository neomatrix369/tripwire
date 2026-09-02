from __future__ import annotations

import hashlib
import hmac
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from slicecheck.src import github, verifier, worker


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

    monkeypatch.setattr(worker, "fetch_criteria_context", should_not_run)
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
@pytest.mark.parametrize("action", ["opened", "ready_for_review"])
async def test_valid_webhook_verifies_and_posts(
    monkeypatch: pytest.MonkeyPatch, action: str
) -> None:
    payload = {
        "action": action,
        "repository": {"full_name": "owner/repo"},
        "pull_request": {
            "number": 8,
            "title": "Build SliceCheck",
            "body": "Implements slice 58",
            "draft": False,
            "head": {"sha": "head-sha"},
        },
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    posted: list[tuple[object, ...]] = []

    async def fake_criteria(*_args: object, **_kwargs: object) -> github.CriteriaContext:
        return github.CriteriaContext("# Plan", "docs/plan/slices/slice-58.md")

    async def fake_diff(*_args: object) -> str:
        return "+code"

    async def fake_verify(*args: object) -> dict[str, Any]:
        assert args == ("# Plan", "+code", "Build SliceCheck", "key")
        return {"verdict": "PASS", "gaps": [], "retry_prompt": None}

    async def fake_post(*args: object) -> None:
        posted.append(args)

    monkeypatch.setattr(worker, "fetch_criteria_context", fake_criteria)
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
        (
            "owner/repo",
            8,
            {
                "verdict": "PASS",
                "gaps": [],
                "retry_prompt": None,
                "criteria_source": "docs/plan/slices/slice-58.md",
            },
            "token",
        )
    ]


@pytest.mark.asyncio
async def test_webhook_ignores_draft_without_side_effects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "action": "synchronize",
        "repository": {"full_name": "owner/repo"},
        "pull_request": {"number": 8, "title": "Draft SliceCheck", "draft": True},
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    called = False

    async def should_not_run(*_args: object) -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(worker, "fetch_criteria_context", should_not_run)
    monkeypatch.setattr(worker, "fetch_pr_diff", should_not_run)
    monkeypatch.setattr(worker, "verify_with_claude", should_not_run)
    monkeypatch.setattr(worker, "post_verification_comment", should_not_run)
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

    assert response.status == 202
    assert response_json(response) == {
        "status": "ignored",
        "reason": "draft pull request",
    }
    assert called is False


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

    async def broken_plan(*_args: object) -> github.CriteriaContext:
        raise RuntimeError("GitHub plan unavailable")

    async def fake_diff(*_args: object) -> str:
        return "+code"

    async def fake_post(_repo: str, _number: int, result: dict[str, Any], _token: str) -> None:
        posted.append(result)

    monkeypatch.setattr(worker, "fetch_criteria_context", broken_plan)
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
async def test_webhook_reloads_changed_slice_criteria_from_head(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "action": "synchronize",
        "repository": {"full_name": "owner/repo"},
        "pull_request": {
            "number": 79,
            "title": "Frontline agent hooks",
            "body": "",
            "draft": False,
            "head": {"sha": "frontline-head"},
        },
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    criteria_calls: list[dict[str, object]] = []
    posted: list[dict[str, Any]] = []

    async def fake_criteria(*_args: object, **kwargs: object) -> github.CriteriaContext:
        criteria_calls.append(kwargs)
        if "diff" in kwargs:
            return github.CriteriaContext(
                "# GWT-23\nImplement the handler", "docs/plan/slices/slice-23.md"
            )
        return github.CriteriaContext("# Frontline tracker", "docs/plan/PROGRESS.md")

    async def fake_diff(*_args: object) -> str:
        return (
            "diff --git a/docs/plan/slices/08-H/slice-23-handler.md "
            "b/docs/plan/slices/08-H/slice-23-handler.md\n+code"
        )

    async def fake_verify(plan: str, *_args: object) -> dict[str, Any]:
        assert plan.startswith("# GWT-23")
        return {"verdict": "PASS", "gaps": [], "retry_prompt": None}

    async def fake_post(_repo: str, _number: int, result: dict[str, Any], _token: str) -> None:
        posted.append(result)

    monkeypatch.setattr(worker, "fetch_criteria_context", fake_criteria)
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
    assert len(criteria_calls) == 2
    assert criteria_calls[1]["head_ref"] == "frontline-head"
    assert posted[0]["criteria_source"] == "docs/plan/slices/slice-23.md"


@pytest.mark.asyncio
async def test_webhook_evaluates_dependency_with_workflow_evidence_without_claude(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = {
        "action": "opened",
        "repository": {"full_name": "owner/repo"},
        "pull_request": {
            "number": 128,
            "title": "chore(deps): bump actions/github-script from 7 to 9",
            "body": "Dependabot update",
            "draft": False,
            "head": {"sha": "dependency-head"},
        },
    }
    body = json.dumps(payload)
    secret = "long-random-secret-value"
    posted: list[dict[str, Any]] = []
    claude_called = False

    async def no_criteria(*_args: object, **_kwargs: object) -> github.CriteriaContext:
        return github.CriteriaContext("", None)

    async def fake_diff(*_args: object) -> str:
        path = ".github/workflows/complexity-report.yml"
        return "\n".join(
            [
                f"diff --git a/{path} b/{path}",
                "-        uses: actions/github-script@v7",
                "+        uses: actions/github-script@v9",
            ]
        )

    async def fake_runs(*_args: object) -> list[dict[str, str]]:
        return [
            {
                "path": ".github/workflows/complexity-report.yml",
                "status": "completed",
                "conclusion": "success",
            }
        ]

    async def should_not_call_claude(*_args: object) -> dict[str, Any]:
        nonlocal claude_called
        claude_called = True
        return {}

    async def fake_post(_repo: str, _number: int, result: dict[str, Any], _token: str) -> None:
        posted.append(result)

    monkeypatch.setattr(worker, "fetch_criteria_context", no_criteria)
    monkeypatch.setattr(worker, "fetch_pr_diff", fake_diff)
    monkeypatch.setattr(worker, "fetch_workflow_runs", fake_runs)
    monkeypatch.setattr(worker, "verify_with_claude", should_not_call_claude)
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
    assert posted[0]["verdict"] == "PASS"
    assert posted[0]["criteria_source"] == verifier.DEPENDENCY_CRITERIA_SOURCE
    assert claude_called is False


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
    assert "Scope</strong>Closed PRs" in response.body
    assert "Limit</strong>5 PRs" in response.body
    assert "Plan</strong>docs/PLAN.md" in response.body


@pytest.mark.asyncio
async def test_health_and_unknown_routes() -> None:
    health = await worker.handle_request(FakeRequest("https://slicecheck.example/health"), {})
    missing = await worker.handle_request(FakeRequest("https://slicecheck.example/"), {})

    assert health.status == 200
    assert response_json(health) == {"status": "ok"}
    assert missing.status == 404
