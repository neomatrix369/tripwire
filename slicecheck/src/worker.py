"""Cloudflare Worker entrypoint for SliceCheck webhook and audit routes."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import re
from typing import Any
from urllib.parse import parse_qs, urlparse

try:
    from workers import Response, WorkerEntrypoint
except ImportError:  # pragma: no cover - local tests exercise the pure request handler

    class WorkerEntrypoint:  # type: ignore[no-redef]
        """Minimal local stand-in for Cloudflare's runtime-provided base class."""

    class Response:  # type: ignore[no-redef]
        def __init__(
            self, body: str = "", *, status: int = 200, headers: dict[str, str] | None = None
        ) -> None:
            self.body = body
            self.status = status
            self.headers = headers or {}


if __package__:
    from .audit import render_audit_html, run_audit
    from .github import fetch_plan_section, fetch_pr_diff, post_verification_comment
    from .verifier import verify_with_claude
else:
    from audit import render_audit_html, run_audit  # type: ignore[no-redef]
    from github import (  # type: ignore[no-redef]
        fetch_plan_section,
        fetch_pr_diff,
        post_verification_comment,
    )
    from verifier import verify_with_claude  # type: ignore[no-redef]

REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SUPPORTED_ACTIONS = {"opened", "ready_for_review", "reopened", "synchronize"}


def _binding(env: object, name: str) -> str:
    value = env.get(name) if isinstance(env, dict) else getattr(env, name, None)
    return str(value) if value is not None else ""


def _json_response(payload: dict[str, Any], status: int = 200) -> Response:
    return Response(
        json.dumps(payload),
        status=status,
        headers={"content-type": "application/json; charset=utf-8"},
    )


def _header(request: object, name: str) -> str:
    headers = getattr(request, "headers", {})
    value = headers.get(name) if hasattr(headers, "get") else None
    return str(value) if value is not None else ""


def _valid_signature(body: str, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _handle_webhook(request: object, env: object) -> Response:
    github_token = _binding(env, "GITHUB_TOKEN")
    anthropic_key = _binding(env, "ANTHROPIC_API_KEY")
    webhook_secret = _binding(env, "GITHUB_WEBHOOK_SECRET")
    if not github_token or not anthropic_key or not webhook_secret:
        return _json_response({"error": "SliceCheck secrets are not configured"}, 500)

    try:
        body = await request.text()  # type: ignore[attr-defined]
    except Exception as exc:
        return _json_response({"error": f"Could not read webhook body: {exc}"}, 400)

    signature = _header(request, "x-hub-signature-256")
    if not _valid_signature(body, signature, webhook_secret):
        return _json_response({"error": "Invalid webhook signature"}, 401)
    if _header(request, "x-github-event") != "pull_request":
        return _json_response({"status": "ignored", "reason": "unsupported event"}, 202)

    try:
        payload = json.loads(body)
        action = payload.get("action")
        if action not in SUPPORTED_ACTIONS:
            return _json_response({"status": "ignored", "reason": "unsupported action"}, 202)
        repo = str(payload["repository"]["full_name"])
        pull_request = payload["pull_request"]
        pr_number = int(pull_request["number"])
        pr_title = str(pull_request["title"])
        if not REPO_PATTERN.fullmatch(repo):
            raise ValueError("Webhook repository name is invalid")
        if pull_request.get("draft") is True:
            return _json_response({"status": "ignored", "reason": "draft pull request"}, 202)
    except Exception as exc:
        return _json_response({"error": f"Invalid webhook payload: {exc}"}, 400)

    gathered = await asyncio.gather(
        fetch_plan_section(repo, pr_title, github_token),
        fetch_pr_diff(repo, pr_number, github_token),
        return_exceptions=True,
    )
    errors = [str(value) for value in gathered if isinstance(value, BaseException)]
    if errors:
        result: dict[str, Any] = {
            "verdict": "ERROR",
            "gaps": errors,
            "retry_prompt": None,
        }
    else:
        plan, diff = gathered
        result = await verify_with_claude(str(plan), str(diff), pr_title, anthropic_key)

    try:
        await post_verification_comment(repo, pr_number, result, github_token)
    except Exception as exc:
        return _json_response(
            {"verdict": "ERROR", "gaps": [*result["gaps"], str(exc)], "retry_prompt": None},
            502,
        )
    return _json_response(result)


async def _handle_audit(request: object, env: object) -> Response:
    github_token = _binding(env, "GITHUB_TOKEN")
    anthropic_key = _binding(env, "ANTHROPIC_API_KEY")
    if not github_token or not anthropic_key:
        return _json_response({"error": "SliceCheck secrets are not configured"}, 500)

    query = parse_qs(urlparse(str(getattr(request, "url", ""))).query)
    repo = query.get("repo", [""])[0]
    state = query.get("state", ["open"])[0]
    plan_file = query.get("plan_file", [None])[0]
    try:
        limit = int(query.get("limit", ["10"])[0])
    except ValueError:
        return _json_response({"error": "limit must be an integer"}, 400)

    if not REPO_PATTERN.fullmatch(repo):
        return _json_response({"error": "repo must use owner/repository format"}, 400)
    if state not in {"open", "closed", "all"}:
        return _json_response({"error": "state must be open, closed, or all"}, 400)
    if not 1 <= limit <= 100:
        return _json_response({"error": "limit must be between 1 and 100"}, 400)
    if plan_file is not None and (plan_file.startswith("/") or ".." in plan_file.split("/")):
        return _json_response({"error": "plan_file must be a repository-relative path"}, 400)

    try:
        results = await run_audit(repo, limit, state, plan_file, github_token, anthropic_key)
        rendered = render_audit_html(results, repo, state, limit, plan_file)
        return Response(
            rendered,
            headers={
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            },
        )
    except Exception as exc:
        error_result = [
            {
                "pr_number": 0,
                "pr_title": "Audit error",
                "pr_url": "",
                "verdict": "ERROR",
                "gaps": [str(exc)],
                "retry_prompt": None,
                "history": [],
            }
        ]
        return Response(
            render_audit_html(error_result, repo, state, limit, plan_file),
            status=500,
            headers={
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            },
        )


async def handle_request(request: object, env: object) -> Response:
    method = str(getattr(request, "method", "GET")).upper()
    path = urlparse(str(getattr(request, "url", ""))).path
    if method == "POST" and path == "/webhook":
        return await _handle_webhook(request, env)
    if method == "GET" and path == "/audit":
        return await _handle_audit(request, env)
    if method == "GET" and path == "/health":
        return _json_response({"status": "ok"})
    return _json_response({"error": "Not found"}, 404)


class Default(WorkerEntrypoint):
    async def fetch(self, request: object) -> Response:
        return await handle_request(request, self.env)
