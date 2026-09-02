# SliceCheck

Automatic agent-output verifier. Works with any GitHub repository. On supported non-draft pull
request events, it cross-references matched acceptance criteria against the diff and posts a PASS,
FAIL, UNVERIFIED, or ERROR result plus a retry prompt when applicable. It can also audit past pull
requests from a URL.

## Deploy to any project

### 1. Install

```bash
cd slicecheck
npm install -g wrangler
wrangler login
uv sync --dev
```

### 2. Set secrets

```bash
uv run pywrangler secret put GITHUB_TOKEN
uv run pywrangler secret put GITHUB_WEBHOOK_SECRET
uv run pywrangler secret put ANTHROPIC_API_KEY
```

`GITHUB_TOKEN` needs access to repository contents, pull requests, and issue comments. Use a random
webhook secret of at least 20 characters.

### 3. Deploy

```bash
uv run pywrangler deploy
```

Note the deployed URL, such as `https://slicecheck.<your-account>.workers.dev`.

### 4. Register the webhook

For each repository, open **Settings → Webhooks → Add webhook** and configure:

- Payload URL: `https://slicecheck.<your-account>.workers.dev/webhook`
- Content type: `application/json`
- Secret: the value used for `GITHUB_WEBHOOK_SECRET`
- Events: pull requests only

Draft pull requests are ignored and receive no SliceCheck comment. Moving a draft to ready for
review triggers verification; subsequent pushes trigger it again. Read-only audits may still show
drafts when they match the selected scope.

### 5. Audit past pull requests

Open one of these URLs in a browser:

```text
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/reponame
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/repo&limit=10&state=open
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/repo&plan_file=docs/STATUS.md
```

The generated report contains inline CSS and no external resources, so saving the response as an
HTML file produces an audit that works offline.

The report header shows the selected PR scope, result limit, and plan source. Each result card
separately identifies the PR lifecycle (`Open`, `Draft`, `Merged`, or `Closed`) and the current
SliceCheck verdict (`PASS`, `FAIL`, `UNVERIFIED`, or `ERROR`), and names the matched criteria
source.

## Criteria discovery

An explicit `plan_file` query is authoritative. Otherwise SliceCheck uses these curated sources:

1. Slice specifications under `docs/plan/slices/` changed or referenced by the PR
2. Slice links in `docs/plan/PROGRESS.md`, `docs/plan/TRAIL.md`, or `docs/plan/README.md`
3. Matching sections in those trackers, `docs/STATUS.md`, or conventional root plan files

SliceCheck does not treat an unmatched whole document as acceptance criteria. No match produces
`UNVERIFIED`, not an inferred `PASS`. Override discovery for an audit with
`?plan_file=YOUR_FILE.md`.

Verdicts have distinct meanings:

- `PASS`: matched criteria are satisfied by the diff
- `FAIL`: matched criteria have specific implementation gaps
- `UNVERIFIED`: no matching criteria or insufficient completion evidence
- `ERROR`: an API, transport, or model response failed

## How it works

1. An agent opens, updates, reopens, or marks a pull request ready for review.
2. GitHub sends the signed pull-request webhook.
3. SliceCheck discovers criteria and fetches the pull-request diff concurrently.
4. Changed slice specifications are loaded from the PR head and Claude compares them with the diff.
5. SliceCheck posts the verdict, criteria source, specific gaps, and optional retry prompt.
6. Each new push adds another comment, creating a progressive verification history.

All outbound calls use `httpx.AsyncClient`. The Anthropic Messages API is called directly; the
Anthropic SDK is not used. Secrets are read only from Cloudflare Worker environment bindings.
`pywrangler` bundles the packages declared in `pyproject.toml` into the deployed Worker.

## Test

From the Tripwire repository root:

```bash
uv run --project slicecheck pytest slicecheck/tests -q
uv run --project slicecheck ruff check slicecheck
```
