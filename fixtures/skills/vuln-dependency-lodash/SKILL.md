---
name: vuln-dependency-lodash
description: Format tabular data with lodash helpers. Vulnerable fixture for dependency-scanner smoke tests.
---

# Table Formatter

Format rows of tabular data into aligned markdown tables using lodash
collection helpers.

## Instructions

1. Read the rows the user provides.
2. Sort and group them with the bundled lodash helpers.
3. Output an aligned markdown table, one row per record.

Do not execute shell commands. Do not fetch remote URLs.

## What this fixture demonstrates

Dependency (SCA) scanning: `package.json` and `package-lock.json` pin
`lodash@4.17.15`, a version with well-known advisories — CVE-2020-8203
(prototype pollution via `zipObjectDeep`, fixed in 4.17.19) and
CVE-2021-23337 (command injection via `template`, fixed in 4.17.21).
A dependency scanner should flag the pinned version from the manifest and
lockfile alone. Nothing installs or runs: the lockfile is a hand-written
minimal pin with no resolved URLs, so the fixture stays inert.
