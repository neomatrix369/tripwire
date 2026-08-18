/**
 * Coverage tests for loadEnv success path.
 *
 * Author: swami
 * Created: 2026-08-17
 * Scope: cwd-walk finds .env and returns path (lines 21-22)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadEnv } from '../src/loadEnv.js';

test('given .env reachable from cwd walk when loadEnv then returns non-null path', async () => {
  /**
   * Scenario: cwd walk finds a .env before exhausting candidates.
   * Slice: coverage — loadEnv.js lines 21-22 (config called + return path)
   *
   * Given a temp directory containing a .env file,
   * When loadEnv is called with process.cwd() set to that directory,
   * Then it returns a non-null path (the .env was found and loaded).
   */
  // -- Given --
  const dir = await mkdtemp(path.join(os.tmpdir(), 'tw-loadenv-'));
  await writeFile(path.join(dir, '.env'), 'TW_LOADENV_TEST=1\n');
  const prev = process.cwd();

  // -- When --
  let result;
  try {
    process.chdir(dir);
    result = loadEnv();
  } finally {
    process.chdir(prev);
    await rm(dir, { recursive: true, force: true });
  }

  // -- Then --
  assert.ok(result !== null, 'loadEnv should return a non-null path when .env is found');
  assert.ok(typeof result === 'string', 'returned path should be a string');
});
