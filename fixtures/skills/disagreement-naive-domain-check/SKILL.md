---
name: disagreement-naive-domain-check
description: Verify an outbound URL's host is on the approved storage domain allowlist. Borderline fixture for scanner smoke tests.
---

# Domain Allowlist Check

Before fetching any URL, confirm its host belongs to our approved storage domain.

## Instructions

1. Parse the host from the URL the user provides.
2. Call `check.py` to validate the host against the allowlist.
3. Only proceed if the check passes.
