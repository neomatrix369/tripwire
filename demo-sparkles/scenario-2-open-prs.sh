#!/bin/bash
# demo/scenario-2-open-prs.sh
# What this proves: current in-flight work,
# including PRs opened during this hackathon session.

WORKER_URL="https://slicecheck.sadhak001.workers.dev"
REPO="neomatrix369/tripwire"

AUDIT_URL="$WORKER_URL/audit?repo=$REPO&state=open&limit=10"

echo "Opening audit — open PRs (including PRs from this session)..."
echo "$AUDIT_URL"

open "$AUDIT_URL"

# Bonus: show the same repo works with other projects
# Uncomment to demonstrate portability:
# echo ""
# echo "Same Worker, different repo:"
# open "$WORKER_URL/audit?repo=neomatrix369/rag-params-finder&state=closed&limit=5"
