/**
 * Acceptance tests for tripwire setup-agent-hooks (slice 24).
 *
 * Author: swami
 * Created: 2026-08-15
 * Scope: hooks install+mode 700, config first-write/preserve, PreToolUse register, idempotent re-run
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { setupAgentHooks } from '../src/setupAgentHooks.js';

const exec = promisify(execFile);
const tripwireBin = fileURLToPath(new URL('../bin/tripwire.js', import.meta.url));

async function makeFixtureHome() {
  return mkdtemp(path.join(tmpdir(), 'tw-setup-hooks-'));
}

function settingsPathFor(home) {
  return path.join(home, '.claude', 'settings.json');
}

function configPathFor(home) {
  return path.join(home, '.tripwire', 'config.json');
}

function hooksDirFor(home) {
  return path.join(home, '.tripwire', 'hooks');
}

function isTripwirePreToolUseCommand(command, preToolUseSh) {
  if (typeof command !== 'string') {
    return false;
  }
  return command === preToolUseSh || command.includes('.tripwire/hooks/pre-tool-use.sh');
}

function commandStringsFromEntry(entry) {
  const inner = Array.isArray(entry?.hooks) ? entry.hooks : [];
  return inner
    .filter((h) => h?.type === 'command' && typeof h.command === 'string')
    .map((h) => h.command);
}

function countTripwirePreToolUse(settings, preToolUseSh) {
  const entries = settings?.hooks?.PreToolUse;
  if (!Array.isArray(entries)) {
    return 0;
  }
  return entries
    .flatMap(commandStringsFromEntry)
    .filter((cmd) => isTripwirePreToolUseCommand(cmd, preToolUseSh))
    .length;
}

test('given clean home when setup-agent-hooks runs then hooks exist with mode 700', async () => {
  /**
   * Scenario: Install lands handler scripts under owner-only hooks dir.
   * Slice: 24 — hooks land with correct permissions
   *
   * Given a clean fixture HOME,
   * When setup-agent-hooks runs,
   * Then pre-tool-use.sh and _guard_entry.py exist and hooks dir mode is 700.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settings = settingsPathFor(home);

  try {
    // -- When --
    const result = await setupAgentHooks({ homeDir: home, claudeSettingsPath: settings });

    // -- Then --
    const dirStat = await stat(hooksDirFor(home));
    assert.equal(dirStat.mode & 0o777, 0o700, 'hooks directory must be mode 700');
    await assert.doesNotReject(() => readFile(path.join(hooksDirFor(home), 'pre-tool-use.sh')));
    await assert.doesNotReject(() => readFile(path.join(hooksDirFor(home), '_guard_entry.py')));
    assert.equal(result.preToolUseSh, path.join(hooksDirFor(home), 'pre-tool-use.sh'));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('given no config when setup runs then defaults enable true and scan_validity_days 14', async () => {
  /**
   * Scenario: First install writes slice-23 config defaults.
   * Slice: 24 — config created when absent
   *
   * Given no ~/.tripwire/config.json,
   * When setup-agent-hooks runs,
   * Then config has enable=true and scan_validity_days=14.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settings = settingsPathFor(home);

  try {
    // -- When --
    await setupAgentHooks({ homeDir: home, claudeSettingsPath: settings });

    // -- Then --
    const raw = await readFile(configPathFor(home), 'utf8');
    const config = JSON.parse(raw);
    assert.equal(config.enable, true);
    assert.equal(config.scan_validity_days, 14);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('given existing config when setup runs again then values are preserved', async () => {
  /**
   * Scenario: Re-install must not clobber operator config.
   * Slice: 24 — existing config preserved
   *
   * Given config with enable=false and scan_validity_days=7,
   * When setup-agent-hooks runs again,
   * Then those values are unchanged.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settings = settingsPathFor(home);
  await mkdir(path.dirname(configPathFor(home)), { recursive: true });
  await writeFile(
    configPathFor(home),
    `${JSON.stringify({ enable: false, scan_validity_days: 7 }, null, 2)}\n`,
    'utf8',
  );

  try {
    // -- When --
    await setupAgentHooks({ homeDir: home, claudeSettingsPath: settings });

    // -- Then --
    const config = JSON.parse(await readFile(configPathFor(home), 'utf8'));
    assert.equal(config.enable, false);
    assert.equal(config.scan_validity_days, 7);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('given settings without Tripwire hook when setup runs then PreToolUse points at installed script', async () => {
  /**
   * Scenario: Claude settings gain a PreToolUse command for Tripwire.
   * Slice: 24 — PreToolUse registered
   *
   * Given Claude settings without a Tripwire PreToolUse hook,
   * When setup-agent-hooks runs,
   * Then settings contain a command pointing at installed pre-tool-use.sh.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settingsFile = settingsPathFor(home);
  await mkdir(path.dirname(settingsFile), { recursive: true });
  await writeFile(settingsFile, `${JSON.stringify({ hooks: {} }, null, 2)}\n`, 'utf8');

  try {
    // -- When --
    const result = await setupAgentHooks({ homeDir: home, claudeSettingsPath: settingsFile });

    // -- Then --
    const settings = JSON.parse(await readFile(settingsFile, 'utf8'));
    assert.equal(countTripwirePreToolUse(settings, result.preToolUseSh), 1);
    const commands = settings.hooks.PreToolUse.flatMap((e) => (e.hooks || []).map((h) => h.command));
    assert.ok(commands.includes(result.preToolUseSh), 'PreToolUse command must be installed script path');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('given setup already ran when setup runs again then Tripwire PreToolUse is not duplicated', async () => {
  /**
   * Scenario: Idempotent re-run keeps a single Tripwire PreToolUse entry.
   * Slice: 24 — idempotent re-run
   *
   * Given setup already ran once,
   * When setup runs again,
   * Then exactly one Tripwire PreToolUse command entry remains.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settingsFile = settingsPathFor(home);
  const first = await setupAgentHooks({ homeDir: home, claudeSettingsPath: settingsFile });

  try {
    // -- When --
    const second = await setupAgentHooks({ homeDir: home, claudeSettingsPath: settingsFile });

    // -- Then --
    const settings = JSON.parse(await readFile(settingsFile, 'utf8'));
    assert.equal(countTripwirePreToolUse(settings, second.preToolUseSh), 1);
    assert.equal(first.preToolUseSh, second.preToolUseSh);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('tripwire setup-agent-hooks appears in --help', async () => {
  /**
   * Scenario: CLI surface lists the install subcommand.
   * Slice: 24 — operator discoverability
   *
   * Given the tripwire CLI binary,
   * When --help is shown,
   * Then setup-agent-hooks is listed.
   */
  // -- When --
  const { stdout } = await exec('node', [tripwireBin, '--help']);

  // -- Then --
  assert.match(stdout, /setup-agent-hooks/);
});

test('CLI setup-agent-hooks with --home installs into fixture home', async () => {
  /**
   * Scenario: Production entry point reaches setupAgentHooks.
   * Slice: 24 — CLI integration
   *
   * Given a clean fixture HOME,
   * When `tripwire setup-agent-hooks --home … --claude-settings …` runs,
   * Then stdout JSON reports ok and hooks land under that HOME.
   */
  // -- Given --
  const home = await makeFixtureHome();
  const settings = settingsPathFor(home);

  try {
    // -- When --
    const { stdout } = await exec('node', [
      tripwireBin,
      'setup-agent-hooks',
      '--home',
      home,
      '--claude-settings',
      settings,
    ]);

    // -- Then --
    const payload = JSON.parse(stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.hooksDir, hooksDirFor(home));
    const dirStat = await stat(hooksDirFor(home));
    assert.equal(dirStat.mode & 0o777, 0o700);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
