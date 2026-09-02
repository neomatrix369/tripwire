from __future__ import annotations

import json

import pytest
from slicecheck.src import verifier


class StubResponse:
    def __init__(self, payload: object, error: Exception | None = None) -> None:
        self.payload = payload
        self.error = error

    def raise_for_status(self) -> None:
        if self.error:
            raise self.error

    def json(self) -> object:
        return self.payload


class StubClient:
    def __init__(
        self, response: StubResponse, calls: list[dict[str, object]], **kwargs: object
    ) -> None:
        self.response = response
        self.calls = calls
        self.calls.append({"client": kwargs})

    async def __aenter__(self) -> StubClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(self, url: str, **kwargs: object) -> StubResponse:
        self.calls.append({"url": url, **kwargs})
        return self.response


class NativeResponse:
    status = 200
    headers = {"content-type": "application/json"}

    def __init__(self, payload: object) -> None:
        self.payload = payload

    async def text(self) -> str:
        return json.dumps(self.payload)


def dependency_diff(*paths: str, extra_change: bool = False) -> str:
    sections = []
    for path in paths:
        lines = [
            f"diff --git a/{path} b/{path}",
            "-      uses: actions/github-script@v7",
            "+      uses: actions/github-script@v9",
        ]
        if extra_change:
            lines.extend(["-      timeout-minutes: 5", "+      timeout-minutes: 10"])
        sections.append("\n".join(lines))
    return "\n".join(sections)


@pytest.mark.asyncio
async def test_verify_uses_prescribed_anthropic_request(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict[str, object]] = []
    result_json = {"verdict": "PASS", "gaps": [], "retry_prompt": None}
    response = StubResponse({"content": [{"text": json.dumps(result_json)}]})
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, calls, **kwargs),
    )

    result = await verifier.verify_with_claude("# Plan", "+implemented", "Ship it", "key")

    assert result == result_json
    assert calls[0] == {"client": {"timeout": 25.0}}
    request = calls[1]
    assert request["url"] == "https://api.anthropic.com/v1/messages"
    assert request["headers"] == {
        "x-api-key": "key",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = request["json"]
    assert isinstance(body, dict)
    assert body["model"] == "claude-haiku-4-5-20251001"
    assert body["max_tokens"] == verifier.MAX_OUTPUT_TOKENS
    assert body["system"] == verifier.SYSTEM_PROMPT
    assert "PR Title: Ship it" in body["messages"][0]["content"]
    assert body["output_config"] == {
        "format": {"type": "json_schema", "schema": verifier.VERDICT_SCHEMA}
    }


@pytest.mark.asyncio
async def test_verify_prefers_structured_tool_result(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = {"verdict": "FAIL", "gaps": ["missing test"], "retry_prompt": "Add test"}
    response = StubResponse(
        {
            "content": [
                {
                    "type": "tool_use",
                    "name": "record_verdict",
                    "input": expected,
                }
            ]
        }
    )
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, [], **kwargs),
    )

    assert await verifier.verify_with_claude("plan", "diff", "PR", "key") == expected


@pytest.mark.asyncio
async def test_verify_uses_workers_fetch_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, dict[str, object]]] = []
    result_json = {"verdict": "PASS", "gaps": [], "retry_prompt": None}

    async def fake_workers_fetch(url: str, **options: object) -> NativeResponse:
        calls.append((url, options))
        return NativeResponse({"content": [{"text": json.dumps(result_json)}]})

    monkeypatch.setattr(verifier, "workers_fetch", fake_workers_fetch)
    result = await verifier.verify_with_claude("# Plan", "+implemented", "Ship it", "key")

    assert result == result_json
    assert calls[0][0] == verifier.ANTHROPIC_URL
    assert calls[0][1]["method"] == "POST"
    assert calls[0][1]["headers"]["x-api-key"] == "key"


@pytest.mark.asyncio
async def test_verify_accepts_fenced_json(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = {"verdict": "FAIL", "gaps": ["missing test"], "retry_prompt": "Add test"}
    fenced = f"```json\n{json.dumps(expected)}\n```"
    response = StubResponse({"content": [{"text": fenced}]})
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, [], **kwargs),
    )

    assert await verifier.verify_with_claude("plan", "diff", "PR", "key") == expected


