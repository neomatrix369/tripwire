/**
 * Extra discovery coverage for defaults, manifests, and folder expansion.
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: targetsFile, mcp.json expand, useDefaults roots, non-skill folder expand
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverTargets } from '../src/discovery.js';

test('given targetsFile when discover then merges file targets', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-tf-'));
  const skill = path.join(dir, 's');
  await mkdir(skill);
  await writeFile(path.join(skill, 'SKILL.md'), '# s');
  const file = path.join(dir, 'targets.json');
  await writeFile(file, JSON.stringify({ targets: [skill] }));

  // -- When --
  const result = await discoverTargets({ targets: [], targetsFile: file, useDefaults: false });

  // -- Then --
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'skill');
  await rm(dir, { recursive: true, force: true });
});

test('given mcp manifest json when discover then expands server names', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-mcp-'));
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(
    manifest,
    JSON.stringify({ mcpServers: { alpha: { url: 'https://a' }, beta: { url: 'https://b' } } })
  );

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then --
  assert.equal(result.length, 2);
  assert.ok(result.some((r) => r.target === 'alpha'));
  assert.ok(result.some((r) => r.target === 'beta'));
  await rm(dir, { recursive: true, force: true });
});

test('given stdio mcp manifest when discover then sets packPath from args', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-mcp-pack-'));
  const serverDir = path.join(dir, 'safe-time-server');
  await mkdir(serverDir);
  const runSh = path.join(serverDir, 'run.sh');
  await writeFile(runSh, '#!/bin/bash\n');
  const manifest = path.join(dir, 'demo-mcp.json');
  await writeFile(
    manifest,
    JSON.stringify({
      mcpServers: {
        'safe-tool': { type: 'stdio', command: 'bash', args: [runSh] },
        'url-only': { url: 'https://example.com/mcp' },
      },
    })
  );

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then — key identity + packPath for local stdio; no packPath for URL-only
  const safe = result.find((r) => r.target === 'safe-tool');
  const urlOnly = result.find((r) => r.target === 'url-only');
  assert.ok(safe);
  assert.equal(safe.packPath, serverDir);
  assert.equal(safe.avail, 'source_on_disk'); // packPath resolves to local source (slice-42 A3 fix)
  assert.ok(urlOnly);
  assert.equal(urlOnly.packPath, undefined);
  await rm(dir, { recursive: true, force: true });
});

test('given malformed manifest when discover then treats as regular target', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-bad-'));
  const manifest = path.join(dir, 'broken.json');
  await writeFile(manifest, '{not-json');

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then --
  assert.equal(result.length, 1);
  assert.equal(result[0].target, manifest);
  await rm(dir, { recursive: true, force: true });
});

test('given folder with mcp subdir when expand then includes mcp server', async () => {
  // -- Given --
  const root = await mkdtemp(path.join(os.tmpdir(), 'tw-exp-'));
  const mcp = path.join(root, 'svc');
  await mkdir(mcp);
  await writeFile(path.join(mcp, 'server.js'), 'export default {}');

  // -- When --
  const result = await discoverTargets({ targets: [root], useDefaults: false });

  // -- Then --
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'mcp_server');
  await rm(root, { recursive: true, force: true });
});

test('given gitlab git url when discover then cloneable', async () => {
  // -- Given / When --
  const result = await discoverTargets({
    targets: ['https://gitlab.com/org/repo.git'],
    useDefaults: false,
  });

  // -- Then --
  assert.equal(result[0].avail, 'cloneable');
});

test('given cwd mcp manifest when useDefaults then discovers server names', async () => {
  // -- Given --
  const root = await mkdtemp(path.join(os.tmpdir(), 'tw-def-'));
  await mkdir(path.join(root, '.cursor'), { recursive: true });
  const manifest = path.join(root, '.cursor', 'mcp.json');
  await writeFile(manifest, JSON.stringify({ mcpServers: { local: { command: 'npx' } } }));
  // Malformed sibling manifest exercises catch path
  await writeFile(path.join(root, '.mcp.json'), '{bad');
  const prev = process.cwd();

  // -- When --
  try {
    process.chdir(root);
    const result = await discoverTargets({ targets: [], useDefaults: true });

    // -- Then — defaults are annotated; entry appears as target with mcp_server type
    assert.ok(result.some((r) => r.target === 'local'));
  } finally {
    process.chdir(prev);
    await rm(root, { recursive: true, force: true });
  }
});

test('given default mcp.json without mcpServers key when discoverDefaults then no servers added', async () => {
  /**
   * Scenario: json.mcpServers falsy → servers = [] skips the push in discoverDefaults.
   * Slice: coverage — discovery.js line 61 false branch
   *
   * Given a .mcp.json in cwd that has no mcpServers key (only a version key),
   * When discoverTargets is called with useDefaults=true and no explicit targets,
   * Then no entries are added for that manifest (servers = []).
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-noservers-'));
  await writeFile(path.join(dir, '.mcp.json'), JSON.stringify({ version: 1 }));
  const prev = process.cwd();

  // -- When --
  let result;
  try {
    process.chdir(dir);
    result = await discoverTargets({ targets: [], useDefaults: true });
  } finally {
    process.chdir(prev);
    await rm(dir, { recursive: true, force: true });
  }

  // -- Then --
  const fromMcp = result.filter((r) => r.manifest && r.manifest.endsWith('.mcp.json'));
  assert.equal(fromMcp.length, 0, 'no servers when mcpServers key is absent from .mcp.json');
});

test('given null manifest entry when discover then packPath is not set', async () => {
  /**
   * Scenario: resolvePackPathFromEntry(null) returns null — no packPath derived.
   * Slice: coverage — discovery.js line 100 true branch
   *
   * Given a manifest where a server entry is null,
   * When discoverTargets resolves the manifest,
   * Then the item is included (identifier present) but packPath is undefined.
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-nullentry-'));
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(manifest, JSON.stringify({ mcpServers: { 'null-server': null } }));

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then --
  const item = result.find((r) => r.target === 'null-server');
  assert.ok(item, 'null-server entry should still appear in results');
  assert.equal(item.packPath, undefined, 'no packPath when entry is null');
  await rm(dir, { recursive: true, force: true });
});

test('given path-like command pointing to non-existent file when discover then packPath absent', async () => {
  /**
   * Scenario: resolveMcpServerDir short-circuits on !existsSync(candidate).
   * Slice: coverage — discovery.js line 87 true branch
   *
   * Given a manifest entry whose command is a path-like token to a file that does not exist,
   * When discoverTargets resolves the manifest,
   * Then the item has no packPath (the non-existent path cannot be a server dir).
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-nonexist-'));
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(manifest, JSON.stringify({
    mcpServers: { ghost: { command: '/no/such/path/server.py' } },
  }));

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then --
  const item = result.find((r) => r.target === 'ghost');
  assert.ok(item, 'ghost entry should appear in results');
  assert.equal(item.packPath, undefined, 'non-existent path yields no packPath');
  await rm(dir, { recursive: true, force: true });
});

test('given path-like command to file in non-MCP dir when discover then packPath absent', async () => {
  /**
   * Scenario: resolveMcpServerDir finds a real file but neither it nor its parent
   *           looks like an MCP server dir — both false branches on lines 88 and 90.
   * Slice: coverage — discovery.js lines 88-90 false branches
   *
   * Given a manifest entry whose command is a plain file (no server.py/run.sh/package.json),
   * When discoverTargets resolves the manifest,
   * Then packPath is undefined because looksLikeMcpServer returns false for both levels.
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-nomcp-'));
  const subDir = path.join(dir, 'just-a-dir');
  await mkdir(subDir);
  const plainFile = path.join(subDir, 'readme.txt');
  await writeFile(plainFile, 'not an mcp server\n');
  const manifest = path.join(dir, 'mcp.json');
  await writeFile(manifest, JSON.stringify({
    mcpServers: { plain: { command: plainFile } },
  }));

  // -- When --
  const result = await discoverTargets({ targets: [manifest], useDefaults: false });

  // -- Then --
  const item = result.find((r) => r.target === 'plain');
  assert.ok(item, 'plain entry should appear in results');
  assert.equal(item.packPath, undefined, 'non-MCP dir yields no packPath');
  await rm(dir, { recursive: true, force: true });
});
