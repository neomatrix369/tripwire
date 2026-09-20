/**
 * Host-side mirror of sandbox/scanners.py SCANNER_GROUPS source names.
 * Keep names identical when the Python registry changes (slice-63 Doc Audit).
 */

export const SCANNER_REGISTRY = [
  { applies_to: 'skill', sources: [
    'Cisco Skill Scanner: static/bytecode/pipeline',
    'Cisco Skill Scanner: LLM-judge',
    'Cisco Skill Scanner: AI Defense',
  ] },
  { applies_to: 'skill', sources: [
    'Tessl: Lint',
    'Tessl: Review (Quality)',
    'Tessl: Scenario Generation',
    'Tessl: Eval',
    'Tessl: Review (Security)',
  ] },
  { applies_to: 'mcp_server', sources: [
    'Cisco MCP Scanner: YARA',
    'Cisco MCP Scanner: LLM-judge',
    'Cisco MCP Scanner: AI Defense',
    'Cisco MCP Scanner: Behavioral Code Scanning',
  ] },
  { applies_to: 'both', sources: ['Snyk'] },
  { applies_to: 'both', sources: ['DepShield'] },
  { applies_to: 'both', sources: ['Cargo Audit'] },
  { applies_to: 'both', sources: ['Ossprey'] },
];

const BOTH_TYPES = new Set(['skill', 'mcp_server', 'package']);

/**
 * Mirror of sandbox.scanners._group_applies — keep in sync (slice 63/64).
 * `both` → skill + mcp_server + package; typed groups stay exact-match only.
 */
function groupApplies(appliesTo, itemType) {
  if (appliesTo === 'both') return BOTH_TYPES.has(itemType);
  if (appliesTo === 'skill') return itemType === 'skill';
  if (appliesTo === 'mcp_server') return itemType === 'mcp_server';
  if (appliesTo === 'package') return itemType === 'package';
  return false;
}

/** @param {string|null|undefined} itemType skill | mcp_server | package | null (all sources) */
export function expectedScannersFor(itemType) {
  const names = [];
  for (const group of SCANNER_REGISTRY) {
    if (itemType == null || groupApplies(group.applies_to, itemType)) {
      names.push(...group.sources);
    }
  }
  return names;
}

/**
 * Merge DB rows with expected sources. Missing expected → not_run.
 * @param {string[]} expected
 * @param {{ scanner_source: string, status: string }[]} rows
 */
export function mergeScannerInventory(expected, rows = []) {
  const bySource = new Map();
  for (const row of rows) {
    if (row && row.scanner_source) bySource.set(row.scanner_source, row.status || 'not_run');
  }
  const seen = new Set();
  const inventory = [];
  for (const name of expected) {
    seen.add(name);
    inventory.push({ scanner: name, status: bySource.get(name) || 'not_run' });
  }
  for (const [name, status] of bySource) {
    if (!seen.has(name)) inventory.push({ scanner: name, status });
  }
  return inventory;
}

/** @param {{ scanner: string, status: string }[]} inventory */
export function rollupScannerInventory(inventory) {
  if (!inventory.length) return 'not run';
  const statuses = inventory.map(r => r.status);
  if (statuses.every(s => s === 'not_run')) return 'not run';
  const completed = statuses.filter(s => s === 'completed').length;
  if (completed === statuses.length) return 'fully successful';
  if (completed >= 1) return 'partly successful';
  return 'fully failed';
}

/**
 * @param {{ scanner: string, status: string }[]} inventory
 * @param {{ label?: string }} [opts]
 */
export function formatScannerInventory(inventory, opts = {}) {
  const rollup = rollupScannerInventory(inventory);
  const header = opts.label
    ? `[scanners] ${opts.label} — ${rollup}`
    : `[scanners] ${rollup}`;
  const lines = [header];
  for (const row of inventory) {
    lines.push(`  ${row.scanner}: ${row.status}`);
  }
  return lines.join('\n');
}

export function inventoryForNotRun(itemType = null) {
  const expected = expectedScannersFor(itemType);
  return mergeScannerInventory(expected, []);
}
