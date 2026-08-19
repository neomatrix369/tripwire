# Smoke Tests

Manual smoke observations for the Tripwire dashboard and CLI. Each test is observable
in a browser (dashboard) or via a direct Supabase API query (DB). Automate where possible;
otherwise gate on human sign-off before marking a slice PASSED.

---

## Dashboard data completeness (slice-42 A1/A2 regression guard)

**Trigger**: run after any change to `prototypes/dc-dashboard/tripwire-live.js`

**Goal**: confirm no card wrongly shows "never scanned" or "0 findings" due to a
fetch-window miss.

### Steps

1. Open the Tripwire dashboard in Live mode (requires `SUPABASE_URL` + `SUPABASE_ANON_KEY`).
2. Open the browser Network tab. Confirm the `scan_runs` request uses `limit=2000`
   (not `limit=200`).
3. Confirm the `findings` and `scan_run_scanners` requests include a
   `scan_run_id=in.(...)` filter (not `select=*` alone).
4. Count RED/AMBER cards that show **last-scan date** and **≥1 finding** (or a
   justified 0 with a scanner explanation). A card showing "never scanned" with a
   non-NULL `heatmap_status='red'` in Supabase is a regression.

### Pass criterion

All items whose `heatmap_status` is not NULL in `items` display either:
- a last-scan date with a findings count or scanner explanation, OR
- a clear failure message ("Scan run failed — no findings available") when
  `scan_runs.status = 'failed'`

No card may show "never scanned" while Supabase confirms a `scan_run` exists for that
`item_id`.

### SQL spot-check (Supabase SQL editor)

```sql
-- Items that have a scan_run but show no last-scan date after the fix:
-- (expected: 0 rows post slice-42)
select i.name, i.heatmap_status, sr.status, sr.started_at
from items i
join scan_runs sr on sr.item_id = i.id
where sr.started_at = (
  select max(s2.started_at) from scan_runs s2 where s2.item_id = i.id
)
and i.heatmap_status is not null
order by sr.started_at desc;
```

---

## MCP server locus completeness (slice-42 A3 regression guard)

**Trigger**: run after any change to `cli/src/discovery.js` or after a rescan of MCP servers.

### SQL spot-check

```sql
-- Should return 0 rows after slice-42 rescan:
select name, install_locus, source_availability
from items
where type = 'mcp_server'
  and (install_locus = 'unknown' or source_availability = 'unknown');
```

### Pass criterion

Zero MCP server items have `install_locus = 'unknown'` or `source_availability = 'unknown'`
in the `items` table after a `tripwire scan --type mcp` completes.

---

## ERROR card messaging (slice-42 A5 regression guard)

**Trigger**: run after any change to `Tripwire.dc.html` or `tripwire-live.js:shapeItem`.

### Steps

1. Identify an item whose latest `scan_runs.status = 'failed'` in Supabase.
2. Open that card's right panel in the dashboard.
3. Observe the Findings section heading.

### Pass criterion

- Heading reads **"Scan run failed — no findings available"** (not "Findings (0)").
- The bare count "Findings (0)" must not appear when `runStatus === 'failed'`.
