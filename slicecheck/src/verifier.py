"""Claude-backed comparison of planned work and pull-request diffs."""

from __future__ import annotations

import json
from typing import Any

import httpx

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


async def verify_with_claude(plan: str, diff: str, pr_title: str, api_key: str) -> dict[str, Any]:
    if not plan.strip():
        return _error("Plan file was not found or was empty")
    if not diff.strip():
        return _error("Pull request diff was empty")

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                ANTHROPIC_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": MODEL,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": _prompt(plan, diff, pr_title)}],
                },
            )
        response.raise_for_status()
        payload = response.json()
        text = payload["content"][0]["text"]
        return _validated_result(json.loads(text))
    except Exception as exc:
        return _error(str(exc))
