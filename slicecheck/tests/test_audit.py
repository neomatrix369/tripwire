from __future__ import annotations

import asyncio
from typing import Any

import pytest
from slicecheck.src import audit, github


class StubResponse:
    def __init__(self, payload: object) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> object:
        return self.payload


class StubClient:
    def __init__(self, payload: object, **_kwargs: object) -> None:
        self.payload = payload

    async def __aenter__(self) -> StubClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def get(self, _url: str, **_kwargs: object) -> StubResponse:
        return StubResponse(self.payload)


@pytest.mark.asyncio
async def test_run_audit_fetches_all_pr_inputs_concurrently(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    prs = [
        {
            "number": 1,
            "title": "First",
            "html_url": "https://github.com/o/r/pull/1",
            "state": "open",
        },
        {
            "number": 2,
            "title": "Second",
            "html_url": "https://github.com/o/r/pull/2",
            "state": "closed",
            "merged_at": "2026-09-01T12:00:00Z",
        },
    ]
    monkeypatch.setattr(audit.httpx, "AsyncClient", lambda **kwargs: StubClient(prs, **kwargs))
    started: list[str] = []
    all_started = asyncio.Event()

    async def rendezvous(label: str, result: Any) -> Any:
        started.append(label)
        if len(started) == 6:
            all_started.set()
        await asyncio.wait_for(all_started.wait(), timeout=1)
        return result

    async def fake_criteria(
        _repo: str,
        title: str,
        _body: str,
        _token: str,
        _path: str | None,
        **_kwargs: object,
    ) -> github.CriteriaContext:
        return await rendezvous(
            f"criteria:{title}", github.CriteriaContext(f"plan {title}", f"slice-{title}.md")
        )

    async def fake_diff(_repo: str, number: int, _token: str) -> str:
        return await rendezvous(f"diff:{number}", f"diff {number}")

    async def fake_history(_repo: str, number: int, _token: str) -> list[dict[str, str]]:
        return await rendezvous(
            f"history:{number}", [{"timestamp": "2026-09-01T12:00:00Z", "verdict": "PASS"}]
        )

    async def fake_verify(_plan: str, _diff: str, title: str, _key: str) -> dict[str, Any]:
        verdict = "PASS" if title == "First" else "FAIL"
        return {
            "verdict": verdict,
            "gaps": [] if verdict == "PASS" else ["missing test"],
            "retry_prompt": None,
        }

    monkeypatch.setattr(audit, "fetch_criteria_context", fake_criteria)
    monkeypatch.setattr(audit, "fetch_pr_diff", fake_diff)
    monkeypatch.setattr(audit, "fetch_slicecheck_history", fake_history)
    monkeypatch.setattr(audit, "verify_with_claude", fake_verify)

    results = await audit.run_audit("o/r", 2, "open", None, "token", "key")

    assert len(started) == 6
    assert [result["verdict"] for result in results] == ["PASS", "FAIL"]
    assert [result["pr_status"] for result in results] == ["open", "merged"]
    assert results[0]["criteria_source"] == "slice-First.md"
    assert results[0]["history"][0]["verdict"] == "PASS"


@pytest.mark.asyncio
async def test_run_audit_isolates_per_pr_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    prs = [
        {
            "number": 1,
            "title": "Broken",
            "html_url": "https://github.com/o/r/pull/1",
            "state": "open",
            "draft": True,
        },
        {
            "number": 2,
            "title": "Healthy",
            "html_url": "https://github.com/o/r/pull/2",
            "state": "closed",
        },
    ]
    monkeypatch.setattr(audit.httpx, "AsyncClient", lambda **kwargs: StubClient(prs, **kwargs))

    async def fake_criteria(
        _repo: str,
        title: str,
        _body: str,
        _token: str,
        _path: str | None,
        **_kwargs: object,
    ) -> github.CriteriaContext:
        if title == "Broken":
            raise RuntimeError("plan API failed")
        return github.CriteriaContext("plan", "docs/plan/slice.md")

    async def fake_diff(_repo: str, _number: int, _token: str) -> str:
        return "diff"

    async def fake_history(_repo: str, _number: int, _token: str) -> list[dict[str, str]]:
        return []

    async def fake_verify(*_args: object) -> dict[str, Any]:
        return {"verdict": "PASS", "gaps": [], "retry_prompt": None}

    monkeypatch.setattr(audit, "fetch_criteria_context", fake_criteria)
    monkeypatch.setattr(audit, "fetch_pr_diff", fake_diff)
    monkeypatch.setattr(audit, "fetch_slicecheck_history", fake_history)
    monkeypatch.setattr(audit, "verify_with_claude", fake_verify)

    results = await audit.run_audit("o/r", 2, "open", None, "token", "key")

    assert results[0]["verdict"] == "ERROR"
    assert results[0]["pr_status"] == "draft"
    assert results[0]["gaps"] == ["plan API failed"]
    assert results[1]["verdict"] == "PASS"


def test_render_audit_html_is_offline_escaped_and_complete() -> None:
    results = [
        {
            "pr_number": 1,
            "pr_title": "<script>alert(1)</script>",
            "pr_url": "javascript:alert(1)",
            "pr_status": "draft",
            "criteria_source": "docs/plan/slices/<slice-1>.md",
            "verdict": "FAIL",
            "gaps": ["Missing <b>tests</b>"],
            "retry_prompt": "Use </code><script>bad()</script>",
            "history": [{"timestamp": "2026-09-01T12:00:00Z", "verdict": "PASS"}],
        },
        {
            "pr_number": 2,
            "pr_title": "Second",
            "pr_url": "https://github.com/o/r/pull/2?a=1&b=2",
            "pr_status": "merged",
            "criteria_source": None,
            "verdict": "UNVERIFIED",
            "gaps": ["Missing <b>tests</b>"],
            "retry_prompt": None,
            "history": [],
        },
        {
            "pr_number": 3,
            "pr_title": "Third",
            "pr_url": "https://github.com/o/r/pull/3",
            "pr_status": "closed",
            "criteria_source": None,
            "verdict": "ERROR",
            "gaps": ["GitHub unavailable"],
            "retry_prompt": None,
            "history": [],
        },
    ]

    rendered = audit.render_audit_html(results, "o/<repo>", "closed", 5, "docs/<PLAN>.md")

    assert rendered.startswith("<!DOCTYPE html>")
    assert "<style>" in rendered
    assert "<script>" not in rendered
    assert "<link" not in rendered
    assert 'href="#"' in rendered
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in rendered
    assert "Missing &lt;b&gt;tests&lt;/b&gt; <span>2 PRs</span>" in rendered
    assert "No webhook history" in rendered
    assert "Current: FAIL" in rendered
    assert "Scope</strong>Closed PRs" in rendered
    assert "Limit</strong>5 PRs" in rendered
    assert "Plan</strong>docs/&lt;PLAN&gt;.md" in rendered
    assert "PR DRAFT" in rendered and "PR MERGED" in rendered
    assert "Criteria</strong> docs/plan/slices/&lt;slice-1&gt;.md" in rendered
    assert "Criteria</strong> None matched" in rendered
    assert "Current: UNVERIFIED" in rendered
    assert "PASS 0" in rendered and "FAIL 1" in rendered
    assert "UNVERIFIED 1" in rendered and "ERROR 1" in rendered
    assert "#0d1117" in rendered and "#3fb950" in rendered and "#f85149" in rendered
    assert "SliceCheck · any repo, any agent · Cloudflare Workers" in rendered


def test_render_audit_html_handles_empty_results() -> None:
    rendered = audit.render_audit_html([], "owner/repo")

    assert "No pull requests matched this audit." in rendered
    assert "None found." in rendered
