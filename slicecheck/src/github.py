"""Async GitHub API helpers used by webhook and audit flows."""

from __future__ import annotations

import base64
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

import httpx

GITHUB_API = "https://api.github.com"
DEFAULT_PLAN_FILES = ("PROGRESS.md", "STATUS.md", "PLAN.md", "CLAUDE.md")
SLICECHECK_MARKER = re.compile(
    r"<!--\s*slicecheck(?:-verdict)?\s*:\s*(PASS|FAIL|ERROR)\s*-->", re.IGNORECASE
)


def _headers(token: str, accept: str = "application/vnd.github+json") -> dict[str, str]:
    return {
        "Accept": accept,
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "slicecheck-worker",
    }


def raise_for_github_status(response: httpx.Response, operation: str) -> None:
    """Raise a safe, actionable error for a failed GitHub API response."""
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        try:
            payload = response.json()
        except Exception:
            payload = None

        message = payload.get("message") if isinstance(payload, dict) else None
        details = [f"GitHub API {response.status_code} while {operation}"]
        if isinstance(message, str) and message:
            details.append(message)

        remaining = response.headers.get("x-ratelimit-remaining")
        limit = response.headers.get("x-ratelimit-limit")
        reset = response.headers.get("x-ratelimit-reset")
        if remaining is not None:
            rate_limit = f"rate limit remaining: {remaining}"
            if limit is not None:
                rate_limit += f" of {limit}"
            if reset is not None:
                try:
                    reset_at = datetime.fromtimestamp(int(reset), UTC).strftime(
                        "%Y-%m-%d %H:%M UTC"
                    )
                    rate_limit += f"; resets {reset_at}"
                except (OverflowError, TypeError, ValueError):
                    rate_limit += f"; reset timestamp {reset}"
            details.append(rate_limit)

        if response.headers.get("x-github-sso"):
            details.append("GitHub SSO authorization is required")

        documentation_url = payload.get("documentation_url") if isinstance(payload, dict) else None
        if isinstance(documentation_url, str) and documentation_url:
            details.append(documentation_url)
        raise RuntimeError("; ".join(details)) from exc


def _normalize_heading(value: str) -> set[str]:
    ignored = {"feat", "feature", "fix", "chore", "docs", "refactor", "pr"}
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.casefold())
        if len(token) > 1 and token not in ignored
    }


def _matching_plan_section(plan: str, pr_title: str) -> str:
    """Return the closest Markdown section, or the complete plan when no section matches."""
    headings = list(re.finditer(r"(?m)^(#{1,6})\s+(.+?)\s*$", plan))
    title_tokens = _normalize_heading(pr_title)
    if not headings or not title_tokens:
        return plan

    best: tuple[float, int, int] | None = None
    for index, heading in enumerate(headings):
        heading_tokens = _normalize_heading(heading.group(2))
        if not heading_tokens:
            continue
        overlap = len(title_tokens & heading_tokens)
        score = overlap / len(title_tokens | heading_tokens)
        if overlap and (best is None or score > best[0]):
            best = (score, index, overlap)

    if best is None:
        return plan

    _, index, overlap = best
    minimum_overlap = 1 if len(title_tokens) <= 2 else 2
    if overlap < minimum_overlap:
        return plan

    start = headings[index].start()
    level = len(headings[index].group(1))
    end = len(plan)
    for following in headings[index + 1 :]:
        if len(following.group(1)) <= level:
            end = following.start()
            break
    return plan[start:end].strip()


async def _fetch_plan_file(repo: str, path: str, token: str) -> str | None:
    encoded_path = quote(path.strip("/"), safe="/")
    url = f"{GITHUB_API}/repos/{repo}/contents/{encoded_path}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=_headers(token))
        if response.status_code == 404:
            return None
        raise_for_github_status(response, f"fetching plan file {path}")
        payload = response.json()
        if payload.get("encoding") != "base64" or not isinstance(payload.get("content"), str):
            raise ValueError(f"GitHub returned unsupported content for {path}")
        return base64.b64decode(payload["content"]).decode("utf-8")
    except Exception as exc:
        if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 404:
            return None
        raise RuntimeError(f"Failed to fetch plan file {path}: {exc}") from exc


async def fetch_plan_section(
    repo: str, pr_title: str, github_token: str, plan_file: str | None = None
) -> str:
    """Fetch a configured plan file and select the section closest to the PR title."""
    candidates = (plan_file,) if plan_file else DEFAULT_PLAN_FILES
    for candidate in candidates:
        if not candidate:
            continue
        plan = await _fetch_plan_file(repo, candidate, github_token)
        if plan is not None:
            return _matching_plan_section(plan, pr_title)
    return ""


async def fetch_pr_diff(repo: str, pr_number: int, github_token: str) -> str:
    url = f"{GITHUB_API}/repos/{repo}/pulls/{pr_number}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url, headers=_headers(github_token, "application/vnd.github.v3.diff")
            )
        raise_for_github_status(response, f"fetching pull request #{pr_number} diff")
        return str(response.text)
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch diff for PR #{pr_number}: {exc}") from exc


async def fetch_slicecheck_history(
    repo: str, pr_number: int, github_token: str
) -> list[dict[str, str]]:
    url = f"{GITHUB_API}/repos/{repo}/issues/{pr_number}/comments?per_page=100"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=_headers(github_token))
        raise_for_github_status(response, f"fetching pull request #{pr_number} comments")
        comments = response.json()
        history: list[dict[str, str]] = []
        for comment in comments:
            body = comment.get("body", "")
            match = SLICECHECK_MARKER.search(body) if isinstance(body, str) else None
            timestamp = comment.get("created_at")
            if match and isinstance(timestamp, str):
                history.append({"timestamp": timestamp, "verdict": match.group(1).upper()})
        return history
    except Exception as exc:
        raise RuntimeError(
            f"Failed to fetch SliceCheck history for PR #{pr_number}: {exc}"
        ) from exc


def render_verification_comment(result: dict[str, Any]) -> str:
    verdict = str(result.get("verdict", "ERROR")).upper()
    if verdict not in {"PASS", "FAIL", "ERROR"}:
        verdict = "ERROR"
    icon = {"PASS": "✅", "FAIL": "❌", "ERROR": "⚠️"}[verdict]
    lines = [
        f"<!-- slicecheck-verdict: {verdict} -->",
        f"## {icon} SliceCheck: {verdict}",
    ]

    gaps = result.get("gaps") or []
    if verdict == "PASS":
        lines.extend(["", "The pull request matches the planned work."])
    elif gaps:
        lines.extend(["", "### Gaps", *[f"- {gap}" for gap in gaps]])

    retry_prompt = result.get("retry_prompt")
    if retry_prompt:
        lines.extend(
            [
                "",
                "<details>",
                "<summary>Retry prompt</summary>",
                "",
                "```text",
                str(retry_prompt),
                "```",
                "</details>",
            ]
        )

    lines.extend(["", "---", "_SliceCheck · Cloudflare Workers · any repo, any agent_"])
    return "\n".join(lines)


async def post_verification_comment(
    repo: str, pr_number: int, result: dict[str, Any], github_token: str
) -> None:
    url = f"{GITHUB_API}/repos/{repo}/issues/{pr_number}/comments"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                headers=_headers(github_token),
                json={"body": render_verification_comment(result)},
            )
        raise_for_github_status(response, f"posting pull request #{pr_number} comment")
    except Exception as exc:
        raise RuntimeError(f"Failed to post SliceCheck comment on PR #{pr_number}: {exc}") from exc
