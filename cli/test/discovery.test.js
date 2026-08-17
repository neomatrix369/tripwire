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

test('typeFilter=skill on defaults annotates and filters — only skills returned', async () => {
  /**
   * Scenario: Given machine defaults contain both skills and MCP manifest entries
   *   When discoverTargets is called with useDefaults=true and typeFilter: 'skill'
   *   Then every returned item has type 'skill'.
   */
  const result = await discoverTargets({ targets: [], useDefaults: true, typeFilter: 'skill' });
  // There must be at least one skill on this machine (this project has local skills)
  assert.ok(result.length > 0, 'Expected at least one skill from defaults');
  assert.ok(result.every(r => r.type === 'skill'), `Not all items are skills: ${JSON.stringify(result.filter(r => r.type !== 'skill'))}`);
});
