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
    assert body["max_tokens"] == 500
    assert "PR Title: Ship it" in body["messages"][0]["content"]
    assert body["tools"] == [verifier.VERDICT_TOOL]
    assert body["tool_choice"] == {"type": "tool", "name": "record_verdict"}


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
@pytest.mark.parametrize(
    ("plan", "diff", "gap"),
    [
        ("", "+change", "Plan file was not found or was empty"),
        ("# Plan", "", "Pull request diff was empty"),
    ],
)
async def test_verify_rejects_missing_inputs(plan: str, diff: str, gap: str) -> None:
    assert await verifier.verify_with_claude(plan, diff, "PR", "key") == {
        "verdict": "ERROR",
        "gaps": [gap],
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
