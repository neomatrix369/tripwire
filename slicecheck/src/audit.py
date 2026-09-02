"""Retrospective pull-request audit collection and offline HTML rendering."""

from __future__ import annotations

import asyncio
import html
from collections import Counter
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlparse

import httpx

if __package__:
    from .github import (
        GITHUB_API,
        fetch_plan_section,
        fetch_pr_diff,
        fetch_slicecheck_history,
    )
    from .verifier import verify_with_claude
else:
    from github import (  # type: ignore[no-redef]
        GITHUB_API,
        fetch_plan_section,
        fetch_pr_diff,
        fetch_slicecheck_history,
    )
    from verifier import verify_with_claude  # type: ignore[no-redef]

VERDICTS = ("PASS", "FAIL", "ERROR")


def _github_headers(token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "slicecheck-worker",
    }


def _error_result(pr: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    return {
        "pr_number": int(pr.get("number", 0)),
        "pr_title": str(pr.get("title", "Unknown pull request")),
        "pr_url": str(pr.get("html_url", "")),
        "verdict": "ERROR",
        "gaps": errors,
        "retry_prompt": None,
        "history": [],
    }


async def _audit_pr(
    repo: str,
    pr: dict[str, Any],
    plan_file: str | None,
    github_token: str,
    anthropic_key: str,
) -> dict[str, Any]:
    try:
        gathered = await asyncio.gather(
            fetch_plan_section(repo, str(pr["title"]), github_token, plan_file),
            fetch_pr_diff(repo, int(pr["number"]), github_token),
            fetch_slicecheck_history(repo, int(pr["number"]), github_token),
            return_exceptions=True,
        )
        errors = [str(value) for value in gathered if isinstance(value, BaseException)]
        if errors:
            return _error_result(pr, errors)
        plan, diff, history = gathered
        verification = await verify_with_claude(
            str(plan), str(diff), str(pr["title"]), anthropic_key
        )
        return {
            "pr_number": int(pr["number"]),
            "pr_title": str(pr["title"]),
            "pr_url": str(pr.get("html_url", "")),
            "verdict": verification["verdict"],
            "gaps": verification["gaps"],
            "retry_prompt": verification["retry_prompt"],
            "history": history,
        }
    except Exception as exc:
        return _error_result(pr, [str(exc)])


async def run_audit(
    repo: str,
    limit: int,
    state: str,
    plan_file: str | None,
    github_token: str,
    anthropic_key: str,
) -> list[dict[str, Any]]:
    url = f"{GITHUB_API}/repos/{repo}/pulls?state={state}&per_page={limit}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=_github_headers(github_token))
        response.raise_for_status()
        prs = response.json()
        if not isinstance(prs, list):
            raise ValueError("GitHub pull request response was not a list")
    except Exception as exc:
        repo_url = f"https://github.com/{quote(repo, safe='/')}/pulls"
        return [
            _error_result(
                {"number": 0, "title": f"Audit failed for {repo}", "html_url": repo_url},
                [str(exc)],
            )
        ]

    audited = await asyncio.gather(
        *[_audit_pr(repo, pr, plan_file, github_token, anthropic_key) for pr in prs[:limit]],
        return_exceptions=True,
    )
    results: list[dict[str, Any]] = []
    for pr, result in zip(prs, audited, strict=False):
        if isinstance(result, BaseException):
            results.append(_error_result(pr, [str(result)]))
        else:
            results.append(result)
    return results


def _verdict(value: object) -> str:
    normalized = str(value).upper()
    return normalized if normalized in VERDICTS else "ERROR"


def _safe_href(value: object) -> str:
    url = str(value)
    parsed = urlparse(url)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return html.escape(url, quote=True)
    return "#"


def _display_time(value: object) -> str:
    raw = str(value)
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed.astimezone(UTC).strftime("%Y-%m-%d %H:%M UTC")
    except ValueError:
        return raw


def _timeline(history: object, final_verdict: str) -> str:
    events = history if isinstance(history, list) else []
    parts: list[str] = []
    for event in events:
        if not isinstance(event, dict):
            continue
        verdict = _verdict(event.get("verdict"))
        time = html.escape(_display_time(event.get("timestamp", "")))
        parts.append(
            f'<span class="event {verdict.lower()}"><i></i>{verdict} <time>{time}</time></span>'
        )
    if not parts:
        parts.append('<span class="event none"><i></i>No webhook history</span>')
    final = (
        f'<span class="event {final_verdict.lower()} final"><i></i>Current: {final_verdict}</span>'
    )
    return '<span class="arrow">→</span>'.join([*parts, final])


def _recurring_gaps(results: list[dict[str, Any]]) -> list[tuple[str, int]]:
    counts: Counter[str] = Counter()
    labels: dict[str, str] = {}
    for result in results:
        seen: set[str] = set()
        gaps = result.get("gaps", [])
        if not isinstance(gaps, list):
            continue
        for gap in gaps:
            label = str(gap).strip()
            key = " ".join(label.casefold().split())
            if key and key not in seen:
                seen.add(key)
                counts[key] += 1
                labels.setdefault(key, label)
    return [(labels[key], count) for key, count in counts.most_common() if count >= 2]


def _render_card(result: dict[str, Any]) -> str:
    verdict = _verdict(result.get("verdict"))
    title = html.escape(str(result.get("pr_title", "Untitled pull request")))
    number = html.escape(str(result.get("pr_number", "?")))
    href = _safe_href(result.get("pr_url", ""))
    gaps = result.get("gaps", [])
    gap_html = ""
    if verdict != "PASS" and isinstance(gaps, list) and gaps:
        items = "".join(f"<li>{html.escape(str(gap))}</li>" for gap in gaps)
        gap_html = f'<section class="gaps"><h3>Gaps</h3><ul>{items}</ul></section>'

    retry_html = ""
    retry_prompt = result.get("retry_prompt")
    if verdict != "PASS" and retry_prompt:
        retry_html = (
            "<details><summary>Retry prompt</summary><pre><code>"
            f"{html.escape(str(retry_prompt))}</code></pre></details>"
        )

    return f"""
    <div class="pr-card {verdict.lower()}">
      <div class="card-head">
        <h2><a href="{href}">#{number} · {title}</a></h2>
        <span class="verdict {verdict.lower()}">{verdict}</span>
      </div>
      <div class="timeline">{_timeline(result.get("history"), verdict)}</div>
      {gap_html}
      {retry_html}
    </div>"""


def render_audit_html(results: list[dict[str, Any]], repo: str) -> str:
    counts = Counter(_verdict(result.get("verdict")) for result in results)
    generated = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    escaped_repo = html.escape(repo)
    cards = "".join(_render_card(result) for result in results)
    if not cards:
        cards = '<div class="empty">No pull requests matched this audit.</div>'

    patterns = _recurring_gaps(results)
    pattern_items = "".join(
        f"<li>{html.escape(label)} <span>{count} PRs</span></li>" for label, count in patterns
    )
    pattern_section = (
        f'<section class="patterns"><h2>Recurring gaps</h2><ul>{pattern_items}</ul></section>'
        if patterns
        else '<section class="patterns"><h2>Recurring gaps</h2><p>None found.</p></section>'
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SliceCheck audit · {escaped_repo}</title>
  <style>
    :root {{ color-scheme: dark; --bg:#0d1117; --panel:#161b22; --line:#30363d;
      --text:#e6edf3; --muted:#8b949e; --pass:#3fb950; --fail:#f85149; --error:#d29922; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; background:var(--bg); color:var(--text); font:15px/1.55 system-ui,sans-serif; }}
    main {{ width:min(860px,calc(100% - 32px)); margin:0 auto; padding:48px 0 32px; }}
    header {{ border-bottom:1px solid var(--line); padding-bottom:20px; }}
    h1 {{ margin:0; font-size:32px; letter-spacing:0; }}
    header p,.patterns p {{ color:var(--muted); margin:6px 0 0; }}
    .summary {{ display:flex; flex-wrap:wrap; gap:10px; padding:24px 0; }}
    .badge,.verdict {{ border:1px solid currentColor; border-radius:6px; font-weight:700; padding:5px 10px; }}
    .pass {{ color:var(--pass); }} .fail {{ color:var(--fail); }} .error {{ color:var(--error); }}
    .pr-card {{ color:var(--text); background:var(--panel); border:1px solid var(--line);
      border-left:4px solid var(--line); border-radius:8px; margin:0 0 16px; padding:20px; }}
    .pr-card.pass {{ border-left-color:var(--pass); }} .pr-card.fail {{ border-left-color:var(--fail); }}
    .pr-card.error {{ border-left-color:var(--error); }}
    .card-head {{ display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }}
    h2 {{ color:var(--text); font-size:18px; letter-spacing:0; margin:0; }}
    h2 a {{ color:var(--text); text-decoration:none; }} h2 a:hover {{ text-decoration:underline; }}
    .timeline {{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:var(--muted);
      border-top:1px solid var(--line); margin-top:16px; padding-top:14px; font-size:12px; }}
    .event {{ display:inline-flex; align-items:center; gap:5px; }}
    .event i {{ width:9px; height:9px; border-radius:50%; background:currentColor; flex:none; }}
    .event.none {{ color:var(--muted); }} .event time {{ color:var(--muted); }}
    .arrow {{ color:var(--muted); }} .gaps h3 {{ font-size:14px; margin:18px 0 6px; }}
    .gaps ul,.patterns ul {{ margin:6px 0 0; padding-left:22px; }}
    details {{ border-top:1px solid var(--line); margin-top:16px; padding-top:14px; }}
    summary {{ cursor:pointer; font-weight:650; }}
    pre {{ max-height:360px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere;
      background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:14px; }}
    code {{ color:var(--text); font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }}
    .patterns {{ border-top:1px solid var(--line); margin-top:32px; padding-top:24px; }}
    .patterns li span {{ color:var(--muted); margin-left:6px; }}
    .empty {{ color:var(--muted); border:1px dashed var(--line); border-radius:8px; padding:24px; }}
    footer {{ color:var(--muted); border-top:1px solid var(--line); margin-top:32px; padding-top:20px;
      text-align:center; }}
    @media (max-width:600px) {{ main {{ width:min(100% - 20px,860px); padding-top:24px; }}
      .card-head {{ align-items:stretch; flex-direction:column; }} .verdict {{ align-self:flex-start; }} }}
  </style>
</head>
<body>
  <main>
    <header><h1>SliceCheck</h1><p>{escaped_repo} · generated {generated}</p></header>
    <div class="summary" aria-label="Audit summary">
      <span class="badge pass">PASS {counts["PASS"]}</span>
      <span class="badge fail">FAIL {counts["FAIL"]}</span>
      <span class="badge error">ERROR {counts["ERROR"]}</span>
    </div>
    {cards}
    {pattern_section}
    <footer>SliceCheck · any repo, any agent · Cloudflare Workers</footer>
  </main>
</body>
</html>"""
