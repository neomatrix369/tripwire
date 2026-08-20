# Tripwire screenshot gallery

Product UI and CLI captures, grouped by surface. Paths are relative to this folder.

**Dashboard, skill, and MCP shots use Mock (demo data)** so Red / Amber / Green
and Escalated / SIE-only examples stay stable. **CLI shots are live terminal
captures** from the current CLI.

> **Note (2026-08-20):** Gallery PNGs regenerated for slice-43 paper/tan visual
> identity v2 (and slice-42 metric badges). Re-run the commands below after further
> chrome changes.

Regenerate frontend shots with:

```bash
node scripts/serve-dashboard.mjs   # if not already running on :8765
node scripts/capture-screenshots.mjs
```

Router strip / filter semantics:
[reading-router-results.md](../user-guide/reading-router-results.md).

## 1. CLI

Help output (including `route`) and discovery / live scan feedback.

### CLI help / dry-discover

![CLI help and dry-discover](01-cli/01-cli-help-dry-discover.png)

### CLI real scan — Modal sandbox

![CLI real scan with Modal sandbox output](01-cli/02-cli-real-scan-modal-sandbox.png)

---

## 2. Dashboard

Heatmap grid, severity filters, tiered-router filters, type views, and list
layout (Mock demo). Card colour is worst-of actionable finding severity; chips
show finding counts.

### Overview grid

![Dashboard overview grid](02-dashboard/02-dashboard-overview-grid.png)

### Filter — red

![Filter red](02-dashboard/03-filter-red.png)

### Filter — amber

![Filter amber](02-dashboard/05-filter-amber.png)

### Filter — green

![Filter green](02-dashboard/07-filter-green.png)

### Filter — Escalated

Model Studio offload items (`routing_decision` / `routing_triage`). Pathway
ends at Model Studio.

![Filter Escalated](02-dashboard/14-filter-escalated.png)

### Filter — SIE-only

SIE reviewed; Model Studio did not run (`routing_review`). Pathway stops after
SIE.

![Filter SIE-only](02-dashboard/15-filter-sie-only.png)

### Pathway — Escalated grid

![Pathway Escalated grid](02-dashboard/16-pathway-escalated-grid.png)

### Pathway — SIE-only grid

![Pathway SIE-only grid](02-dashboard/17-pathway-sie-only-grid.png)

### MCP servers (all)

![MCP servers all](02-dashboard/09-mcp-servers-all.png)

### List view — all items

![List view all items](02-dashboard/13-list-view-all-items.png)

---

## 3. Skills

Drill-down detail for skill findings by heatmap severity.

### Red — vuln prompt injection

![Red skill detail: vuln-prompt-injection](03-skills/04-red-skill-detail-vuln-prompt-injection.png)

### Amber — disagreement domain check

![Amber skill detail: disagreement-domain-check](03-skills/06-amber-skill-detail-disagreement-domain-check.png)

### Green — safe CSV cleaner

![Green skill detail: safe-csv-cleaner](03-skills/08-green-skill-detail-safe-csv-cleaner.png)

---

## 4. MCP servers

Drill-down detail for MCP server findings by heatmap severity.

### Red — vuln command injection

![Red MCP detail: vuln-command-injection](04-mcp-servers/10-red-mcp-detail-vuln-command-injection.png)

### Amber — vuln unauthenticated HTTP

![Amber MCP detail: vuln-unauthenticated-http](04-mcp-servers/11-amber-mcp-detail-vuln-unauthenticated-http.png)

### Green — safe time server

![Green MCP detail: safe-time-server](04-mcp-servers/12-green-mcp-detail-safe-time-server.png)
