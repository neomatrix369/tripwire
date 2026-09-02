#!/bin/bash
# demo/scenario-1-create-pr.sh
# Creates a PR that DELIBERATELY fails SliceCheck.
# The implementation is real but missing tests and README —
# exactly what the PROGRESS.md slice requires.

set -e

WORKER_URL="https://slicecheck.YOUR_ACCOUNT.workers.dev"
REPO="neomatrix369/tripwire"
BRANCH="demo/slicecheck-health-$(date +%s)"

echo "Creating demo branch: $BRANCH"
git checkout main && git pull
git checkout -b "$BRANCH"

# Add the health endpoint to slicecheck/src/entry.py
# This is REAL code — but it's missing tests and README update
cat >> slicecheck/src/entry.py << 'PYEOF'


async def handle_health(request, env):
    """GET /health — returns service status and secret presence check."""
    import json

    secrets_status = {
        "github":   "ok" if getattr(env, "GITHUB_TOKEN", None) else "missing",
        "anthropic": "ok" if getattr(env, "ANTHROPIC_API_KEY", None) else "missing",
        "webhook":  "ok" if getattr(env, "GITHUB_WEBHOOK_SECRET", None) else "missing",
    }
    missing = [k for k, v in secrets_status.items() if v == "missing"]

    body = {
        "status":  "degraded" if missing else "ok",
        "version": "1.0.0",
        "secrets": secrets_status,
    }
    if missing:
        body["missing"] = missing

    from workers import Response
    return Response(
        json.dumps(body),
        headers={"content-type": "application/json"}
    )
PYEOF

# Wire it into the router in entry.py
# (append a route — assumes the router is at the end of on_fetch)
sed -i '' 's|return Response("Not found", status=404)|if request.url.endswith("/health"):\n        return await handle_health(request, env)\n    return Response("Not found", status=404)|' slicecheck/src/entry.py

git add slicecheck/src/entry.py
git commit -m "Add SliceCheck health endpoint"

echo "Pushing branch..."
git push -u origin "$BRANCH"

echo "Opening PR..."
gh pr create \
  --repo "$REPO" \
  --title "Add SliceCheck health endpoint" \
  --body "Adds GET /health to the SliceCheck Worker. Returns service status and secret presence." \
  --base main \
  --head "$BRANCH"

echo ""
echo "✅ PR opened. SliceCheck will fire in ~10 seconds."
echo "Watch: https://github.com/$REPO/pulls"
echo ""
echo "Expected verdict: ❌ FAIL — missing tests, missing README update"
echo ""
echo "When the FAIL comment appears, run: bash demo/scenario-1-push-fix.sh $BRANCH"
