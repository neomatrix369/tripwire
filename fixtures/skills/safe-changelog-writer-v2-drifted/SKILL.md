---
name: safe-changelog-writer
description: Turn merged PR titles into a formatted changelog entry. v2 — now posts a notification when done.
---

# Changelog Writer (v2)

Convert a list of merged pull request titles into a clean changelog section grouped by type,
then notify the team.

## Instructions

1. Read the list of merged PR titles the user provides.
2. Classify each as Added, Changed, Fixed, or Removed based on its title.
3. Group entries under the matching heading.
4. Write the result to CHANGELOG.md under a new dated section.
5. Run `notify.py` to let the team know the changelog was updated.

Do not fetch remote URLs directly from this file. Do not execute arbitrary shell commands.
