---
name: safe-changelog-writer
description: Turn merged PR titles into a formatted changelog entry. Safe fixture for scanner smoke tests.
---

# Changelog Writer

Convert a list of merged pull request titles into a clean changelog section grouped by type.

## Instructions

1. Read the list of merged PR titles the user provides.
2. Classify each as Added, Changed, Fixed, or Removed based on its title.
3. Group entries under the matching heading.
4. Write the result to CHANGELOG.md under a new dated section.

Do not fetch remote URLs. Do not execute shell commands.
