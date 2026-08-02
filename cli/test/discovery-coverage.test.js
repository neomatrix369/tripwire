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

    // -- Then — defaults return raw manifest entries (pre-typing)
    assert.ok(result.some((r) => r.manifestEntry === 'local'));
  } finally {
    process.chdir(prev);
    await rm(root, { recursive: true, force: true });
  }
});
