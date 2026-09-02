from __future__ import annotations

import base64
from typing import Any

import pytest

from slicecheck.src import github


class StubResponse:
    def __init__(self, payload: object = None, text: str = "", status_code: int = 200) -> None:
        self.payload = payload
        self.text = text
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self) -> object:
        return self.payload


class StubClient:
    def __init__(
        self, responses: list[StubResponse], calls: list[dict[str, Any]], **_kwargs: object
    ) -> None:
        self.responses = responses
        self.calls = calls

    async def __aenter__(self) -> StubClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def get(self, url: str, **kwargs: object) -> StubResponse:
        self.calls.append({"method": "GET", "url": url, **kwargs})
        return self.responses.pop(0)

    async def post(self, url: str, **kwargs: object) -> StubResponse:
        self.calls.append({"method": "POST", "url": url, **kwargs})
        return self.responses.pop(0)


@pytest.mark.asyncio
async def test_plan_fallback_order_and_title_section(monkeypatch: pytest.MonkeyPatch) -> None:
    paths: list[str] = []
    plan = "# Other work\nNo.\n\n# SliceCheck Worker\nRequested details.\n\n## Child\nMore."

    async def fake_fetch(_repo: str, path: str, _token: str) -> str | None:
        paths.append(path)
        return plan if path == "STATUS.md" else None

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)

    section = await github.fetch_plan_section("owner/repo", "feat: SliceCheck worker", "token")

    assert paths == ["PROGRESS.md", "STATUS.md"]
    assert section.startswith("# SliceCheck Worker")
    assert "# Other work" not in section


@pytest.mark.asyncio
async def test_explicit_plan_file_does_not_fall_back(monkeypatch: pytest.MonkeyPatch) -> None:
    paths: list[str] = []

    async def fake_fetch(_repo: str, path: str, _token: str) -> None:
        paths.append(path)
        return None

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)

    assert await github.fetch_plan_section("owner/repo", "PR", "token", "docs/work.md") == ""
    assert paths == ["docs/work.md"]


@pytest.mark.asyncio
async def test_plan_transport_decodes_content_and_falls_back_from_404(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, Any]] = []
    encoded = base64.b64encode(b"# Build Worker\nShip it.").decode()
    responses = [
        StubResponse({}, status_code=404),
        StubResponse({"encoding": "base64", "content": encoded}),
    ]
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(responses, calls, **kwargs),
    )

    result = await github.fetch_plan_section("owner/repo", "Build Worker", "token")

    assert result == "# Build Worker\nShip it."
    assert calls[0]["url"].endswith("/repos/owner/repo/contents/PROGRESS.md")
    assert calls[1]["url"].endswith("/repos/owner/repo/contents/STATUS.md")
    assert calls[0]["headers"]["Authorization"] == "Bearer token"


@pytest.mark.asyncio
async def test_plan_transport_rejects_unsupported_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient(
            [StubResponse({"encoding": "none", "content": "plain"})], [], **kwargs
        ),
    )

    with pytest.raises(RuntimeError, match="unsupported content"):
        await github.fetch_plan_section("owner/repo", "PR", "token", "PLAN.md")


@pytest.mark.asyncio
async def test_fetch_diff_uses_diff_media_type(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient([StubResponse(text="diff --git a/a b/a")], calls, **kwargs),
    )

    result = await github.fetch_pr_diff("owner/repo", 12, "token")

    assert result == "diff --git a/a b/a"
    assert calls[0]["url"].endswith("/repos/owner/repo/pulls/12")
    assert calls[0]["headers"]["Accept"] == "application/vnd.github.v3.diff"


@pytest.mark.asyncio
async def test_fetch_diff_wraps_http_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient([StubResponse(status_code=500)], [], **kwargs),
    )

    with pytest.raises(RuntimeError, match="Failed to fetch diff for PR #12: HTTP 500"):
        await github.fetch_pr_diff("owner/repo", 12, "token")


@pytest.mark.asyncio
async def test_fetch_history_extracts_only_slicecheck_comments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, Any]] = []
    response = StubResponse(
        [
            {
                "body": "<!-- slicecheck-verdict: PASS -->\nLooks good",
                "created_at": "2026-09-01T12:00:00Z",
            },
            {"body": "ordinary comment", "created_at": "2026-09-01T12:01:00Z"},
            {
                "body": "<!-- slicecheck: fail -->",
                "created_at": "2026-09-01T12:02:00Z",
            },
        ]
    )
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient([response], calls, **kwargs),
    )

    history = await github.fetch_slicecheck_history("owner/repo", 7, "token")

    assert history == [
        {"timestamp": "2026-09-01T12:00:00Z", "verdict": "PASS"},
        {"timestamp": "2026-09-01T12:02:00Z", "verdict": "FAIL"},
    ]
    assert calls[0]["url"].endswith("/repos/owner/repo/issues/7/comments?per_page=100")


def test_comment_hides_retry_details_when_null() -> None:
    rendered = github.render_verification_comment(
        {"verdict": "FAIL", "gaps": ["src/a.py is missing"], "retry_prompt": None}
    )

    assert "<!-- slicecheck-verdict: FAIL -->" in rendered
    assert "- src/a.py is missing" in rendered
    assert "<details>" not in rendered
    assert rendered.endswith("_SliceCheck · Cloudflare Workers · any repo, any agent_")


@pytest.mark.asyncio
async def test_post_comment_includes_retry_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient([StubResponse({})], calls, **kwargs),
    )

    await github.post_verification_comment(
        "owner/repo",
        4,
        {"verdict": "FAIL", "gaps": ["missing"], "retry_prompt": "Add src/a.py"},
        "token",
    )

    assert calls[0]["method"] == "POST"
    assert "<details>" in calls[0]["json"]["body"]
    assert "Add src/a.py" in calls[0]["json"]["body"]
