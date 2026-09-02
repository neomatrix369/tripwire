#!/bin/bash
# demo/preflight.sh — run at 20:40, before code freeze
# Confirms every dependency for all three scenarios is green

set -e

WORKER_URL="https://slicecheck.YOUR_ACCOUNT.workers.dev"   # ← fill in after wrangler deploy
REPO="neomatrix369/tripwire"
GITHUB_TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN env var}"

echo "━━━ SliceCheck Demo Preflight ━━━"
echo ""

# 1. Worker is live
echo -n "[1] Worker reachable... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/")
[ "$STATUS" = "200" ] && echo "✅ $WORKER_URL" || echo "❌ Got HTTP $STATUS — check wrangler deploy"

# 2. Audit endpoint returns HTML
echo -n "[2] Audit endpoint (closed PRs)... "
AUDIT=$(curl -s "$WORKER_URL/audit?repo=$REPO&state=closed&limit=3")
echo "$AUDIT" | grep -q "SliceCheck" && echo "✅ Returns HTML" || echo "❌ No SliceCheck in response — check Worker logs"

# 3. Audit endpoint (open PRs)
echo -n "[3] Audit endpoint (open PRs)... "
AUDIT_OPEN=$(curl -s "$WORKER_URL/audit?repo=$REPO&state=open&limit=5")
echo "$AUDIT_OPEN" | grep -q "SliceCheck" && echo "✅ Returns HTML" || echo "❌ Failed"

# 4. GitHub token has repo access
echo -n "[4] GitHub token — can read closed PRs... "
PR_COUNT=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls?state=closed&per_page=3" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
[ "$PR_COUNT" -gt "0" ] && echo "✅ $PR_COUNT closed PRs found" || echo "❌ 0 PRs returned — check token scope (needs repo)"

# 5. Webhook registered
echo -n "[5] Webhook registered on repo... "
HOOKS=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/hooks" | python3 -c \
  "import sys,json; hooks=json.load(sys.stdin); print(next((h['config']['url'] for h in hooks if 'slicecheck' in h['config'].get('url','')), 'NOT FOUND'))")
echo "$HOOKS" | grep -q "slicecheck" && echo "✅ $HOOKS" || echo "⚠️  Not found — webhook scenario won't work. Register in GitHub → Repo → Settings → Webhooks"

# 6. gh CLI authenticated
echo -n "[6] gh CLI authenticated... "
gh auth status &>/dev/null && echo "✅" || echo "❌ Run: gh auth login"

# 7. Demo branch doesn't already exist (clean state)
echo -n "[7] Demo branch clean... "
git fetch --quiet
git branch -r | grep -q "demo/slicecheck-health" && echo "⚠️  Old demo branch exists — run: git push origin --delete demo/slicecheck-health" || echo "✅"

# 8. PROGRESS.md has the demo slice
echo -n "[8] PROGRESS.md has demo slice... "
grep -q "SliceCheck health endpoint" PROGRESS.md && echo "✅" || echo "❌ Add the demo slice to PROGRESS.md first"

# 9. Fallback GIF exists
echo -n "[9] Fallback GIF recorded... "
ls demo/fallback-*.gif &>/dev/null && echo "✅" || echo "⚠️  No fallback GIF found — run scenario 1 now and record it with Kap"

echo ""
echo "━━━ Preflight complete ━━━"
echo "AUDIT URL (closed): $WORKER_URL/audit?repo=$REPO&state=closed&limit=5"
echo "AUDIT URL (open):   $WORKER_URL/audit?repo=$REPO&state=open&limit=5"
echo "WORKER HEALTH:      $WORKER_URL/"
