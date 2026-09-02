from __future__ import annotations

import base64
from typing import Any

import httpx
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


class NativeResponse:
    status = 200
    headers = {"content-type": "application/json"}

    async def text(self) -> str:
        return '{"ok": true}'


@pytest.mark.asyncio
async def test_github_request_uses_workers_fetch_with_user_agent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict[str, Any]]] = []

    async def fake_workers_fetch(url: str, **options: Any) -> NativeResponse:
        calls.append((url, options))
        return NativeResponse()

    monkeypatch.setattr(github, "workers_fetch", fake_workers_fetch)
    client = StubClient([], [])

    response = await github._github_request(
        client,  # type: ignore[arg-type]
        "GET",
        "https://api.github.com/repos/owner/repo",
        github._headers("secret"),
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert calls[0][1]["headers"]["User-Agent"] == "slicecheck-worker"
    assert calls[0][1]["headers"]["Authorization"] == "Bearer secret"


@pytest.mark.asyncio
async def test_github_get_retries_denied_public_read_without_authorization() -> None:
    calls: list[dict[str, Any]] = []
    client = StubClient(
        [StubResponse(status_code=403), StubResponse({"public": True})],
        calls,
    )

    response = await github.get_github_response(
        client,  # type: ignore[arg-type]
        "https://api.github.com/repos/owner/repo",
        github._headers("secret"),
    )

    assert response.json() == {"public": True}
    assert calls[0]["headers"]["Authorization"] == "Bearer secret"
    assert "Authorization" not in calls[1]["headers"]


@pytest.mark.asyncio
async def test_github_get_retains_original_denial_when_anonymous_read_fails() -> None:
    calls: list[dict[str, Any]] = []
    denied = StubResponse(status_code=403)
    client = StubClient([denied, StubResponse(status_code=404)], calls)

    response = await github.get_github_response(
        client,  # type: ignore[arg-type]
        "https://api.github.com/repos/owner/private",
        github._headers("secret"),
    )

    assert response is denied


@pytest.mark.asyncio
async def test_github_get_can_return_public_not_found_for_plan_fallback() -> None:
    calls: list[dict[str, Any]] = []
    public_not_found = StubResponse(status_code=404)
    client = StubClient([StubResponse(status_code=403), public_not_found], calls)

    response = await github.get_github_response(
        client,  # type: ignore[arg-type]
        "https://api.github.com/repos/owner/repo/contents/PROGRESS.md",
        github._headers("secret"),
        allow_anonymous_not_found=True,
    )

    assert response is public_not_found


def test_github_error_reports_message_rate_limit_and_sso_without_response_body() -> None:
    request = httpx.Request("GET", "https://api.github.com/repos/owner/repo/pulls")
    response = httpx.Response(
        403,
        request=request,
        headers={
            "x-ratelimit-remaining": "0",
            "x-ratelimit-limit": "5000",
            "x-ratelimit-reset": "1788379200",
            "x-github-sso": "required; url=https://github.com/orgs/example/sso",
        },
        json={
            "message": "Resource not accessible by personal access token",
            "documentation_url": "https://docs.github.com/rest/using-the-rest-api",
            "token": "must-not-appear",
        },
    )

    with pytest.raises(RuntimeError) as error:
        github.raise_for_github_status(response, "listing pull requests")

    rendered = str(error.value)
    assert "GitHub API 403 while listing pull requests" in rendered
    assert "Resource not accessible by personal access token" in rendered
    assert "rate limit remaining: 0 of 5000" in rendered
    assert "GitHub SSO authorization is required" in rendered
    assert "must-not-appear" not in rendered


@pytest.mark.asyncio
async def test_plan_fallback_order_and_title_section(monkeypatch: pytest.MonkeyPatch) -> None:
    paths: list[str] = []
    plan = "# Other work\nNo.\n\n# SliceCheck Worker\nRequested details.\n\n## Child\nMore."

    async def fake_fetch(_repo: str, path: str, _token: str) -> str | None:
        paths.append(path)
        return plan if path == "docs/STATUS.md" else None

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)

    section = await github.fetch_plan_section("owner/repo", "feat: SliceCheck worker", "token")

    assert paths == [
        "docs/plan/PROGRESS.md",
        "docs/plan/TRAIL.md",
        "docs/plan/README.md",
        "docs/STATUS.md",
    ]
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
async def test_criteria_prefers_changed_slice_files_from_pr_head(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str | None]] = []
    contents = {
        "docs/plan/slices/08-H-frontline-agent-hooks/slice-23-config-handler-scripts.md": (
            "# Slice 23\n\n## Spec (GWT)\nFirst criterion."
        ),
        "docs/plan/slices/08-H-frontline-agent-hooks/slice-24-setup-agent-hooks.md": (
            "# Slice 24\n\n## Spec (GWT)\nSecond criterion."
        ),
    }

    async def fake_fetch(_repo: str, path: str, _token: str, ref: str | None = None) -> str | None:
        calls.append((path, ref))
        return contents.get(path)

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)
    diff = "\n".join(f"diff --git a/{path} b/{path}" for path in contents)

    criteria = await github.fetch_criteria_context(
        "owner/repo",
        "Frontline agent hooks",
        "",
        "token",
        diff=diff,
        head_ref="head-sha",
    )

    assert criteria.source == ", ".join(contents)
    assert "First criterion" in criteria.text and "Second criterion" in criteria.text
    assert calls == [(path, "head-sha") for path in contents]


