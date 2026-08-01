import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverTargets } from '../src/discovery.js';

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
