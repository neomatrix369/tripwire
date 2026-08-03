# Plan status emoji legend

This doc defines emoji meanings used across plan trackers and slice notes.

## Slice and execution status

| Emoji | Meaning | When to use |
|---|---|---|
| `✅` | PASSED | All required checks are complete and merge-close criteria are satisfied |
| `📋` | PLANNED | Work has not started or evidence capture is not yet underway |
| `🔨` | IN PROGRESS | Work/verification is in progress, but not yet closeable |
| `🔀` | ON BRANCH | All checks pass on the slice branch; PR is still open/unmerged |
| `🔴` | BLOCKED | A required blocker is present (missing artifact, failing gate, unresolved risk) |
| `📦` | DEFERRED / WON'T (A) | Not in Horizon A execution path; can be reinstated explicitly |

## Decision / audit markers

| Symbol | Meaning |
|---|---|
| `✅ only after merge` | Status that appears in close rule docs means "do not mark final closed until merged on `main`" |
| `~` / transition notation | Status in history rows (for example `🔴→📦`) shows state transition |
| `—` | Empty or not applicable field in tracker tables |

## References

- [GATE_CONTRACT.md](GATE_CONTRACT.md) — authoritative close rule and base status semantics
