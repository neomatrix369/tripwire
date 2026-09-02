"""Claude-backed comparison of planned work and pull-request diffs."""

from __future__ import annotations

import json
from http import HTTPMethod
from typing import Any

import httpx

try:
    from workers import fetch as workers_fetch
except ImportError:  # pragma: no cover - the native transport exists only in Workers
    workers_fetch = None  # type: ignore[assignment]

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-haiku-4-5-20251001"


def _error(message: str) -> dict[str, Any]:
    return {"verdict": "ERROR", "gaps": [message], "retry_prompt": None}


def _prompt(plan: str, diff: str, pr_title: str) -> str:
    return f"""You are an agent output verifier. A coding agent opened a pull request.

PR Title: {pr_title}

PLANNED WORK:
{plan}

ACTUAL DIFF:
{diff}

Did the agent complete the planned work?

Respond ONLY in this exact JSON format, no other text:
{{
  "verdict": "PASS" or "FAIL",
  "gaps": ["specific thing missing 1", "specific thing missing 2"],
  "retry_prompt": "Paste-ready instruction for the agent to fix the gaps, or null if PASS"
}}

Be specific about gaps. Reference actual file names or functions from the diff.
If the plan file was not found or the diff is empty, return verdict ERROR.
"""


def _validated_result(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Claude response must be a JSON object")
    verdict = value.get("verdict")
    gaps = value.get("gaps")
    retry_prompt = value.get("retry_prompt")
    if verdict not in {"PASS", "FAIL", "ERROR"}:
        raise ValueError(f"Invalid Claude verdict: {verdict!r}")
    if not isinstance(gaps, list) or not all(isinstance(gap, str) for gap in gaps):
        raise ValueError("Claude gaps must be a list of strings")
    if retry_prompt is not None and not isinstance(retry_prompt, str):
        raise ValueError("Claude retry_prompt must be a string or null")
    return {"verdict": verdict, "gaps": gaps, "retry_prompt": retry_prompt}


def _parse_claude_result(text: str) -> dict[str, Any]:
    candidate = text.strip()
    if candidate.startswith("```") and candidate.endswith("```"):
        lines = candidate.splitlines()
        if len(lines) >= 3:
            candidate = "\n".join(lines[1:-1]).strip()
    if not candidate:
        raise ValueError("Claude returned an empty response")
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned invalid JSON: {exc}") from exc
    return _validated_result(parsed)


async def _post_anthropic(
    client: httpx.AsyncClient, headers: dict[str, str], body: dict[str, Any]
) -> httpx.Response:
    if workers_fetch is None:
        return await client.post(ANTHROPIC_URL, headers=headers, json=body)

    native_response = await workers_fetch(
        ANTHROPIC_URL,
        method=HTTPMethod.POST,
        headers=headers,
        body=json.dumps(body),
    )
    response_text = await native_response.text()
    return httpx.Response(
        int(native_response.status),
        headers=dict(native_response.headers.items()),
        text=response_text,
        request=httpx.Request("POST", ANTHROPIC_URL),
    )


def _raise_for_anthropic_status(response: httpx.Response) -> None:
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        try:
            payload = response.json()
        except Exception:
            payload = None
        error = payload.get("error") if isinstance(payload, dict) else None
        message = error.get("message") if isinstance(error, dict) else None
        detail = f": {message}" if isinstance(message, str) and message else ""
        raise RuntimeError(f"Anthropic API {response.status_code}{detail}") from exc


async def verify_with_claude(plan: str, diff: str, pr_title: str, api_key: str) -> dict[str, Any]:
    if not plan.strip():
        return _error("Plan file was not found or was empty")
    if not diff.strip():
        return _error("Pull request diff was empty")

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await _post_anthropic(
                client,
                {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                {
                    "model": MODEL,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": _prompt(plan, diff, pr_title)}],
                },
            )
        _raise_for_anthropic_status(response)
        payload = response.json()
        text = payload["content"][0]["text"]
        return _parse_claude_result(text)
    except Exception as exc:
        return _error(str(exc))
