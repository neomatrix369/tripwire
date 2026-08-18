/**
 * setup-agent-hooks (plan §4.4, A4/T4) — all seams stubbed, real fs on temp dirs.
 * Covers: preflight hard-fails (including empty/placeholder .env values), config
 * create/preserve, handler install + pre-warm, settings JSON-merge (backup,
 * idempotency incl. `~/…` forms, atomic write, key preservation, last-mutating-step
 * ordering), skill overwrite-sync, bootstrap sweep target gathering (MCP manifest
 * FILES — never bare keys), mixed-stdout JSON extraction, and defaultScanFn's
 * chunk-safe UTF-8 decoding.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runSetupAgentHooks, extractTrailingJson, defaultScanFn, HOOK_MATCHER } from '../src/setupAgentHooks.js';

const VALID_ENV = 'SUPABASE_URL=https://example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=service-key\n';

const MIXED_STDOUT = [
  '[skip] /tmp/installed/tw-enable — content unchanged since last scan',
  '{',
  '  "batch_id": "batch-99",',
  '  "scan_run_ids": ["r-1", "r-2", "r-3"],',
  '  "failed_targets": [',
  '    { "target": "/tmp/installed/tw-broken", "error": "sandbox exited 1" }',
  '  ]',
  '}',
  '[route] batch batch-99 routed {"sie": "complete"}',
].join('\n');

/** Temp fixture: repo/ (env, agent-hooks sources), home/, project/ (cwd). */
async function withFixture(options, fn) {
  const { envContent, skills, settings, mcpJson, claudeJson } = {
    envContent: VALID_ENV, skills: ['tw-verify', 'tw-scan'], settings: null, mcpJson: null, claudeJson: null,
    ...options,
  };
  const base = await mkdtemp(path.join(tmpdir(), 'tw-setup-'));
  const fx = {
    base,
    repo: path.join(base, 'repo'),
    home: path.join(base, 'home'),
    cwd: path.join(base, 'project'),
  };
  try {
    await mkdir(path.join(fx.repo, 'agent-hooks', 'hooks'), { recursive: true });
    await mkdir(fx.home, { recursive: true });
    await mkdir(fx.cwd, { recursive: true });
    if (envContent !== null) await writeFile(path.join(fx.repo, '.env'), envContent);
    await writeFile(path.join(fx.repo, 'agent-hooks', 'hooks', 'pre-tool-use.sh'), '#!/usr/bin/env bash\necho fixture-handler\n');
    await writeFile(path.join(fx.repo, 'agent-hooks', 'hooks', '_guard_entry.py'), 'print("fixture-entry")\n');
    for (const name of skills) {
      const dir = path.join(fx.repo, 'agent-hooks', 'skills', name);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n---\n# ${name}\n`);
    }
    if (settings !== null) {
      await mkdir(path.join(fx.home, '.claude'), { recursive: true });
      await writeFile(path.join(fx.home, '.claude', 'settings.json'), settings);
    }
    if (mcpJson !== null) await writeFile(path.join(fx.cwd, '.mcp.json'), mcpJson);
    if (claudeJson !== null) await writeFile(path.join(fx.home, '.claude.json'), claudeJson);
    return await fn(fx);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

function makeExecFn({ uv = '/opt/fake/uv', modal = '/opt/fake/modal', failOn = null } = {}) {
  const calls = [];
  const execFn = async (command, opts = {}) => {
    calls.push({ command, opts });
    if (failOn && command.includes(failOn)) throw new Error(`stub failure for: ${command}`);
    if (command === 'command -v uv') {
      if (uv === null) throw new Error('uv: not found');
      return { stdout: `${uv}\n`, stderr: '' };
    }
    if (command === 'command -v modal') {
      if (modal === null) throw new Error('modal: not found');
      return { stdout: `${modal}\n`, stderr: '' };
    }
    return { stdout: '', stderr: '' };
  };
  execFn.calls = calls;
  return execFn;
}

function makeScanFn(stdout = MIXED_STDOUT) {
  const calls = [];
  const scanFn = async (args) => {
    calls.push(args);
    if (stdout instanceof Error) throw stdout;
    return { stdout };
  };
  scanFn.calls = calls;
  return scanFn;
}

function baseOpts(fx, overrides = {}) {
  return {
    repoRoot: fx.repo,
    homedir: fx.home,
    cwd: fx.cwd,
    nodeVersion: '20.11.0',
    execFn: makeExecFn(),
    scanFn: makeScanFn(),
    now: () => new Date('2026-08-15T12:00:00.000Z'),
    log: () => {},
    ...overrides,
  };
}

/** Run with console.log captured (the machine-readable stdout line). */
async function run(fx, overrides = {}) {
  const origLog = console.log;
  const stdoutLines = [];
  console.log = (...args) => stdoutLines.push(args.join(' '));
  try {
    const result = await runSetupAgentHooks(baseOpts(fx, overrides));
    return { result, stdoutLines };
  } finally {
    console.log = origLog;
  }
}

// ---------- preflight ----------

test('preflight rejects Node < 18 with remediation', async () => {
  await withFixture({}, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx, { nodeVersion: '16.20.2' })), /Node >= 18/);
    assert.equal(existsSync(path.join(fx.home, '.tripwire')), false, 'must fail before writing anything');
  });
});

