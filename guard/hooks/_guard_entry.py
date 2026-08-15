#!/usr/bin/env python3
"""Installed PreToolUse Python entry (template → ~/.tripwire/hooks/_guard_entry.py).

Reads Claude Code stdin JSON and prints approve/block stdout JSON (exit 0).
Delegates to ``guard.hooks_entry.main``.
"""

from __future__ import annotations

from guard.hooks_entry import main

if __name__ == "__main__":
    main()
