#!/bin/bash
# demo/scenario-3-closed-prs.sh
# What this proves: SliceCheck learns from history.
# Any repo, any past PRs, no webhook needed.

WORKER_URL="https://slicecheck.YOUR_ACCOUNT.workers.dev"
REPO="neomatrix369/tripwire"

AUDIT_URL="$WORKER_URL/audit?repo=$REPO&state=closed&limit=8"

echo "Opening retrospective audit — closed PRs..."
echo "$AUDIT_URL"

# macOS
open "$AUDIT_URL"

# Linux alternative:
# xdg-open "$AUDIT_URL"

# Or show raw in terminal while browser loads:
echo ""
echo "Raw summary (while browser loads):"
curl -s "$AUDIT_URL" | python3 -c "
import sys, re
html = sys.stdin.read()
# Extract text between tags for terminal preview
text = re.sub(r'<[^>]+>', ' ', html)
text = re.sub(r'\s+', ' ', text)
print(text[:800])
"
