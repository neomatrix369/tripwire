import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
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
/** Stricter markers for recursive git-repo walks — package.json alone is too noisy. */
const GIT_WALK_MCP_MARKERS = ['server.py', 'server.js', 'run.sh'];

async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

function looksLikeMcpServer(dirPath, markers = MCP_SERVER_MARKERS) {
  return markers.some(f => existsSync(path.join(dirPath, f)));
}

export function parseGitHubBrowseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.hostname !== 'github.com') return null;
  const parts = parsed.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [org, rawRepo, action, ref, ...scope] = parts;
  const repo = rawRepo.replace(/\.git$/, '');
  if (action && !['tree', 'blob'].includes(action)) return null;
  if (action && !ref) return null;
  return {
    cloneUrl: `${parsed.protocol}//github.com/${org}/${repo}`,
    org,
    repo,
    scopePath: scope.length ? scope.join('/') : null,
  };
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

export async function walkArtifacts(rootDir) {
  const artifacts = [];
  async function walk(dir, isWalkRoot) {
    if (path.basename(dir) === '.git') return;
    const entries = await readdir(dir, { withFileTypes: true });
    const isSkill = existsSync(path.join(dir, 'SKILL.md'));
    // Stop at artifact roots so skill package.json / nested tooling is not
    // misclassified as a separate MCP server.
    if (isSkill) {
      artifacts.push({ target: dir, type: 'skill' });
      return;
    }
    // Clone/scope roots often have package.json — descend instead of treating
    // the whole tree as one MCP. Use strict markers so node packages / fixtures
    // are not misclassified during git fan-out.
    if (!isWalkRoot && looksLikeMcpServer(dir, GIT_WALK_MCP_MARKERS)) {
      artifacts.push({ target: dir, type: 'mcp_server' });
      return;
    }
    await Promise.all(entries
      .filter(entry => entry.isDirectory() && entry.name !== '.git')
      .map(entry => walk(path.join(dir, entry.name), false)));
  }
  await walk(rootDir, true);
  return artifacts;
}

function defaultCloneRepo(cloneUrl, destDir) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['clone', '--depth', '1', '--single-branch', cloneUrl, destDir]);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`git clone failed (${code})`)));
  });
}

/**
 * SKILL.md YAML frontmatter `name:` (Agent Skills). Sync read — discovery is local FS.
 * @param {string} skillMdPath
 * @returns {string|null}
 */