@pytest.mark.asyncio
async def test_verify_without_matching_criteria_is_unverified() -> None:
    assert await verifier.verify_with_claude("", "+change", "PR", "key") == {
        "verdict": "UNVERIFIED",
        "gaps": ["No matching acceptance criteria were found for this pull request"],
        "retry_prompt": None,
    }


@pytest.mark.asyncio
async def test_verify_rejects_empty_diff() -> None:
    assert await verifier.verify_with_claude("# Plan", "", "PR", "key") == {
        "verdict": "ERROR",
        "gaps": ["Pull request diff was empty"],
        "retry_prompt": None,
    }


@pytest.mark.asyncio
async def test_verify_turns_invalid_response_into_error(monkeypatch: pytest.MonkeyPatch) -> None:
    response = StubResponse({"content": [{"text": "not json"}]})
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, [], **kwargs),
    )

    result = await verifier.verify_with_claude("plan", "diff", "PR", "key")

    assert result["verdict"] == "ERROR"
    assert result["retry_prompt"] is None
    assert "Claude returned invalid JSON" in result["gaps"][0]


@pytest.mark.asyncio
async def test_verify_reports_truncated_structured_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = StubResponse(
        {
            "stop_reason": "max_tokens",
            "content": [{"type": "text", "text": '{"verdict":"FAIL","gaps":["cut'}],
        }
    )
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, [], **kwargs),
    )

    result = await verifier.verify_with_claude("plan", "diff", "PR", "key")

    assert result == {
        "verdict": "ERROR",
        "gaps": [f"Claude response exceeded the {verifier.MAX_OUTPUT_TOKENS}-token output budget"],
        "retry_prompt": None,
    }


@pytest.mark.asyncio
async def test_verify_turns_http_failure_into_error(monkeypatch: pytest.MonkeyPatch) -> None:
    response = StubResponse({}, RuntimeError("upstream unavailable"))
    monkeypatch.setattr(
        verifier.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(response, [], **kwargs),
    )

    result = await verifier.verify_with_claude("plan", "diff", "PR", "key")

    assert result == {
        "verdict": "ERROR",
        "gaps": ["upstream unavailable"],
        "retry_prompt": None,
    }


def test_dependency_update_passes_only_when_every_changed_workflow_ran() -> None:
    title = "chore(deps): bump actions/github-script from 7 to 9"
    paths = (".github/workflows/ci.yml", ".github/workflows/nightly.yml")
    runs = [{"path": path, "status": "completed", "conclusion": "success"} for path in paths]

    result = verifier.evaluate_github_actions_dependency_update(
        title, dependency_diff(*paths), runs
    )

    assert result == {
        "verdict": "PASS",
        "gaps": [],
        "retry_prompt": None,
        "criteria_source": verifier.DEPENDENCY_CRITERIA_SOURCE,
    }


def test_dependency_update_is_unverified_when_changed_workflow_did_not_run() -> None:
    title = "chore(deps): bump actions/github-script from 7 to 9"
    paths = (".github/workflows/ci.yml", ".github/workflows/nightly.yml")
    runs = [
        {
            "path": ".github/workflows/ci.yml",
            "status": "completed",
            "conclusion": "success",
        }
    ]

    result = verifier.evaluate_github_actions_dependency_update(
        title, dependency_diff(*paths), runs
    )

    assert result is not None
    assert result["verdict"] == "UNVERIFIED"
    assert ".github/workflows/nightly.yml" in result["gaps"][0]


def test_dependency_update_fails_on_failed_run_or_extra_diff() -> None:
    title = "chore(deps): bump actions/github-script from 7 to 9"
    path = ".github/workflows/ci.yml"
    failed = [{"path": path, "status": "completed", "conclusion": "failure"}]

    failed_run = verifier.evaluate_github_actions_dependency_update(
        title, dependency_diff(path), failed
    )
    unexpected_diff = verifier.evaluate_github_actions_dependency_update(
        title, dependency_diff(path, extra_change=True), failed
    )

    assert failed_run is not None and failed_run["verdict"] == "FAIL"
    assert unexpected_diff is not None and unexpected_diff["verdict"] == "FAIL"
    assert "beyond the declared" in unexpected_diff["gaps"][0]
