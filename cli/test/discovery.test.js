import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverTargets } from '../src/discovery.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MCP_FIXTURES = path.join(REPO_ROOT, 'fixtures/mcp');

test('single skill folder resolves as one item, not a batch', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-'));
  await writeFile(path.join(dir, 'SKILL.md'), '# test skill');
  const result = await discoverTargets({ targets: [dir], useDefaults: true });
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'skill');
  await rm(dir, { recursive: true, force: true });
});

test('folder of multiple skill subfolders expands to N items', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tripwire-'));
  for (const name of ['a', 'b', 'c']) {
    const sub = path.join(root, name);
    await mkdir(sub);
    await writeFile(path.join(sub, 'SKILL.md'), '# ' + name);
  }
  const result = await discoverTargets({ targets: [root], useDefaults: true });
  assert.equal(result.length, 3);
  await rm(root, { recursive: true, force: true });
});

test('empty args with useDefaults=false returns nothing (caller errors)', async () => {
  const result = await discoverTargets({ targets: [], useDefaults: false });
  assert.deepEqual(result, []);
});

test('github URL is detected as cloneable mcp_server', async () => {
  const result = await discoverTargets({ targets: ['https://github.com/org/mcp-server'], useDefaults: true });
  assert.equal(result[0].type, 'mcp_server');
  assert.equal(result[0].avail, 'cloneable');
});

test('bare https endpoint is detected as introspection-only mcp_server', async () => {
  const result = await discoverTargets({ targets: ['https://mcp.example.com/sse'], useDefaults: true });
  assert.equal(result[0].avail, 'introspection_only');
});

test('MCP server directory with server.py resolves as one mcp_server target', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-mcp-'));
  await writeFile(path.join(dir, 'server.py'), '# mcp server');
  await writeFile(path.join(dir, 'run.sh'), '#!/bin/bash');
  const result = await discoverTargets({ targets: [dir], useDefaults: false });
  assert.equal(result.length, 1, 'Expected exactly one target for an MCP server dir');
  assert.equal(result[0].type, 'mcp_server');
  assert.equal(result[0].avail, 'source_on_disk');
  assert.ok(result[0].target.includes(dir), 'Target path should match the input dir');
  await rm(dir, { recursive: true, force: true });
});

test('parent dir containing MCP server subdirs expands to N mcp_server targets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tripwire-mcp-'));
  for (const name of ['server-a', 'server-b']) {
    const sub = path.join(root, name);
    await mkdir(sub);
    await writeFile(path.join(sub, 'server.py'), '# mcp');
  }
  const result = await discoverTargets({ targets: [root], useDefaults: false });
  assert.equal(result.length, 2, 'Expected two targets from parent MCP dir');
  for (const r of result) {
    assert.equal(r.type, 'mcp_server');
  }
  await rm(root, { recursive: true, force: true });
});

test('real fixture: fixtures/mcp/safe-time-server resolves as mcp_server', async () => {
  const fixtureDir = path.join(MCP_FIXTURES, 'safe-time-server');
  const result = await discoverTargets({ targets: [fixtureDir], useDefaults: false });
  assert.equal(result.length, 1, 'Expected one target for safe-time-server fixture');
  assert.equal(result[0].type, 'mcp_server');
});

test('real fixture: fixtures/mcp parent dir expands all MCP server subdirs', async () => {
  const result = await discoverTargets({ targets: [MCP_FIXTURES], useDefaults: false });
  assert.ok(result.length >= 4, `Expected at least 4 MCP server subdirs, got ${result.length}`);
  for (const r of result) {
    assert.equal(r.type, 'mcp_server');
  }
});

// --- slice-40: typeFilter ---

async function makeMixedFolder() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tripwire-mixed-'));
  const skill = path.join(root, 'my-skill');
  const mcp = path.join(root, 'my-mcp');
  await mkdir(skill);
  await mkdir(mcp);
  await writeFile(path.join(skill, 'SKILL.md'), '# skill');
  await writeFile(path.join(mcp, 'server.py'), '# mcp');
  return root;
}

test('typeFilter=skill excludes mcp_server targets from a mixed folder', async () => {
  /**
   * Scenario: Given a folder with both a skill subdir and an MCP server subdir
   *   When discoverTargets is called with typeFilter: 'skill'
   *   Then only items with type 'skill' are returned.
   */
  const root = await makeMixedFolder();
  const result = await discoverTargets({ targets: [root], useDefaults: false, typeFilter: 'skill' });
  assert.ok(result.length > 0, 'Expected at least one skill');
  assert.ok(result.every(r => r.type === 'skill'), `Expected all skill, got: ${JSON.stringify(result)}`);
  await rm(root, { recursive: true, force: true });
});

test('typeFilter=mcp excludes skill targets from a mixed folder', async () => {
  /**
   * Scenario: Given a folder with both a skill subdir and an MCP server subdir
   *   When discoverTargets is called with typeFilter: 'mcp'
   *   Then only items with type 'mcp_server' are returned.
   */
  const root = await makeMixedFolder();
  const result = await discoverTargets({ targets: [root], useDefaults: false, typeFilter: 'mcp' });
  assert.ok(result.length > 0, 'Expected at least one mcp_server');
  assert.ok(result.every(r => r.type === 'mcp_server'), `Expected all mcp_server, got: ${JSON.stringify(result)}`);
  await rm(root, { recursive: true, force: true });
});

