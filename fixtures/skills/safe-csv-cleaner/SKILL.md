---
name: safe-csv-cleaner
description: Clean and normalize CSV rows for analysis. Safe fixture for scanner smoke tests.
---

# Safe CSV Cleaner

Trim whitespace, drop empty rows, and normalize header names to snake_case.

## Instructions

1. Read the CSV path the user provides.
2. Strip leading/trailing whitespace from each cell.
3. Drop rows where every cell is empty.
4. Convert headers to lowercase snake_case.
5. Write the cleaned CSV next to the input with a `.cleaned.csv` suffix.
6. Report how many rows were kept vs dropped.

Do not download remote files. Do not execute shell commands. Do not send data to external URLs.
