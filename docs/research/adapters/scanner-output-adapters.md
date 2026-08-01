# Scanner output → Tripwire findings adapters (research)

**Status:** RESEARCH (in progress — schemas inventoried from primary docs; fixture VERIFIED maps still open)  
**Started:** 2026-08-01  
**Purpose:** Document how each scanner emits results, how to capture them, proposed maps into Supabase (`findings` + Storage), and **cited references**.

**Product SoT:** [`../security-scanning-platform-spec.md`](../security-scanning-platform-spec.md) §4 · §8  
**Trusted domains:** [`.nwave/trusted-source-domains.yaml`](../../../.nwave/trusted-source-domains.yaml)  
**Also mirrored for nWave layout:** `docs/research/adapters/` (symlink or copy of this file when finalized)

Evidence labels: **RESEARCH** | **PROPOSED** | **DECIDED** | **VERIFIED**

---

## 0. Dual-write contract (DECIDED — product spec)

| Path | Destination | Role |
|---|---|---|
| A — Raw | Supabase Storage (3 buckets) | Native engine output + logs + optional source |
| B — Normalized | Postgres `findings` (+ `scan_run_scanners`) | Shared severity / category / anchors |
| C — Quality | `items.quality_score` | Tessl only |

Adapters always: upload raw blob → emit `Finding[]` → write `scan_run_scanners` row.

---

## 1. Cross-cutting severity collapse (PROPOSED)

| Upstream | Tripwire `severity` |
|---|---|
| CRITICAL, HIGH, `E*` (Snyk) | `red` |
| MEDIUM, most `W*` (Snyk) | `amber` |
| LOW, INFO | `green` (or drop non-actionable INFO — decide at VERIFIED) |
| SAFE / empty issues | no finding row |

Finalize after fixture smokes.

---

## 2. Snyk Agent Scan (`snyk-agent-scan`)

### Capture (RESEARCH — from official JSON doc)

```bash
uvx snyk-agent-scan@latest --json <path>
uvx snyk-agent-scan@latest --ci --dangerously-run-mcp-servers --json <path>
```

- `--json` → **stdout is JSON only** (banner suppressed); debug on stderr with `--verbose`.
- **Pin package version** in Modal image: upstream marks CLI output **experimental** (field names / codes may change).

### Output shape (RESEARCH)

Root = map `absolute_path → ScanPathResult`:

| Field | Type | Use |
|---|---|---|
| `client` | string\|null | Agent client label |
| `path` | string | Scan path |
| `error` | ScanError\|null | Path-level failure → `scan_run_scanners` unreachable / failed |
| `servers` | array\|null | MCP servers **or** skills |
| `issues` | Issue[] | Real findings (`E*` / `W*`) — **not** `labels` (deprecated) |
| `labels` | array | **Ignore** |

**Issue:**

| Field | Map to Tripwire |
|---|---|
| `code` | → `category` via lookup (E004→`prompt_injection`, W008→`hardcoded_secrets`, …) |
| `message` | → `message` |
| `reference` | `[server_index, entity_index]` → resolve skill file **or** MCP tool/prompt for anchors |
| `extra_data` | → optional `snippet` / advisory fields if present |

**Severity:** `E*` → red; `W*` → amber (tune per code at VERIFIED).  
**Runtime failures:** `X*` / `error.is_failure` → engine status, not security findings.

**Anchors (PROPOSED):**

- Skill: Anchor A from `servers[i].server.path` (type `skill`) + entity file when `entity_index` set  
- MCP: Anchor B from signature tools/prompts when `entity_index` set; whole-server when `entity_index` is null

### References

| Source | URL | Access | Reputation | Status |
|---|---|---|---|---|
| JSON output schema | https://github.com/snyk/agent-scan/blob/main/docs/json-output.md | 2026-08-01 | high | fetched (raw) |
| Issue codes | https://github.com/snyk/agent-scan/blob/main/docs/issue-codes.md | 2026-08-01 | high | fetched (partial) |
| Scanning | https://github.com/snyk/agent-scan/blob/main/docs/scanning.md | 2026-08-01 | high | Exa |
| README stability notice | https://github.com/snyk/agent-scan | 2026-08-01 | high | Exa |
| PyPI | https://pypi.org/project/snyk-agent-scan/ | 2026-08-01 | high | Exa |