test('typeFilter=null returns all types (existing behaviour preserved)', async () => {
  /**
   * Scenario: Given a mixed folder
   *   When discoverTargets is called with no typeFilter
   *   Then both skill and mcp_server items are returned.
   */
  const root = await makeMixedFolder();
  const result = await discoverTargets({ targets: [root], useDefaults: false });
  const types = new Set(result.map(r => r.type));
  assert.ok(types.has('skill'), 'Expected a skill item');
  assert.ok(types.has('mcp_server'), 'Expected an mcp_server item');
  await rm(root, { recursive: true, force: true });
});

test('typeFilter=skill on mixed explicit targets annotates and filters — only skills returned', async () => {
  /**
   * Scenario: Given a folder containing both skill and MCP server subdirs
   *   When discoverTargets is called with typeFilter: 'skill' on explicit targets
   *   Then every returned item has type 'skill'.
   *
   * Note: explicit targets enter via the annotateWithTypes + _filterByType path (line 174).
   * The useDefaults=true + typeFilter path is tested separately below.
   */
  const root = await makeMixedFolder();
  const result = await discoverTargets({ targets: [root], useDefaults: false, typeFilter: 'skill' });
  assert.ok(result.length > 0, 'Expected at least one skill from mixed folder');
  assert.ok(result.every(r => r.type === 'skill'), `Not all items are skills: ${JSON.stringify(result.filter(r => r.type !== 'skill'))}`);
  await rm(root, { recursive: true, force: true });
});

test('typeFilter=skill with useDefaults=true on fixture defaults — only skills returned', async () => {
  /**
   * Scenario: Given a cwd with .cursor/skills containing a skill subfolder and
   *   .cursor/mcp.json containing an MCP server entry,
   *   When discoverTargets is called with useDefaults=true and typeFilter='skill',
   *   Then every returned item has type 'skill' — MCP defaults are filtered out.
   *
   * This exercises discovery.js lines 165-167 — the production code path triggered
   * by `tripwire scan --type skill` with no explicit targets.
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-deftype-'));
  const skillDir = path.join(dir, '.cursor', 'skills', 'demo-skill');
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '# demo');
  await writeFile(path.join(dir, '.cursor', 'mcp.json'), JSON.stringify({
    mcpServers: { 'demo-mcp': { command: 'npx' } },
  }));
  const prev = process.cwd();

  // -- When --
  try {
    process.chdir(dir);
    const result = await discoverTargets({ targets: [], useDefaults: true, typeFilter: 'skill' });

    // -- Then --
    assert.ok(result.length > 0, 'Expected at least one skill from fixture defaults');
    assert.ok(result.every(r => r.type === 'skill'), `Not all items are skills: ${JSON.stringify(result.filter(r => r.type !== 'skill'))}`);
  } finally {
    process.chdir(prev);
    await rm(dir, { recursive: true, force: true });
  }
});

// --- slice-42 A3: MCP server locus detection from manifest entries ---

test('manifest entry WITH packPath pointing to server.py dir → locus=local avail=source_on_disk', async () => {
  /**
   * Scenario: GWT-42.2 — manifest entry has a resolvable packPath (source on disk)
   *   Given an mcp.json whose command points to a dir containing server.py
   *   When discoverTargets resolves that manifest
   *   Then the item has locus='local' and avail='source_on_disk' (not 'unknown')
   *
   * Slice: 42 / A3 — MCP server locus detection fix
   */
  // ### Given
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-mcp-packpath-'));
  await writeFile(path.join(dir, 'server.py'), '# mcp stub');
  await writeFile(path.join(dir, 'run.sh'), '#!/bin/bash\necho hello');
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(manifest, JSON.stringify({
    mcpServers: { 'my-server': { command: path.join(dir, 'run.sh') } },
  }));

  // ### When
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // ### Then
  assert.equal(result.length, 1, 'Expected one MCP server item from manifest');
  assert.equal(result[0].type, 'mcp_server');
  assert.equal(result[0].locus, 'local', 'locus must be local, not unknown');
  assert.equal(result[0].avail, 'source_on_disk', 'avail must be source_on_disk for packPath entries');

  await rm(dir, { recursive: true, force: true });
});

test('manifest entry WITHOUT packPath (bare-binary command) → locus=local avail=introspection_only', async () => {
  /**
   * Scenario: GWT-42.2 — manifest entry has no resolvable packPath (bare binary like npx)
   *   Given an mcp.json with a bare-binary command that has no local filesystem path
   *   When discoverTargets resolves that manifest
   *   Then the item has locus='local' and avail='introspection_only' (not 'unknown')
   *
   * Slice: 42 / A3 — MCP server locus detection fix
   */
  // ### Given
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-mcp-bare-'));
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(manifest, JSON.stringify({
    mcpServers: { 'context7': { command: 'npx', args: ['context7'] } },
  }));

  // ### When
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // ### Then
  assert.equal(result.length, 1, 'Expected one MCP server item from manifest');
  assert.equal(result[0].type, 'mcp_server');
  assert.equal(result[0].locus, 'local', 'locus must be local, not unknown');
  assert.equal(result[0].avail, 'introspection_only', 'avail must be introspection_only for bare-binary entries');

  await rm(dir, { recursive: true, force: true });
});
