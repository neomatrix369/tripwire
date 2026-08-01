import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hashLocalPath, hashSchema } from '../src/hash.js';

test('identical content hashes identically (idempotency precondition)', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-'));
  await writeFile(path.join(dir, 'SKILL.md'), 'same content');
  const h1 = await hashLocalPath(dir);
  const h2 = await hashLocalPath(dir);
  assert.equal(h1, h2);
  await rm(dir, { recursive: true, force: true });
});

test('changed content changes the hash (drift precondition)', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tripwire-'));
  await writeFile(path.join(dir, 'SKILL.md'), 'v1');
  const h1 = await hashLocalPath(dir);
  await writeFile(path.join(dir, 'SKILL.md'), 'v2 — added a webhook');
  const h2 = await hashLocalPath(dir);
  assert.notEqual(h1, h2);
  await rm(dir, { recursive: true, force: true });
});

test('hashSchema is stable for identical tool schemas', () => {
  const schema = { tools: [{ name: 'run_shell', params: ['cmd'] }] };
  assert.equal(hashSchema(schema), hashSchema(JSON.parse(JSON.stringify(schema))));
});