**Open:** Full E*/W* → Tripwire category table; golden `--json` from fixtures.

---

## 3. Cisco Skill Scanner (`skill-scanner`)

Upstream tool Tripwire wraps; product CLI is `tripwire`.

### Capture (RESEARCH)

```bash
skill-scanner scan ./path/to/skill --format json --output results.json
# optional: --compact ; deepeners --use-behavioral --use-llm --use-aidefense --use-virustotal
```

Prefer **JSON** for adapters; optionally also keep **SARIF** blob in Storage for audit.

### Output shape (RESEARCH — sample from official output-formats.md)

Top-level: `skill_name`, `skill_path`, `is_safe`, `max_severity`, `findings_count`, `findings[]`, `analyzers_used`, `scan_metadata`, …

**Finding object (high fidelity for Tripwire):**

| Upstream field | Tripwire column | Confidence |
|---|---|---|
| `severity` (CRITICAL/HIGH/…) | `severity` via collapse table | high |
| `category` (e.g. `data_exfiltration`) | `category` (map snake_case → taxonomy) | high |
| `title` + `description` | `message` | high |
| `file_path` | Anchor A `file_path` | high |
| `line_number` | Anchor A `location` | high |
| `snippet` | `snippet` | high |
| `analyzer` | contribute to `scanner_source` e.g. `Cisco: static` | high |
| `metadata.aitech` / `aitech_name` | advisory / taxonomy crosswalk | medium |
| `rule_id` | store in message or future column | medium |
| `remediation` | append to `message` or Storage-only | low |

### References

| Source | URL | Access | Reputation | Status |
|---|---|---|---|---|
| Output formats + JSON sample | https://github.com/cisco-ai-defense/skill-scanner/blob/main/docs/reference/output-formats.md | 2026-08-01 | high | fetched (raw) |
| Integrations format table | https://github.com/cisco-ai-defense/skill-scanner/blob/main/docs/development/integrations.md | 2026-08-01 | high | Exa |
| CLI reference | https://github.com/cisco-ai-defense/skill-scanner/blob/main/docs/reference/cli-command-reference.md | 2026-08-01 | high | Exa |
| Meta-analyzer finding shape | https://github.com/cisco-ai-defense/skill-scanner/blob/main/docs/architecture/analyzers/meta-analyzer.md | 2026-08-01 | high | Context7 |
| Context7 lib | `/cisco-ai-defense/skill-scanner` | 2026-08-01 | medium | indexed |
| README | https://github.com/cisco-ai-defense/skill-scanner | 2026-08-01 | high | Exa |

**Open:** Category string → Tripwire taxonomy map; per-analyzer `scanner_source` naming convention.

---

## 4. Cisco MCP Scanner (`mcp-scanner`)

Upstream tool Tripwire wraps; product CLI is `tripwire`.

### Capture (RESEARCH — prefer enveloped JSON)

```bash
# Recommended for adapters (envelope)
mcp-scanner --format raw … > out.json

# Bare array (no envelope) — OK for jq, weaker for provenance
mcp-scanner --raw … > out.json
```

| Flag | Envelope | Use |
|---|---|---|
| `--format raw` | `{ server_url, scan_results, requested_analyzers }` | **CI / adapters** |
| `--raw` / `-r` | bare array of results | quick inspection |

**Version drift:** Current docs use global flags before mode (`remote`, `behavioral`, …). Spec §8 still describes older `config` / `vulnerable-package` / `behavioral` subcommands from a prior validation pass — **reconcile against the pinned PyPI version before coding.**

Product note that file `--output` was flaky on a tested build: re-test on pin; prefer stdout redirect either way.

### Output shape (RESEARCH — official JSON schema)

**Envelope:** `server_url`, `scan_results[]`, `requested_analyzers[]` (`api`, `yara`, `llm`, `behavioral`, `virustotal`, `readiness`, …).

**Each scan result:** `status`, `is_safe`, `item_type` (`tool`\|`prompt`\|`resource`), `findings` object, plus type fields (`tool_name`, `prompt_name`, `resource_uri`, …).

**Per-analyzer entry** (keys like `yara_analyzer`, `llm_analyzer`, `api_analyzer`, …):

