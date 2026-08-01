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