@pytest.mark.asyncio
async def test_criteria_resolves_slice_number_through_progress_link(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    slice_path = "docs/plan/slices/15-O-slicecheck-worker/slice-58-slicecheck-worker.md"
    progress = (
        "# Progress\n\n[Slice 58](slices/15-O-slicecheck-worker/slice-58-slicecheck-worker.md)"
    )

    async def fake_fetch(_repo: str, path: str, _token: str, ref: str | None = None) -> str | None:
        if path == "docs/plan/PROGRESS.md":
            return progress
        if path == slice_path and ref == "head-sha":
            return "# Slice 58\n\n## Spec (GWT)\nShip SliceCheck."
        return None

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)

    criteria = await github.fetch_criteria_context(
        "owner/repo",
        "feat(slice-58): add SliceCheck",
        "",
        "token",
        head_ref="head-sha",
    )

    assert criteria.source == slice_path
    assert "Ship SliceCheck" in criteria.text


@pytest.mark.asyncio
async def test_criteria_does_not_use_unmatched_whole_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    paths: list[str] = []

    async def fake_fetch(_repo: str, path: str, _token: str) -> str | None:
        paths.append(path)
        if path == "docs/plan/PROGRESS.md":
            return "# Active feature work\n\nNo dependency criteria."
        return None

    monkeypatch.setattr(github, "_fetch_plan_file", fake_fetch)

    criteria = await github.fetch_criteria_context(
        "owner/repo",
        "chore(deps): bump an/action from 1 to 2",
        "Dependabot update",
        "token",
    )

    assert criteria == github.CriteriaContext("", None)
    assert "CLAUDE.md" not in paths


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
    assert calls[0]["url"].endswith("/repos/owner/repo/contents/docs/plan/PROGRESS.md")
    assert calls[1]["url"].endswith("/repos/owner/repo/contents/docs/plan/TRAIL.md")
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
async def test_fetch_workflow_runs_returns_paths_and_outcomes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, Any]] = []
    response = StubResponse(
        {
            "workflow_runs": [
                {
                    "path": ".github/workflows/ci.yml",
                    "status": "completed",
                    "conclusion": "success",
                    "ignored": "value",
                }
            ]
        }
    )
    monkeypatch.setattr(
        github.httpx,
        "AsyncClient",
        lambda **kwargs: StubClient([response], calls, **kwargs),
    )

    runs = await github.fetch_workflow_runs("owner/repo", "head sha", "token")

    assert runs == [
        {
            "path": ".github/workflows/ci.yml",
            "status": "completed",
            "conclusion": "success",
        }
    ]
    assert calls[0]["url"].endswith(
        "/repos/owner/repo/actions/runs?head_sha=head%20sha&per_page=100"
    )


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
            {
                "body": "<!-- slicecheck-verdict: UNVERIFIED -->",
                "created_at": "2026-09-01T12:03:00Z",
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
        {"timestamp": "2026-09-01T12:03:00Z", "verdict": "UNVERIFIED"},
    ]
    assert calls[0]["url"].endswith("/repos/owner/repo/issues/7/comments?per_page=100")


def test_comment_hides_retry_details_when_null() -> None:
    rendered = github.render_verification_comment(
        {
            "verdict": "FAIL",
            "gaps": ["src/a.py is missing"],
            "retry_prompt": None,
            "criteria_source": "docs/plan/slices/slice-1.md",
        }
    )

    assert "<!-- slicecheck-verdict: FAIL -->" in rendered
    assert "- src/a.py is missing" in rendered
    assert "**Criteria:** `docs/plan/slices/slice-1.md`" in rendered
    assert "<details>" not in rendered
    assert rendered.endswith("_SliceCheck · Cloudflare Workers · any repo, any agent_")


def test_comment_renders_unverified_as_reasons() -> None:
    rendered = github.render_verification_comment(
        {
            "verdict": "UNVERIFIED",
            "gaps": ["No matching acceptance criteria were found"],
            "retry_prompt": None,
            "criteria_source": None,
        }
    )

    assert "<!-- slicecheck-verdict: UNVERIFIED -->" in rendered
    assert "## ➖ SliceCheck: UNVERIFIED" in rendered
    assert "### Reasons" in rendered


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