test('preflight rejects when .env is missing', async () => {
  await withFixture({ envContent: null }, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /Missing .*\.env.*SUPABASE_URL/);
  });
});

test('preflight rejects when .env lacks SUPABASE_SERVICE_ROLE_KEY', async () => {
  await withFixture({ envContent: 'SUPABASE_URL=https://example.supabase.co\n' }, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /SUPABASE_SERVICE_ROLE_KEY/);
  });
});

test('preflight rejects an EMPTY value (copied .env.example) — key presence is not enough', async () => {
  const envContent = 'SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=real-looking-key\n';
  await withFixture({ envContent }, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /no value for SUPABASE_URL/);
    assert.equal(existsSync(path.join(fx.home, '.tripwire')), false, 'must hard-fail before arming anything');
  });
});

test('preflight rejects obvious placeholder values', async () => {
  const cases = [
    'SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=real-looking-key\n',
    'SUPABASE_URL=https://example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n',
    'SUPABASE_URL=https://example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=<paste key here>\n',
    'SUPABASE_URL=https://example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=changeme\n',
  ];
  for (const envContent of cases) {
    await withFixture({ envContent }, async (fx) => {
      await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /placeholder value/);
    });
  }
});

test('preflight accepts quoted real values (dotenv parsing, not raw line matching)', async () => {
  const envContent = 'export SUPABASE_URL="https://real-ref.supabase.co"\nSUPABASE_SERVICE_ROLE_KEY=\'eyJhbGciOi.service.role\'\n';
  await withFixture({ envContent }, async (fx) => {
    const { result } = await run(fx);
    assert.equal(result.status, 'installed');
  });
});

test('preflight rejects when uv is not on PATH', async () => {
  await withFixture({}, async (fx) => {
    await assert.rejects(
      runSetupAgentHooks(baseOpts(fx, { execFn: makeExecFn({ uv: null }) })),
      /`uv` not found on PATH/
    );
  });
});

test('preflight rejects when modal is not on PATH', async () => {
  await withFixture({}, async (fx) => {
    await assert.rejects(
      runSetupAgentHooks(baseOpts(fx, { execFn: makeExecFn({ modal: null }) })),
      /`modal` not found on PATH/
    );
  });
});

// ---------- config ----------

test('creates config.json with enable=true, 14-day validity, absolute paths', async () => {
  await withFixture({}, async (fx) => {
    const { result } = await run(fx);
    const configPath = path.join(fx.home, '.tripwire', 'config.json');
    assert.equal(result.config_path, configPath);
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    assert.deepEqual(config, {
      schema_version: 1,
      enable: true,
      scan_validity_days: 14,
      repo_root: fx.repo,
      cli_bin: path.join(fx.repo, 'cli', 'bin', 'tripwire.js'),
      env_file: path.join(fx.repo, '.env'),
      uv_bin: '/opt/fake/uv',
    });
    for (const key of ['repo_root', 'cli_bin', 'env_file', 'uv_bin']) {
      assert.ok(path.isAbsolute(config[key]), `${key} must be absolute`);
    }
  });
});

