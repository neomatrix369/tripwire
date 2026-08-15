"""Installed shim (~/.tripwire/hooks/_guard_entry.py): delegate to guard.entry.

Runs under `uv run --project <repo_root> --extra guard python _guard_entry.py`;
guard.entry.main() reads the hook payload from stdin, prints exactly one
decision JSON line, and always exits 0 (plan §4.3.3).
"""

from guard.entry import main

if __name__ == "__main__":
    main()
