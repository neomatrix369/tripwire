#!/bin/bash
# demo/scenario-1-push-fix.sh
# Pushes the missing tests + README update.
# SliceCheck re-fires and posts ✅ PASS.

set -e

BRANCH="${1:?Usage: bash scenario-1-push-fix.sh <branch-name>}"
REPO="neomatrix369/tripwire"

git checkout "$BRANCH"

# Add the missing tests
mkdir -p slicecheck/tests
cat > slicecheck/tests/test_health.py << 'PYEOF'
"""Tests for SliceCheck /health endpoint."""
import pytest
from unittest.mock import MagicMock

# Import the handler directly
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from entry import handle_health

class FakeEnv:
    GITHUB_TOKEN = "ghp_test"
    ANTHROPIC_API_KEY = "sk-ant-test"
    GITHUB_WEBHOOK_SECRET = "test-secret"

class FakeEnvMissing:
    GITHUB_TOKEN = None
    ANTHROPIC_API_KEY = "sk-ant-test"
    GITHUB_WEBHOOK_SECRET = "test-secret"

@pytest.mark.asyncio
async def test_health_ok():
    import json
    fake_request = MagicMock()
    fake_request.url = "https://example.com/health"
    response = await handle_health(fake_request, FakeEnv())
    body = json.loads(response.body)
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"
    assert all(v == "ok" for v in body["secrets"].values())

@pytest.mark.asyncio
async def test_health_degraded_missing_github():
    import json
    fake_request = MagicMock()
    fake_request.url = "https://example.com/health"
    response = await handle_health(fake_request, FakeEnvMissing())
    body = json.loads(response.body)
    assert body["status"] == "degraded"
    assert "github" in body["missing"]
PYEOF

# Add the missing README section
cat >> slicecheck/README.md << 'MDEOF'

## Health Check

Verify the Worker is running and all secrets are configured:

```bash
curl https://slicecheck.<your-account>.workers.dev/health
```

Healthy response:
```json
{"status":"ok","version":"1.0.0","secrets":{"github":"ok","anthropic":"ok","webhook":"ok"}}
```

Degraded response (missing secret):
```json
{"status":"degraded","version":"1.0.0","secrets":{"github":"missing","anthropic":"ok","webhook":"ok"},"missing":["github"]}
```
MDEOF

git add slicecheck/tests/test_health.py slicecheck/README.md
git commit -m "Add tests and README for health endpoint"
git push

echo ""
echo "✅ Fix pushed. SliceCheck will re-verify in ~10 seconds."
echo "Expected: ✅ PASS"
echo "Watch: https://github.com/$REPO/pulls"
