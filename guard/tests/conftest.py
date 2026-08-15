"""Test bootstrap for guard/tests.

Guarantees `import guard` resolves to this repo regardless of install mode.
Shared fakes live in ``_fakes.py`` (uniquely named so the rootless-import
sys.path never confuses it with sandbox/tests/conftest.py).
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
