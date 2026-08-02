"""Test bootstrap for sandbox suite.

``scan_app`` imports ``modal`` at module load. CI/dev envs may not install Modal;
stub a minimal module so unit tests can import scan_app helpers without the SDK.
"""

from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock

if "modal" not in sys.modules:
    modal_stub = types.ModuleType("modal")
    modal_stub.App = MagicMock(name="App")  # type: ignore[attr-defined]
    modal_stub.Image = MagicMock(name="Image")  # type: ignore[attr-defined]
    modal_stub.Secret = MagicMock(name="Secret")  # type: ignore[attr-defined]
    sys.modules["modal"] = modal_stub

if "supabase" not in sys.modules:
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.create_client = MagicMock(name="create_client")  # type: ignore[attr-defined]
    sys.modules["supabase"] = supabase_stub