export function readSkillFrontmatterName(skillMdPath) {
  if (!existsSync(skillMdPath)) return null;
  let text;
  try {
    text = readFileSync(skillMdPath, 'utf8');
  } catch {
    return null;
  }
  const lines = text.split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    if (line.startsWith('name:')) {
      const value = line.slice('name:'.length).trim().replace(/^['"]|['"]$/g, '');
      return value || null;
    }
  }
  return null;
}

/**
 * Card title for a git-fan-out artifact. Prefer skill frontmatter name; never title
 * the card as the GitHub repository name alone when a repo-relative path exists.
 * @param {{ type: string, artifactDir: string, relPath: string, repo: string }} args
 * @returns {string}
 */
export function gitFanoutDisplayName({ type, artifactDir, relPath, repo }) {
  const posixRel = String(relPath || '').split(path.sep).join('/').replace(/^\.\/+/, '');
  let leaf = path.basename(artifactDir);
  if (type === 'skill') {
    const fromFrontmatter = readSkillFrontmatterName(path.join(artifactDir, 'SKILL.md'));
    if (fromFrontmatter) leaf = fromFrontmatter;
  }
  if (posixRel && leaf === repo) return posixRel;
  return leaf;
}

async function discoverGitHubRepo(target, cloneRepoFn) {
  const gitHub = parseGitHubBrowseUrl(target);
  if (!gitHub) return null;
  const destDir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-git-'));
  try {
    await cloneRepoFn(gitHub.cloneUrl, destDir);
    const scopeDir = path.join(destDir, gitHub.scopePath || '');
    if (!await isDir(scopeDir)) return [];
    const artifacts = await walkArtifacts(scopeDir);
    return artifacts.map(artifact => {
      const rel = path.relative(destDir, artifact.target).split(path.sep).join('/');
      return {
        target: artifact.target,
        type: artifact.type,
        locus: 'local',
        avail: 'source_on_disk',
        identifier: `${gitHub.org}/${gitHub.repo}/${rel}`,
        name: gitFanoutDisplayName({
          type: artifact.type,
          artifactDir: artifact.target,
          relPath: rel,
          repo: gitHub.repo,
        }),
        gitCloneUrl: gitHub.cloneUrl,
      };
    });
  } catch (error) {
    await rm(destDir, { recursive: true, force: true });
    throw error;
  }
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

function collectPathCandidates(entry) {
  const candidates = [];
  if (typeof entry.command === 'string') candidates.push(entry.command);
  if (!Array.isArray(entry.args)) return candidates;
  for (const arg of entry.args) {
    if (typeof arg === 'string') candidates.push(arg);
  }
  return candidates;
}

function isPathLikeToken(raw) {
  // Bare tokens (bash, npx, node) are not packable source roots.
  return raw.includes('/') || raw.includes('\\');
}

function resolveMcpServerDir(raw) {
  if (!isPathLikeToken(raw)) return null;
  const candidate = path.resolve(raw);
  if (!existsSync(candidate)) return null;
  if (looksLikeMcpServer(candidate)) return candidate;
  const parent = path.dirname(candidate);
  return looksLikeMcpServer(parent) ? parent : null;
}

/**
 * Derive a host directory to tar for Modal from an MCP server config entry.
 * Identity stays the config key; this path is pack-only (never the identifier).
 * Looks at command + args for existing filesystem paths that sit in (or are)
 * an MCP server dir (run.sh / server.py / package.json / …).
 */
function resolvePackPathFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  for (const raw of collectPathCandidates(entry)) {
    const packPath = resolveMcpServerDir(raw);
    if (packPath) return packPath;
  }
  return null;
}

async function tryExpandManifest(filePath) {
  try {
    const json = JSON.parse(await readFile(filePath, 'utf8'));
    if (json.mcpServers && typeof json.mcpServers === 'object') {
      return Object.keys(json.mcpServers).map(name => ({
        manifestEntry: name,
        manifest: filePath,
        packPath: resolvePackPathFromEntry(json.mcpServers[name]),
      }));
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

async function metadataFor(target) {
  if (typeof target === 'string') return detectType(target);
  if (target.type) return { type: target.type, locus: target.locus, avail: target.avail };
  if (target.packPath) return detectType(target.packPath);
  return { type: 'mcp_server', locus: 'local', avail: 'introspection_only' };
}

async function annotateTarget(target) {
  if (typeof target === 'string') return { target, ...await metadataFor(target) };
  const {
    target: explicitTarget, manifestEntry, packPath, manifest, ...fields
  } = target;
  const row = {
    ...fields,
    target: explicitTarget || manifestEntry,
    ...await metadataFor(target),
  };
  if (packPath) row.packPath = packPath;
  if (manifest) row.manifest = manifest;
  return row;
}

async function annotateWithTypes(resolved) {
  return Promise.all(resolved.map(annotateTarget));
}

async function resolveExplicitTarget(target, cloneRepoFn) {
  const gitHubTargets = await discoverGitHubRepo(target, cloneRepoFn);
  if (gitHubTargets) return gitHubTargets;
  return resolveTarget(target);
}

const VALID_TYPE_FILTERS = ['skill', 'mcp'];

function _filterByType(items, typeFilter) {
  if (!typeFilter) return items;
  const want = typeFilter === 'mcp' ? 'mcp_server' : 'skill';
  return items.filter(item => item.type === want);
}

export async function discoverTargets({
  targets, targetsFile, useDefaults, typeFilter = null, cloneRepoFn = defaultCloneRepo,
}) {
  let raw = targets && targets.length ? targets : [];
  if (targetsFile) {
    const json = JSON.parse(await readFile(targetsFile, 'utf8'));
    raw = raw.concat(json.targets || []);
  }
  if (raw.length === 0) {
    if (!useDefaults) return [];
    const defaults = await discoverDefaults();
    const annotated = await annotateWithTypes(defaults);
    if (!typeFilter) return annotated;
    return _filterByType(annotated, typeFilter);
  }

  const resolved = (await Promise.all(
    raw.map(target => resolveExplicitTarget(target, cloneRepoFn)),
  )).flat();
  return _filterByType(await annotateWithTypes(resolved), typeFilter);
}

export { VALID_TYPE_FILTERS };
