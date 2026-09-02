# SliceCheck

Automatic agent-output verifier. Works with any GitHub repository. Fires on every pull request,
cross-references a plan file against the diff, and posts a PASS/FAIL result plus a retry prompt.
It can also audit past pull requests from a URL.

## Deploy to any project

### 1. Install

```bash
cd slicecheck
npm install -g wrangler
wrangler login
```

### 2. Set secrets

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put ANTHROPIC_API_KEY
```

`GITHUB_TOKEN` needs access to repository contents, pull requests, and issue comments. Use a random
webhook secret of at least 20 characters.

### 3. Deploy

```bash
wrangler deploy
```

Note the deployed URL, such as `https://slicecheck.<your-account>.workers.dev`.

### 4. Register the webhook

For each repository, open **Settings → Webhooks → Add webhook** and configure:

- Payload URL: `https://slicecheck.<your-account>.workers.dev/webhook`
- Content type: `application/json`
- Secret: the value used for `GITHUB_WEBHOOK_SECRET`
- Events: pull requests only

### 5. Audit past pull requests

Open one of these URLs in a browser:

```text
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/reponame
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/repo&limit=10&state=open
https://slicecheck.<your-account>.workers.dev/audit?repo=owner/repo&plan_file=STATUS.md
```

The generated report contains inline CSS and no external resources, so saving the response as an
HTML file produces an audit that works offline.

## Plan file

SliceCheck looks for a plan in this order:

```text
PROGRESS.md → STATUS.md → PLAN.md → CLAUDE.md
```

Override that order for an audit with `?plan_file=YOUR_FILE.md`.

## How it works

1. An agent opens or updates a pull request.
2. GitHub sends the signed pull-request webhook.
3. SliceCheck fetches the plan and pull-request diff concurrently.
4. Claude compares planned work with the actual diff.
5. SliceCheck posts PASS, FAIL, or ERROR with specific gaps and an optional retry prompt.
6. Each new push adds another comment, creating a progressive verification history.

All outbound calls use `httpx.AsyncClient`. The Anthropic Messages API is called directly; the
Anthropic SDK is not used. Secrets are read only from Cloudflare Worker environment bindings.

## Test

From the Tripwire repository root:

```bash
uv run --extra dev --with-requirements slicecheck/requirements.txt pytest slicecheck/tests -q
uv run ruff check slicecheck
```
