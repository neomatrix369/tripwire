/**
 * Install Tripwire Claude Code PreToolUse hooks under ~/.tripwire/hooks,
 * ensure default config when absent, and register the hook in Claude settings.
 *
 * Fixture-friendly: pass homeDir / claudeSettingsPath / hooksSourceDir to avoid
 * mutating the developer machine in tests.
 */

import { copyFile, mkdir, chmod, readFile, writeFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOK_FILES = ['pre-tool-use.sh', '_guard_entry.py'];
const HOOKS_MODE = 0o700;

function repoRootFromCliSrc() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../..');
}

function defaultHooksSourceDir() {
  return path.join(repoRootFromCliSrc(), 'guard/hooks');
}

function tripwireRoot(homeDir) {
  return path.join(homeDir, '.tripwire');
}

function hooksDir(homeDir) {
  return path.join(tripwireRoot(homeDir), 'hooks');
}

function configPath(homeDir) {
  return path.join(tripwireRoot(homeDir), 'config.json');
}

function defaultClaudeSettingsPath(homeDir) {
  return path.join(homeDir, '.claude', 'settings.json');
}

async function pathExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function installHookScripts({ homeDir, hooksSourceDir }) {
  const destDir = hooksDir(homeDir);
  await mkdir(destDir, { recursive: true, mode: HOOKS_MODE });
  await chmod(destDir, HOOKS_MODE);

  for (const name of HOOK_FILES) {
    const src = path.join(hooksSourceDir, name);
    const dest = path.join(destDir, name);
    await copyFile(src, dest);
    await chmod(dest, HOOKS_MODE);
  }

  return {
    hooksDir: destDir,
    preToolUseSh: path.join(destDir, 'pre-tool-use.sh'),
  };
}

function ensureDefaultConfigViaPython(configFile) {
  const script = [
    'from pathlib import Path',
    'from guard.config import ensure_default_config',
    `ensure_default_config(Path(${JSON.stringify(configFile)}))`,
  ].join('; ');

  const root = repoRootFromCliSrc();
  const env = {
    ...process.env,
    PYTHONPATH: [root, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };

  const runners = [
    ['uv', ['run', 'python', '-c', script]],
    ['python3', ['-c', script]],
    ['python', ['-c', script]],
  ];

  let lastError = null;
  for (const [cmd, args] of runners) {
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      env,
      cwd: root,
    });
    if (result.status === 0) {
      return;
    }
    lastError = result.stderr || result.error?.message || `exit ${result.status}`;
  }
  throw new Error(`Failed to write Tripwire config via ensure_default_config: ${lastError}`);
}

function isTripwirePreToolUseCommand(command, preToolUseSh) {
  if (typeof command !== 'string') {
    return false;
  }
  if (command === preToolUseSh || command.includes(preToolUseSh)) {
    return true;
  }
  return command.includes('.tripwire/hooks/pre-tool-use.sh');
}

function commandStringsFromEntry(entry) {
  const inner = entry?.hooks;
  if (!Array.isArray(inner)) {
    return [];
  }
  return inner
    .filter((h) => h?.type === 'command' && typeof h.command === 'string')
    .map((h) => h.command);
}

function collectPreToolUseCommands(settings) {
  const hooks = settings?.hooks?.PreToolUse;
  if (!Array.isArray(hooks)) {
    return [];
  }
  return hooks.flatMap(commandStringsFromEntry);
}

async function registerPreToolUse({ claudeSettingsPath, preToolUseSh }) {
  let settings = {};
  if (await pathExists(claudeSettingsPath)) {
    const raw = await readFile(claudeSettingsPath, 'utf8');
    settings = raw.trim() ? JSON.parse(raw) : {};
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }
  if (!Array.isArray(settings.hooks.PreToolUse)) {
    settings.hooks.PreToolUse = [];
  }

  const existing = collectPreToolUseCommands(settings);
  const alreadyRegistered = existing.some((cmd) => isTripwirePreToolUseCommand(cmd, preToolUseSh));

  if (!alreadyRegistered) {
    settings.hooks.PreToolUse.push({
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: preToolUseSh,
        },
      ],
    });
  }

  // Drop duplicate Tripwire PreToolUse entries if a prior broken install left multiples.
  const seen = new Set();
  settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter((entry) => {
    const tripwireCmds = commandStringsFromEntry(entry).filter((cmd) =>
      isTripwirePreToolUseCommand(cmd, preToolUseSh),
    );
    if (tripwireCmds.length === 0) {
      return true;
    }
    const key = tripwireCmds.join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  await mkdir(path.dirname(claudeSettingsPath), { recursive: true });
  await writeFile(claudeSettingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

/**
 * @param {object} [options]
 * @param {string} [options.homeDir]
 * @param {string} [options.claudeSettingsPath]
 * @param {string} [options.hooksSourceDir]
 * @returns {Promise<object>}
 */
export async function setupAgentHooks(options = {}) {
  const homeDir = options.homeDir || process.env.TRIPWIRE_HOME || homedir();
  const hooksSourceDir = options.hooksSourceDir || defaultHooksSourceDir();
  const claudeSettingsPath =
    options.claudeSettingsPath ||
    process.env.CLAUDE_SETTINGS_PATH ||
    defaultClaudeSettingsPath(homeDir);

  const installed = await installHookScripts({ homeDir, hooksSourceDir });
  ensureDefaultConfigViaPython(configPath(homeDir));
  const settings = await registerPreToolUse({
    claudeSettingsPath,
    preToolUseSh: installed.preToolUseSh,
  });

  return {
    homeDir,
    hooksDir: installed.hooksDir,
    preToolUseSh: installed.preToolUseSh,
    configPath: configPath(homeDir),
    claudeSettingsPath,
    settings,
  };
}
