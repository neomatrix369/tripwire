import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
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