test('re-run never overwrites an existing config (enable=false preserved)', async () => {
  await withFixture({}, async (fx) => {
    await run(fx);
    const configPath = path.join(fx.home, '.tripwire', 'config.json');
    const edited = JSON.stringify({
      schema_version: 1, enable: false, scan_validity_days: 30,
      repo_root: fx.repo, cli_bin: 'x', env_file: 'y', uv_bin: 'z',
    });
    await writeFile(configPath, edited);
    const { result } = await run(fx);
    assert.equal(readFileSync(configPath, 'utf8'), edited, 'existing config must be byte-identical after re-run');
    assert.equal(result.status, 'installed');
  });
});

// ---------- handlers + pre-warm ----------

test('installs handler scripts chmod 700 and pre-warms guard env via uv sync', async () => {
  await withFixture({}, async (fx) => {
    const execFn = makeExecFn();
    await run(fx, { execFn });
    for (const name of ['pre-tool-use.sh', '_guard_entry.py']) {
      const dest = path.join(fx.home, '.tripwire', 'hooks', name);
      assert.ok(existsSync(dest), `${name} installed`);
      assert.equal(statSync(dest).mode & 0o777, 0o700, `${name} must be chmod 700`);
      assert.equal(
        readFileSync(dest, 'utf8'),
        readFileSync(path.join(fx.repo, 'agent-hooks', 'hooks', name), 'utf8')
      );
    }
    const prewarm = execFn.calls.find(c => c.command === '"/opt/fake/uv" sync --extra guard');
    assert.ok(prewarm, 'must run uv sync --extra guard');
    assert.equal(prewarm.opts.cwd, fx.repo, 'pre-warm must run with cwd=repo_root');
  });
});

test('pre-warm failure is a hard error with remediation', async () => {
  await withFixture({}, async (fx) => {
    await assert.rejects(
      runSetupAgentHooks(baseOpts(fx, { execFn: makeExecFn({ failOn: 'sync --extra guard' }) })),
      /pre-warm failed/i
    );
  });
});

// ---------- settings merge ----------

test('merges hook into existing settings.json, preserving unrelated keys, with backup', async () => {
  const original = JSON.stringify({
    permissions: { defaultMode: 'bypassPermissions' },
    model: 'opus',
    hooks: { SessionStart: [{ matcher: '*' }] },
  }, null, 2);
  await withFixture({ settings: original }, async (fx) => {
    await run(fx);
    const settingsPath = path.join(fx.home, '.claude', 'settings.json');
    const merged = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.deepEqual(merged.permissions, { defaultMode: 'bypassPermissions' });
    assert.equal(merged.model, 'opus');
    assert.deepEqual(merged.hooks.SessionStart, [{ matcher: '*' }], 'other hook events preserved');
    assert.equal(merged.hooks.PreToolUse.length, 1);
    assert.deepEqual(merged.hooks.PreToolUse[0], {
      matcher: HOOK_MATCHER,
      hooks: [{
        type: 'command',
        command: path.join(fx.home, '.tripwire', 'hooks', 'pre-tool-use.sh'),
        timeout: 10,
      }],
    });
    assert.equal(HOOK_MATCHER, '^(Skill|Bash|mcp__.*)$');
    const backups = (await readdir(path.join(fx.home, '.claude')))
      .filter(name => name.startsWith('settings.json.tripwire-bak-'));
    assert.equal(backups.length, 1, 'exactly one timestamped backup');
    assert.equal(
      await readFile(path.join(fx.home, '.claude', backups[0]), 'utf8'),
      original,
      'backup must hold the pre-merge content'
    );
  });
});

