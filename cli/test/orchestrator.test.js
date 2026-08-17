import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const tripwireBin = new URL('../bin/tripwire.js', import.meta.url).pathname;

test('tripwire scan --help includes --force flag with description', async () => {
  const { stdout } = await exec('node', [tripwireBin, 'scan', '--help']);
  assert.match(stdout, /--force/, 'Expected --force flag in scan help');
  assert.match(stdout, /re-scan even if content hash is unchanged/,
    'Expected descriptive help text for --force');
});

test('tripwire setup --help retains its own --force (no collision)', async () => {
  const { stdout } = await exec('node', [tripwireBin, 'setup', '--help']);
  assert.match(stdout, /--force/, 'Expected --force flag in setup help');
  assert.match(stdout, /re-apply schema/,
    'setup --force description should be about schema, not scanning');
});

test('scan --force is a boolean flag (no argument required)', async () => {
  const { stdout } = await exec('node', [tripwireBin, 'scan', '--help']);
  assert.doesNotMatch(stdout, /--force </, '--force should not require an argument');
});

test('scan --no-defaults exits with actionable guidance when no targets are supplied', async () => {
  // -- Given --
  const args = [tripwireBin, 'scan', '--no-defaults'];

  // -- When / Then --
  await assert.rejects(
    () => exec('node', args),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /No targets found/);
      return true;
    },
  );
});

test('setup reports its environment requirement instead of applying schema without credentials', async () => {
  // -- Given --
  const args = [tripwireBin, 'setup'];
  const env = { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_DB_URL: '' };

  // -- When / Then --
  await assert.rejects(
    () => exec('node', args, { env }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /SUPABASE_URL/);
      return true;
    },
  );
});

test('given invalid concurrency when scan starts then it exits before discovery or persistence', async () => {
  // -- Given --
  const args = [tripwireBin, 'scan', '--concurrency', '0', '--no-defaults'];

  // -- When / Then --
  await assert.rejects(
    () => exec('node', args),
    (error) => error.code === 1 && /positive integer/.test(error.stderr),
  );
});

test('given malformed targets JSON when dry discovery runs then it exits with an actionable error', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(tmpdir(), 'tw-targets-'));
  const targets = path.join(dir, 'targets.json');
  await writeFile(targets, '{not-json');

  // -- When / Then --
  try {
    await assert.rejects(
      () => exec('node', [tripwireBin, 'scan', '--targets', targets, '--dry-discover']),
      (error) => error.code === 1 && /JSON|property name/.test(error.stderr),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('given an explicit MCP endpoint when dry discovery runs then it reports the discovered target without scanning', async () => {
  // -- Given --
  const endpoint = 'https://mcp.example.test/sse';

  // -- When --
  const { stdout } = await exec('node', [tripwireBin, 'scan', endpoint, '--dry-discover']);

  // -- Then --
  assert.match(stdout, /mcp\.example\.test/);
  assert.match(stdout, /introspection_only/);
});

test('given invalid --type value when scan starts then it exits non-zero with valid values listed', async () => {
  /**
   * Scenario: Invalid type rejected
   * Given an operator passes --type badvalue
   * When the scan command is invoked
   * Then the process exits non-zero with a message explaining valid values.
   */
  // -- Given --
  const args = [tripwireBin, 'scan', '--type', 'badvalue', '--dry-discover'];

  // -- When / Then --
  await assert.rejects(
    () => exec('node', args),
    (error) => error.code === 1 && /skill.*mcp|mcp.*skill/.test(error.stderr),
  );
});
