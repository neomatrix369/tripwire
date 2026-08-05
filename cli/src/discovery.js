import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Curated machine-default loci (spec §10.2) — never an unconstrained filesystem crawl.
const DEFAULT_SKILL_ROOTS = [
  '.cursor/skills', '.claude/skills', '.agents/skills',
  path.join(os.homedir(), '.cursor/skills'),
  path.join(os.homedir(), '.claude/skills'),
  path.join(os.homedir(), '.codex/skills')
];
const DEFAULT_MCP_MANIFESTS = [
  '.cursor/mcp.json', '.mcp.json',
  path.join(os.homedir(), '.cursor/mcp.json')
];
const MCP_SERVER_MARKERS = [
  'server.py', 'server.js', 'index.js', 'index.ts', 'main.py',
  'package.json', 'pyproject.toml', 'run.sh'
];

async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

function looksLikeMcpServer(dirPath) {
  return MCP_SERVER_MARKERS.some(f => existsSync(path.join(dirPath, f)));
}

async function detectType(target) {
  if (/^https?:\/\//.test(target)) {
    // git URL vs live MCP endpoint: presence of a recognizable git host is a heuristic only
    if (/github\.com|gitlab\.com|\.git$/.test(target)) return { type: 'mcp_server', locus: 'local', avail: 'cloneable' };
    return { type: 'mcp_server', locus: 'cloud', avail: 'introspection_only' };
  }
  if (existsSync(path.join(target, 'SKILL.md'))) return { type: 'skill', locus: 'local', avail: 'source_on_disk' };
  return { type: 'mcp_server', locus: 'local', avail: 'source_on_disk' };
}

async function expandFolder(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const found = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = path.join(folder, e.name);
    if (existsSync(path.join(sub, 'SKILL.md'))) found.push(sub);
    else if (looksLikeMcpServer(sub)) found.push(sub);
  }
  return found;
}

async function discoverDefaults() {
  const found = [];
  for (const root of DEFAULT_SKILL_ROOTS) {
    if (await isDir(root)) found.push(...(await expandFolder(root)));
  }
  for (const manifest of DEFAULT_MCP_MANIFESTS) {
    if (existsSync(manifest)) {
      try {
        const json = JSON.parse(await readFile(manifest, 'utf8'));
        const servers = json.mcpServers ? Object.keys(json.mcpServers) : [];
        found.push(...servers.map(name => ({ manifestEntry: name, manifest })));
      } catch { /* malformed manifest, skip */ }
    }
  }
  return found;
}

async function tryExpandManifest(filePath) {
  try {
    const json = JSON.parse(await readFile(filePath, 'utf8'));
    if (json.mcpServers && typeof json.mcpServers === 'object') {
      return Object.keys(json.mcpServers).map(name => ({ manifestEntry: name, manifest: filePath }));
    }
  } catch { /* not a valid manifest, treat as regular target */ }
  return null;
}

async function resolveTarget(t) {
  if (/^https?:\/\//.test(t)) return [t];
  if (t.endsWith('.json') && existsSync(t)) {
    const expanded = await tryExpandManifest(t);
    return expanded ? expanded : [t];
  }
  if (await isDir(t) && !existsSync(path.join(t, 'SKILL.md'))) {
    return looksLikeMcpServer(t) ? [t] : await expandFolder(t);
  }
  return [t];
}

async function annotateWithTypes(resolved) {
  const withTypes = [];
  for (const t of resolved) {
    const meta = typeof t === 'string'
      ? await detectType(t)
      : { type: 'mcp_server', locus: 'unknown', avail: 'unknown' };
    withTypes.push({ target: typeof t === 'string' ? t : t.manifestEntry, ...meta });
  }
  return withTypes;
}

export async function discoverTargets({ targets, targetsFile, useDefaults }) {
  let raw = targets && targets.length ? targets : [];
  if (targetsFile) {
    const json = JSON.parse(await readFile(targetsFile, 'utf8'));
    raw = raw.concat(json.targets || []);
  }
  if (raw.length === 0) return useDefaults ? discoverDefaults() : [];

  const resolved = [];
  for (const t of raw) {
    resolved.push(...(await resolveTarget(t)));
  }
  return annotateWithTypes(resolved);
}