test('settings merge is idempotent — re-run adds no duplicate entry and no new backup', async () => {
  await withFixture({ settings: '{}' }, async (fx) => {
    await run(fx);
    await run(fx);
    const merged = JSON.parse(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'));
    assert.equal(merged.hooks.PreToolUse.length, 1, 'no duplicate PreToolUse entry on re-run');
    const backups = (await readdir(path.join(fx.home, '.claude')))
      .filter(name => name.startsWith('settings.json.tripwire-bak-'));
    assert.equal(backups.length, 1, 'second run modifies nothing, so no second backup');
  });
});

test('hand-installed `~/…` hook registration is detected — no duplicate entry, no rewrite', async () => {
  const settings = JSON.stringify({
    hooks: {
      PreToolUse: [{
        matcher: HOOK_MATCHER,
        hooks: [{ type: 'command', command: '~/.tripwire/hooks/pre-tool-use.sh', timeout: 10 }],
      }],
    },
  }, null, 2);
  await withFixture({ settings }, async (fx) => {
    await run(fx);
    const merged = JSON.parse(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'));
    assert.equal(merged.hooks.PreToolUse.length, 1, 'tilde form recognized as ours — no second entry');
    assert.equal(merged.hooks.PreToolUse[0].hooks[0].command, '~/.tripwire/hooks/pre-tool-use.sh');
    const backups = (await readdir(path.join(fx.home, '.claude')))
      .filter(name => name.startsWith('settings.json.tripwire-bak-'));
    assert.equal(backups.length, 0, 'nothing modified, so no backup');
  });
});

test('stale matcher is refreshed on re-run without duplicating the PreToolUse entry', async () => {
  const settings = JSON.stringify({
    hooks: {
      PreToolUse: [{
        matcher: '^(Skill|mcp__.*)$',
        hooks: [{ type: 'command', command: '~/.tripwire/hooks/pre-tool-use.sh', timeout: 10 }],
      }],
    },
  }, null, 2);
  await withFixture({ settings }, async (fx) => {
    await run(fx);
    const merged = JSON.parse(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'));
    assert.equal(merged.hooks.PreToolUse.length, 1, 'no duplicate entry');
    assert.equal(merged.hooks.PreToolUse[0].matcher, HOOK_MATCHER);
    assert.equal(merged.hooks.PreToolUse[0].hooks[0].command, '~/.tripwire/hooks/pre-tool-use.sh');
    const backups = (await readdir(path.join(fx.home, '.claude')))
      .filter(name => name.startsWith('settings.json.tripwire-bak-'));
    assert.equal(backups.length, 1, 'matcher refresh backs up first');
  });
});

test('settings write is atomic: rename-into-place, mode 0600, no temp file left behind', async () => {
  await withFixture({ settings: '{}' }, async (fx) => {
    await run(fx);
    const claudeDir = path.join(fx.home, '.claude');
    const leftovers = (await readdir(claudeDir)).filter(name => name.includes('.tmp-'));
    assert.deepEqual(leftovers, [], 'no temp files left behind');
    const settingsPath = path.join(claudeDir, 'settings.json');
    assert.equal(statSync(settingsPath).mode & 0o777, 0o600, 'renamed temp carries mode 0600');
    assert.ok(JSON.parse(readFileSync(settingsPath, 'utf8')).hooks.PreToolUse, 'valid merged JSON in place');
  });
});

test('missing settings.json is treated as {} and created without a backup', async () => {
  await withFixture({}, async (fx) => {
    await run(fx);
    const merged = JSON.parse(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'));
    assert.equal(merged.hooks.PreToolUse.length, 1);
    const backups = (await readdir(path.join(fx.home, '.claude')))
      .filter(name => name.startsWith('settings.json.tripwire-bak-'));
    assert.equal(backups.length, 0);
  });
});

test('corrupt settings.json refuses to merge instead of clobbering', async () => {
  await withFixture({ settings: '{not json' }, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /not valid JSON/);
    assert.equal(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'), '{not json');
  });
});

// ---------- ordering: hook registration is the LAST mutating step ----------

test('settings merge happens AFTER the bootstrap sweep; config.json still precedes it', async () => {
  await withFixture({}, async (fx) => {
    const settingsPath = path.join(fx.home, '.claude', 'settings.json');
    const configPath = path.join(fx.home, '.tripwire', 'config.json');
    let seenAtSweep = null;
    const scanFn = async () => {
      seenAtSweep = { settings: existsSync(settingsPath), config: existsSync(configPath) };
      return { stdout: MIXED_STDOUT };
    };
    await run(fx, { scanFn });
    assert.deepEqual(seenAtSweep, { settings: false, config: true },
      'at sweep time: hook not yet registered, config.json already written (plan §3 config-before-hooks)');
    assert.ok(existsSync(settingsPath), 'hook registered after the sweep completes');
  });
});

test('demo install failure aborts BEFORE the hook is registered — live Claude config untouched', async () => {
  await withFixture({ settings: '{}' }, async (fx) => {
    await mkdir(path.join(fx.repo, 'scripts'), { recursive: true });
    await writeFile(path.join(fx.repo, 'scripts', 'install-demo-artifacts.sh'), '#!/usr/bin/env bash\n');
    const execFn = makeExecFn({ failOn: 'install-demo-artifacts.sh' });
    await assert.rejects(
      runSetupAgentHooks(baseOpts(fx, { withDemo: true, execFn })),
      /Demo artifact install failed/
    );
    assert.equal(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'), '{}',
      'settings.json must not be modified when an earlier step fails');
  });
});

test('skills-source failure aborts BEFORE the hook is registered', async () => {
  await withFixture({ settings: '{}', skills: [] }, async (fx) => {
    await assert.rejects(runSetupAgentHooks(baseOpts(fx)), /Skills source missing/);
    assert.equal(readFileSync(path.join(fx.home, '.claude', 'settings.json'), 'utf8'), '{}');
  });
});

// ---------- skills ----------

test('copies tw-* skills into ~/.claude/skills with overwrite-sync', async () => {
  await withFixture({}, async (fx) => {
    const staleDir = path.join(fx.home, '.claude', 'skills', 'tw-verify');
    await mkdir(staleDir, { recursive: true });
    await writeFile(path.join(staleDir, 'stale.txt'), 'leftover');
    await run(fx);
    assert.equal(existsSync(path.join(staleDir, 'stale.txt')), false, 'stale files removed (sync, not additive copy)');
    assert.ok(readFileSync(path.join(staleDir, 'SKILL.md'), 'utf8').includes('tw-verify'));
    assert.ok(existsSync(path.join(fx.home, '.claude', 'skills', 'tw-scan', 'SKILL.md')));
  });
});

// ---------- bootstrap sweep ----------

test('sweep passes MCP MANIFEST FILES — never bare server keys (blocker regression)', async () => {
  const mcpJson = JSON.stringify({ mcpServers: { alpha: { command: 'npx' } } });
  await withFixture({ mcpJson, claudeJson: '{}' }, async (fx) => {
    await writeFile(path.join(fx.home, '.claude.json'), JSON.stringify({
      mcpServers: { beta: { command: 'npx', args: ['beta-server'] } },
      projects: {
        [fx.cwd]: { mcpServers: { gamma: {} } },
        '/elsewhere': { mcpServers: { delta: {} } },
      },
    }));
    const scanFn = makeScanFn();
    const { result, stdoutLines } = await run(fx, { scanFn });

    assert.equal(scanFn.calls.length, 1);
    const call = scanFn.calls[0];
    assert.equal(call.cliBin, path.join(fx.repo, 'cli', 'bin', 'tripwire.js'));
    assert.equal(call.repoRoot, fx.repo);

    // Skill dirs are swept as realpaths.
    for (const skill of ['tw-scan', 'tw-verify']) {
      const dir = realpathSync(path.join(fx.home, '.claude', 'skills', skill));
      assert.ok(call.targets.includes(dir), `sweep targets must include ${dir}`);
    }

    // MCP servers are swept as MANIFEST FILE paths so discovery emits
    // manifestEntry targets with pending:<key> hashes.
    assert.ok(call.targets.includes(path.join(fx.cwd, '.mcp.json')), 'project .mcp.json swept as a FILE');
    const generated = path.join(fx.home, '.tripwire', 'claude-json-mcp-manifest.json');
    assert.ok(call.targets.includes(generated), '~/.claude.json keys swept via a generated manifest FILE');
    const manifest = JSON.parse(readFileSync(generated, 'utf8'));
    assert.deepEqual(Object.keys(manifest.mcpServers).sort(), ['beta', 'gamma'],
      'generated manifest holds top-level + projects[<cwd>] keys only (not other projects)');

    // The regression itself: a bare key is classified as an on-disk path by the
    // CLI and fails ENOENT — it must never appear as a target.
    for (const bare of ['alpha', 'beta', 'gamma', 'delta']) {
      assert.ok(!call.targets.includes(bare), `bare MCP key "${bare}" must never be a scan target`);
    }
    for (const target of call.targets) {
      assert.ok(path.isAbsolute(target), `every sweep target must be an absolute path: ${target}`);
    }

    assert.deepEqual(result.scans, {
      submitted: 3,
      failed: [{ target: '/tmp/installed/tw-broken', error: 'sandbox exited 1' }],
    });
    assert.equal(stdoutLines.length, 1, 'exactly one machine-readable stdout line');
    const machine = JSON.parse(stdoutLines[0]);
    assert.equal(machine.status, 'installed');
    assert.equal(machine.hooks_registered, true);
    assert.equal(machine.config_path, path.join(fx.home, '.tripwire', 'config.json'));
    assert.deepEqual(machine.scans, result.scans);
  });
});

test('malformed or key-less MCP configs contribute no sweep targets', async () => {
  await withFixture({ mcpJson: '{not json', claudeJson: JSON.stringify({ mcpServers: {} }) }, async (fx) => {
    const scanFn = makeScanFn();
    await run(fx, { scanFn });
    const targets = scanFn.calls[0].targets;
    assert.equal(targets.length, 2, 'only the two tw-* skill dirs are swept');
    assert.ok(targets.every(t => t.includes('skills')), 'no manifest paths for unusable configs');
    assert.equal(
      existsSync(path.join(fx.home, '.tripwire', 'claude-json-mcp-manifest.json')),
      false,
      'no generated manifest when ~/.claude.json has no server keys'
    );
  });
});

test('--with-demo sweeps demo SKILL dirs + the demo MCP manifest FILE, never *-tool dirs', async () => {
  await withFixture({}, async (fx) => {
    await mkdir(path.join(fx.repo, 'scripts'), { recursive: true });
    await writeFile(path.join(fx.repo, 'scripts', 'install-demo-artifacts.sh'), '#!/usr/bin/env bash\n');
    const safeSkill = path.join(fx.home, '.claude', 'skills', 'safe-skill');
    await mkdir(safeSkill, { recursive: true });
    await writeFile(path.join(safeSkill, 'SKILL.md'), '# demo\n');
    // The installer NEVER puts MCP demos under ~/.claude/skills/ — a stray
    // tool-named dir there must not be treated as a demo artifact.
    const strayVulnTool = path.join(fx.home, '.claude', 'skills', 'vuln-tool');
    await mkdir(strayVulnTool, { recursive: true });
    await writeFile(path.join(strayVulnTool, 'server.py'), 'print("demo")\n');
    // What the installer actually produces for MCP demos: a manifest file.
    const demoManifest = path.join(fx.home, '.tripwire', 'demo-mcp.json');
    await mkdir(path.dirname(demoManifest), { recursive: true });
    await writeFile(demoManifest, JSON.stringify({
      mcpServers: { 'safe-tool': {}, 'vuln-tool': {}, 'amber-tool': {} },
    }));

    const execFn = makeExecFn();
    const scanFn = makeScanFn();
    await run(fx, { withDemo: true, execFn, scanFn });

    const demoCall = execFn.calls.find(c => c.command.includes('install-demo-artifacts.sh'));
    assert.ok(demoCall, 'demo install script must be executed');
    assert.equal(demoCall.opts.maxBuffer, Infinity, 'demo script output must never blow the exec buffer');

    const targets = scanFn.calls[0].targets;
    assert.ok(targets.includes(realpathSync(safeSkill)), 'installed demo skill dir swept');
    assert.ok(targets.includes(demoManifest), 'demo MCP manifest swept as a FILE');
    assert.ok(!targets.includes(realpathSync(strayVulnTool)), '*-tool dirs under skills are never demo targets');
    assert.ok(!targets.some(t => t.endsWith('amber-skill')), 'absent demo skills are not swept');
    for (const bare of ['safe-tool', 'vuln-tool', 'amber-tool']) {
      assert.ok(!targets.includes(bare), `bare demo MCP key "${bare}" must never be a scan target`);
    }
  });
});

test('demo MCP manifest is swept only with --with-demo', async () => {
  await withFixture({}, async (fx) => {
    const demoManifest = path.join(fx.home, '.tripwire', 'demo-mcp.json');
    await mkdir(path.dirname(demoManifest), { recursive: true });
    await writeFile(demoManifest, JSON.stringify({ mcpServers: { 'safe-tool': {} } }));
    const scanFn = makeScanFn();
    await run(fx, { scanFn });
    assert.ok(!scanFn.calls[0].targets.includes(demoManifest), 'demo manifest excluded without --with-demo');
  });
});

test('scan invocation failure marks every target failed instead of aborting install', async () => {
  await withFixture({}, async (fx) => {
    const scanFn = makeScanFn(new Error('spawn ENOENT'));
    const { result } = await run(fx, { scanFn });
    assert.equal(result.scans.submitted, 0);
    assert.equal(result.scans.failed.length, 2, 'both tw-* skill targets reported failed');
    assert.match(result.scans.failed[0].error, /spawn ENOENT/);
    assert.equal(result.hooks_registered, true, 'hooks stay registered; failure is loud, not fatal');
  });
});

test('unparseable scan stdout marks targets failed', async () => {
  await withFixture({}, async (fx) => {
    const { result } = await run(fx, { scanFn: makeScanFn('no json here at all\n') });
    assert.equal(result.scans.submitted, 0);
    assert.equal(result.scans.failed.length, 2);
    assert.match(result.scans.failed[0].error, /no parseable JSON/);
  });
});

// ---------- defaultScanFn ----------

test('defaultScanFn decodes multibyte characters split across chunk boundaries', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'tw-scanfn-'));
  try {
    // Fake CLI that deliberately splits the 3-byte em dash (E2 80 94) across two
    // separate stdout writes with a delay, so the parent receives the fragments
    // as distinct chunks. Without stateful UTF-8 decoding the accumulation
    // produces U+FFFD replacement chars inside the result JSON.
    const fakeCli = path.join(base, 'fake-cli.js');
    await writeFile(fakeCli, [
      "const buf = Buffer.from(JSON.stringify({ batch_id: 'b-1', pad: '\\u2014' }) + '\\n', 'utf8');",
      'const split = buf.indexOf(0x94);', // last byte of the em dash
      'process.stdout.write(buf.subarray(0, split));',
      'setTimeout(() => process.stdout.write(buf.subarray(split)), 80);',
    ].join('\n'));
    const { stdout } = await defaultScanFn({ cliBin: fakeCli, repoRoot: base, targets: ['x'] });
    assert.ok(!stdout.includes('�'), 'no replacement characters from split multibyte sequences');
    assert.deepEqual(extractTrailingJson(stdout), { batch_id: 'b-1', pad: '—' });
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

// ---------- extractTrailingJson ----------

test('extractTrailingJson pulls the result object out of mixed scan stdout', () => {
  const parsed = extractTrailingJson(MIXED_STDOUT);
  assert.equal(parsed.batch_id, 'batch-99');
  assert.deepEqual(parsed.scan_run_ids, ['r-1', 'r-2', 'r-3']);
  assert.deepEqual(parsed.failed_targets, [{ target: '/tmp/installed/tw-broken', error: 'sandbox exited 1' }]);
});

test('extractTrailingJson skips prose braces before the JSON object', () => {
  assert.deepEqual(extractTrailingJson('[skip] weird {not json here}\n{"a": 1}\n'), { a: 1 });
});

test('extractTrailingJson handles braces inside JSON strings', () => {
  assert.deepEqual(
    extractTrailingJson('noise\n{"s": "has } and { inside", "n": {"x": 2}}\ntrailer'),
    { s: 'has } and { inside', n: { x: 2 } }
  );
});

test('extractTrailingJson returns null when no JSON object exists', () => {
  assert.equal(extractTrailingJson('plain text only'), null);
  assert.equal(extractTrailingJson(''), null);
  assert.equal(extractTrailingJson(null), null);
});

// ---------- assertMergeableShape error paths ----------

test('given hooks is a non-object when merging settings then refuses with error', async () => {
  /**
   * Scenario: assertMergeableShape rejects a "hooks" value that is not a plain object.
   * Slice: coverage — setupAgentHooks.js lines 244-246
   *
   * Given an existing settings.json where "hooks" is a string,
   * When runSetupAgentHooks is invoked,
   * Then it throws an error containing "unexpected" and "hooks".
   */
  // -- Given --
  await withFixture(
    { settings: JSON.stringify({ hooks: 'not-an-object' }) },
    async (fx) => {
      // -- When / Then --
      await assert.rejects(
        runSetupAgentHooks(baseOpts(fx)),
        /unexpected.*hooks|hooks.*unexpected/i,
      );
    },
  );
});

test('given hooks.PreToolUse is not an array when merging settings then refuses with error', async () => {
  /**
   * Scenario: assertMergeableShape rejects a PreToolUse value that is not an array.
   * Slice: coverage — setupAgentHooks.js lines 248-250
   *
   * Given an existing settings.json where "hooks.PreToolUse" is a string,
   * When runSetupAgentHooks is invoked,
   * Then it throws an error containing "PreToolUse".
   */
  // -- Given --
  await withFixture(
    { settings: JSON.stringify({ hooks: { PreToolUse: 'not-an-array' } }) },
    async (fx) => {
      // -- When / Then --
      await assert.rejects(
        runSetupAgentHooks(baseOpts(fx)),
        /PreToolUse/,
      );
    },
  );
});

// ---------- installDemoArtifacts script-not-found ----------

test('given install-demo-artifacts.sh missing when withDemo then logs warning and continues', async () => {
  /**
   * Scenario: installDemoArtifacts short-circuits when the script is absent.
   * Slice: coverage — setupAgentHooks.js lines 344-347 (script not found branch)
   *
   * Given withDemo=true and no install-demo-artifacts.sh in repoRoot/scripts/,
   * When runSetupAgentHooks is invoked,
   * Then setup completes successfully (no throw) because the missing script is skipped.
   */
  // -- Given --
  const logs = [];
  await withFixture({}, async (fx) => {
    // -- When --
    const result = await runSetupAgentHooks(baseOpts(fx, {
      withDemo: true,
      log: (msg) => logs.push(msg),
    }));

    // -- Then --
    assert.equal(result.status, 'installed');
    assert.ok(
      logs.some((l) => /WARNING.*not found.*skipping/i.test(l)),
      'should log a warning about the missing script',
    );
  });
});

// ---------- printSummary: scan success (submitted > 0, no failures) ----------

test('given all scans succeed when setup completes then summary logs submitted count', async () => {
  /**
   * Scenario: printSummary else branch fires when scans.failed is empty and submitted > 0.
   * Slice: coverage — setupAgentHooks.js lines 475-477 (else branch in printSummary)
   *
   * Given a scan function that returns scan_run_ids with no failed_targets,
   * When runSetupAgentHooks is invoked,
   * Then the log contains "Bootstrap scans submitted" (the else branch line).
   */
  // -- Given --
  const SUCCESS_STDOUT = '{\n  "batch_id": "batch-ok",\n  "scan_run_ids": ["r-ok"],\n  "failed_targets": []\n}';
  const logs = [];
  await withFixture({}, async (fx) => {
    // -- When --
    const result = await runSetupAgentHooks(baseOpts(fx, {
      scanFn: makeScanFn(SUCCESS_STDOUT),
      log: (msg) => logs.push(msg),
    }));

    // -- Then --
    assert.equal(result.status, 'installed');
    assert.ok(
      logs.some((l) => /Bootstrap scans submitted/i.test(l)),
      'summary should log "Bootstrap scans submitted" when no failures',
    );
  });
});