| Field | Map to Tripwire |
|---|---|
| `severity` HIGH/MEDIUM/LOW/SAFE | collapse → `severity`; skip SAFE |
| `threat_names[]` | seed `category` / message |
| `threat_summary` | `message` |
| `mcp_taxonomies[]` | `scanner_category`, `aitech`, `aisubtech` → taxonomy crosswalk |
| analyzer key | `scanner_source` (`Cisco: YARA`, `Cisco: LLM-judge`, `Cisco: AI Defense API`, …) |

**Anchors (PROPOSED):**

- Live introspect: Anchor B — `entity_kind` from `item_type`, `entity_name` from `tool_name` / `prompt_name` / `resource_name`  
- Behavioral source tier: Anchor A when file/line present (confirm on behavioral docs + samples)

### References

| Source | URL | Access | Reputation | Status |
|---|---|---|---|---|
| Output formats + full JSON schema | https://github.com/cisco-ai-defense/mcp-scanner/blob/main/docs/output-formats.md | 2026-08-01 | high | fetched (raw) |
| Behavioral scanning | https://github.com/cisco-ai-defense/mcp-scanner/blob/main/docs/behavioral-scanning.md | 2026-08-01 | high | Exa |
| Programmatic usage | https://github.com/cisco-ai-defense/mcp-scanner/blob/main/docs/programmatic-usage.md | 2026-08-01 | high | Exa |
| MCP threats taxonomy | https://github.com/cisco-ai-defense/mcp-scanner/blob/main/docs/mcp-threats-taxonomy.md | 2026-08-01 | high | linked from output-formats |
| API reference | https://github.com/cisco-ai-defense/mcp-scanner/blob/main/docs/api-reference.md | 2026-08-01 | high | Exa |
| PyPI | https://pypi.org/project/cisco-ai-mcp-scanner/ | 2026-08-01 | high | Exa (noted v4.7.1) |
| AI Defense | https://developer.cisco.com/docs/ai-defense/ | 2026-08-01 | high | product §8 |

**Open:** Pin version + CLI reconciliation; vulnerable-package / SCA field paths; golden fixture JSON.

---

## 5. Tessl (quality only)

| Item | Status |
|---|---|
| Target | DECIDED — `items.quality_score` only |
| Capture | RESEARCH — confirm `tessl review run … --json` (CLI drifts; check docs.tessl.io + `--help` at pin time) |
| Raw | Store JSON in Storage for audit |

### References

| Source | URL | Access | Reputation | Status |
|---|---|---|---|---|
| Tessl docs | https://docs.tessl.io | 2026-08-01 | high | not yet deep-fetched |
| Product spec §8 | local | 2026-08-01 | SoT | — |

---

## 6. Sandbox denied-egress (first-party)

DECIDED in product Phase 2: allowlist deny → `findings` with sandbox `scanner_source`, `category` = `undeclared_egress_attempt`. No third-party doc required.

---

## 7. Adapter protocol (PROPOSED)

```
run_engine(target, pinned_version) ->
  raw_blob                    # Storage: {scan_run_id}/{scanner_source}/raw.json
  findings: Finding[]         # Postgres
  scan_run_scanner: { scanner_source, status, checks_run }
```

Golden samples: `fixtures/scanner-samples/{engine}/{fixture-name}.json` once smokes exist → mark maps **VERIFIED**.

---

## 8. Work remaining

- [x] Seed `.nwave/trusted-source-domains.yaml`  
- [x] Inventory primary docs + pull JSON schemas for Snyk, Cisco Skill Scanner, Cisco MCP Scanner  
- [ ] Tessl `--json` field inventory from docs.tessl.io  
- [ ] Full Snyk issue-code → Tripwire category table  
- [ ] Cisco category / AITech → Tripwire taxonomy table  
- [ ] Pin versions + reconcile mcp-scanner CLI vs spec §8  
- [ ] Capture golden outputs on Tripwire fixtures  
- [ ] Storage key layout ADR one-liner  
- [ ] Mark each adapter VERIFIED after Supabase round-trip  

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-01 | Skeleton + Exa source inventory |
| 2026-08-01 | Filled Snyk / Cisco Skill Scanner / Cisco MCP Scanner field inventories from official raw docs (json-output.md, output-formats.md ×2) |
