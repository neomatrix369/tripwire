# Slice 58 — SliceCheck Cloudflare Worker

> Scenario: Brownfield | MoSCoW: **Should** | Status: 🔀 ON BRANCH
> Wave: O — Agent Output Verification
> Depends on: none
> Request source: operator-supplied SliceCheck specification, 2026-09-02

## Slice Workflow Bundle

- Slice name: `slice-58-slicecheck-worker`
- Branch: `slice/58-slicecheck-worker`
- Product root: `slicecheck/` (isolated from the existing Tripwire runtime)
- Exit criteria: a deployable Python Cloudflare Worker verifies pull-request diffs against
  repository plan files, posts resilient webhook results, and renders retrospective audits as
  dependency-free HTML

## Goal

Add SliceCheck as a self-contained subproject without replacing Tripwire's root documentation or
runtime. GitHub and Anthropic calls use `httpx.AsyncClient`; Worker secrets come only from Cloudflare
environment bindings.

## Spec (GWT)

### GWT-58.1 — Pull-request webhook is authenticated and verified

**Given** GitHub sends an `opened`, `reopened`, or `synchronize` pull-request event
**When** `POST /webhook` receives a valid `sha256` signature
**Then** SliceCheck fetches the plan and diff concurrently, asks Claude for a verdict, and posts a
single formatted issue comment
**And** an invalid signature returns 401 before the payload is processed

### GWT-58.2 — Verification failures become ERROR results

**Given** the plan is missing, the diff is empty, or an Anthropic request/response fails
**When** verification runs
**Then** it returns `verdict=ERROR`, a specific gap, and `retry_prompt=null`
**And** no Anthropic SDK or synchronous HTTP client is imported

### GWT-58.3 — Retrospective audits run concurrently

**Given** `GET /audit?repo=owner/repo` returns multiple pull requests
**When** the audit runs
**Then** each PR's plan, diff, and SliceCheck history are gathered with `asyncio.gather`
**And** per-PR failures render as ERROR results without aborting other PRs

### GWT-58.4 — Audit output works offline and treats remote text as untrusted

**Given** audit results contain PR titles, URLs, gaps, or retry prompts from remote systems
**When** `render_audit_html` renders them
**Then** the complete document uses inline CSS and no external resources
**And** all remote text and attributes are HTML-escaped
**And** summary counts, history timeline, final verdict, recurring gaps, and the prescribed footer
are visible

### GWT-58.5 — Configuration stays repository-agnostic

**Given** a webhook payload or audit query selects a repository and optional plan file
**When** GitHub helpers run
**Then** no repository or plan path is hardcoded
**And** the default plan order is `PROGRESS.md`, `STATUS.md`, `PLAN.md`, `CLAUDE.md`

## Before-Checks

- [x] Branch `slice/58-slicecheck-worker` exists from `main`
- [x] `git status --short` confirms the pre-existing untracked `opencode.json` is not part of scope
- [x] Product boundary is `slicecheck/`; root `README.md` and existing Tripwire packages remain intact
- [x] Test plan maps GWT-58.1 to `test_worker.py`, GWT-58.2 to `test_verifier.py`,
  GWT-58.3–58.4 to `test_audit.py`, and GWT-58.5 to `test_github.py`

## After-Checks

- [x] `uv run --project slicecheck pytest slicecheck/tests -q`
  exits 0
- [x] `ruff check slicecheck` exits 0
- [x] `rg -n '(^|[[:space:]])(import|from)[[:space:]]+(requests|anthropic)' slicecheck
  --glob '*.py'` returns no matches
- [x] `rg -n "os\.environ|os\.getenv" slicecheck --glob '*.py'` returns no matches
- [x] `slicecheck/wrangler.toml`, `slicecheck/pyproject.toml`, and `slicecheck/README.md` exist
- [x] `docs/plan/gate-evidence/slice-58.json` records command results and an on-branch verdict

## Files to Touch

- `slicecheck/src/` — Worker entrypoint, GitHub helpers, verifier, audit renderer
- `slicecheck/tests/` — focused unit and async behavior tests
- `slicecheck/wrangler.toml`, `slicecheck/pyproject.toml`, `slicecheck/README.md`
- `docs/plan/README.md`, `docs/plan/TRAIL.md`, `docs/plan/PROGRESS.md`
- `docs/plan/gate-evidence/slice-58.json`

## Out of Scope

- Replacing Tripwire's root README or deployment
- Persisting audit history outside GitHub issue comments
- GitHub App installation flow or multi-tenant secret storage
- Client-side audit JavaScript or external CSS/fonts

## Gate Status

🔀 ON BRANCH — all Slice 58 After-Checks pass; review and merge are still required for ✅.
