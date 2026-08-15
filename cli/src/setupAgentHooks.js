import * as defaultFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec as execCb, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseDotenv } from 'dotenv';

const execAsync = promisify(execCb);

// Written to be correct under BOTH regex-search and full-match semantics —
// a bare `^mcp__` would match nothing under full-match (plan §4.2).
// Bash is included so skill-path commands (e.g. …/vuln-skill/install.sh) are
// gated even when /skill-name loads instructions without a Skill tool event.
export const HOOK_MATCHER = '^(Skill|Bash|mcp__.*)$';
const HOOK_TIMEOUT_SECONDS = 10;
const HANDLER_FILES = ['pre-tool-use.sh', '_guard_entry.py'];
// Any registration form of our handler ends with this suffix (absolute or `~/…`).
const HOOK_COMMAND_SUFFIX = '/.tripwire/hooks/pre-tool-use.sh';

// Demo SKILL dirs installed by scripts/install-demo-artifacts.sh into
// ~/.claude/skills/. The demo MCP artifacts (safe-tool/vuln-tool/amber-tool)
// are NEVER installed there — they exist only as keys in the manifest
// ~/.tripwire/demo-mcp.json and are swept as that manifest FILE (plan §5.4).
export const DEMO_SKILL_NAMES = ['safe-skill', 'vuln-skill', 'amber-skill'];
const DEMO_MCP_MANIFEST = 'demo-mcp.json';
// Manifest regenerated each run from ~/.claude.json's mcpServers (see mcpSweepManifests).
const CLAUDE_JSON_SWEEP_MANIFEST = 'claude-json-mcp-manifest.json';

/** Repo root resolved package-relatively (cli/src → ../..), never from cwd. */
export function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

async function defaultExecFn(command, opts = {}) {
  const { stdout, stderr } = await execAsync(command, opts);
  return { stdout, stderr };
}

/**
 * Default scan invoker: `node <cli_bin> scan <targets...> --no-defaults` with
 * cwd=repo_root, stdout captured. Exit code 1 can coexist with valid JSON
 * (`failed_targets` present — plan §0.3), so the exit code is never a rejection.
 * Exported for tests.
 */
export function defaultScanFn({ cliBin, repoRoot, targets }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [cliBin, 'scan', ...targets, '--no-defaults'], {
      cwd: repoRoot,
      // stderr streams straight through to the operator — nothing accumulates.
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    // Stateful decode: a 64KB chunk boundary bisecting a multibyte character must
    // not inject U+FFFD into the result JSON (which would corrupt paths or, in the
    // worst alignment, make the whole result unparseable).
    proc.stdout.setEncoding('utf8');
    let stdout = '';
    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.on('error', reject);
    // 'close' (not 'exit') so the stdout stream is fully drained before resolving.
    proc.on('close', () => resolve({ stdout }));
  });
}

/** Index of the `}` matching the `{` at `start`, honoring JSON strings; -1 if none. */
function matchingBrace(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract the scan-result JSON object from `tripwire scan`'s mixed stdout
 * ([skip] lines before, [route]/[sie] lines after — plan §0.3): from each `{`
 * in order, take the brace-matched slice; first slice that parses wins.
 */
export function extractTrailingJson(text) {
  const s = String(text || '');
  for (let start = s.indexOf('{'); start !== -1; start = s.indexOf('{', start + 1)) {
    const end = matchingBrace(s, start);
    if (end === -1) continue;
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch { /* prose brace, not the result object — keep scanning */ }
  }
  return null;
}

async function resolveBinary(name, execFn, remedy) {
  try {
    const { stdout } = await execFn(`command -v ${name}`);
    const bin = String(stdout).trim().split('\n')[0];
    if (bin) return bin;
  } catch { /* not resolvable — fall through to the remediation error */ }
  throw new Error(`\`${name}\` not found on PATH. ${remedy}`);
}

// Obvious never-a-real-credential values (a copied .env.example, template docs).
const PLACEHOLDER_PATTERNS = [
  /^<.*>$/, // <your-url>
  /^(changeme|change-me|todo|tbd|placeholder|fixme)$/i,
  /^x{4,}$/i,
  /^\.{3,}$/,
  /(^|[^a-z])your[-_][a-z]/i, // your-service-role-key, https://your-project.supabase.co
];

function isPlaceholderEnvValue(value) {
  return PLACEHOLDER_PATTERNS.some(re => re.test(value));
}

/** Preflight hard-fails (plan §4.4.1). Returns the absolute uv path for config.json. */
async function preflight({ nodeVersion, envFile, fs, execFn }) {
  const major = Number(String(nodeVersion).split('.')[0]);
  if (!Number.isInteger(major) || major < 18) {
    throw new Error(
      `Node >= 18 required (found ${nodeVersion}). Install a newer Node (e.g. via nvm), then re-run \`tripwire setup-agent-hooks\`.`
    );
  }
  if (!fs.existsSync(envFile)) {
    throw new Error(
      `Missing ${envFile}. Copy .env.example to .env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then re-run \`tripwire setup-agent-hooks\`.`
    );
  }
  // Parse VALUES, not just key presence: an empty or placeholder credential arms
  // the hooks into a machine-wide runtime deny-DoS (plan §12) — hard-fail here.
  const envValues = parseDotenv(fs.readFileSync(envFile, 'utf8'));
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    const value = (envValues[key] ?? '').trim();
    if (!value) {
      throw new Error(`${envFile} has no value for ${key}. Fill it in (see .env.example), then re-run \`tripwire setup-agent-hooks\`.`);
    }
    if (isPlaceholderEnvValue(value)) {
      throw new Error(`${envFile} still has a placeholder value for ${key} ("${value}"). Fill in the real value, then re-run \`tripwire setup-agent-hooks\`.`);
    }
  }
  const uvBin = await resolveBinary(
    'uv', execFn,
    'Install uv (https://docs.astral.sh/uv/) — every intercepted hook call runs through it.'
  );
  await resolveBinary(
    'modal', execFn,
    'Install the Modal CLI and run `modal setup` — the bootstrap scan sweep needs it.'
  );
  return { uvBin };
}

/** Write config.json only if absent; NEVER touch an existing file (its `enable` is sacred). */
function ensureConfig({ fs, configPath, repoRoot, cliBin, envFile, uvBin, log }) {
  if (fs.existsSync(configPath)) {
    log(`[setup-agent-hooks] ${configPath} already exists — leaving it untouched (enable stays as-is).`);
    return { created: false };
  }
  const config = {
    schema_version: 1,
    enable: true,
    scan_validity_days: 14,
    repo_root: repoRoot,
    cli_bin: cliBin,
    env_file: envFile,
    uv_bin: uvBin,
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  log(`[setup-agent-hooks] Wrote ${configPath} (enable=true, scan_validity_days=14).`);
  return { created: true };
}

/** 'enabled' | 'disabled' | 'corrupt' — for truthful summary phrasing only. */
function readConfigState(fs, configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.enable === false ? 'disabled' : 'enabled';
  } catch {
    return 'corrupt';
  }
}

function installHandlers({ fs, hooksSourceDir, hooksDestDir }) {
  for (const name of HANDLER_FILES) {
    const src = path.join(hooksSourceDir, name);
    if (!fs.existsSync(src)) {
      throw new Error(`Handler source missing: ${src}. Ensure your checkout includes agent-hooks/hooks/, then re-run \`tripwire setup-agent-hooks\`.`);
    }
    const dest = path.join(hooksDestDir, name);
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o700);
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Atomic same-dir write: temp file (0600) + rename, so a crash/power-loss
 * mid-write can never leave the target truncated.
 */
function writeFileAtomic({ fs, filePath, data, mode }) {
  const tmpPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.tmp-${process.pid}`);
  fs.writeFileSync(tmpPath, data, { mode });
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.rmSync(tmpPath, { force: true }); } catch { /* best effort */ }
    throw err;
  }
}

/** Read + parse settings.json for merging; missing file -> {}. Corrupt JSON refuses. */
function readSettingsForMerge({ fs, settingsPath }) {
  if (!fs.existsSync(settingsPath)) return { settings: {}, existed: false };
  const raw = fs.readFileSync(settingsPath, 'utf8');
  if (!raw.trim()) return { settings: {}, existed: true };
  try {
    return { settings: JSON.parse(raw), existed: true };
  } catch (err) {
    throw new Error(
      `${settingsPath} is not valid JSON (${err.message}) — refusing to modify it. Fix the file by hand, then re-run \`tripwire setup-agent-hooks\`.`,
      { cause: err }
    );
  }
}

/** Validate the shapes the merge touches; anything unexpected refuses rather than clobbers. */
function assertMergeableShape(settings, settingsPath) {
  if (!isPlainObject(settings)) {
    throw new Error(`${settingsPath} must contain a JSON object — refusing to modify it.`);
  }
  if (settings.hooks !== undefined && !isPlainObject(settings.hooks)) {
    throw new Error(`${settingsPath} has an unexpected "hooks" shape — refusing to modify it.`);
  }
  const hooks = settings.hooks || {};
  if (hooks.PreToolUse !== undefined && !Array.isArray(hooks.PreToolUse)) {
    throw new Error(`${settingsPath} has an unexpected "hooks.PreToolUse" shape — refusing to modify it.`);
  }
  return hooks;
}

/**
 * True when `command` already registers our handler, whatever form it was
 * written in: absolute path, or a hand-installed `~/…` form (leading `~`
 * expanded, then matched by the /.tripwire/hooks/pre-tool-use.sh suffix).
 */
function isTripwireHookCommand(command, homedir) {
  if (typeof command !== 'string') return false;
  const expanded = command.startsWith('~/') ? path.join(homedir, command.slice(2)) : command;
  return expanded.endsWith(HOOK_COMMAND_SUFFIX);
}

/**
 * JSON-merge the PreToolUse hook into ~/.claude/settings.json: timestamped backup
 * before any modification, idempotent by handler-command suffix, all other keys
 * preserved, atomic replace on write. Re-runs refresh the matcher when our
 * handler is already present but the matcher is stale (e.g. Skill|mcp →
 * Skill|Bash|mcp) without duplicating the entry.
 */
function mergeSettings({ fs, settingsPath, hookCommand, homedir, now, log }) {
  const { settings, existed } = readSettingsForMerge({ fs, settingsPath });
  const hooks = assertMergeableShape(settings, settingsPath);
  const preToolUse = hooks.PreToolUse || [];

  const oursIdx = preToolUse.findIndex(entry =>
    entry && Array.isArray(entry.hooks) && entry.hooks.some(h => h && isTripwireHookCommand(h.command, homedir)));

  if (oursIdx >= 0) {
    if (preToolUse[oursIdx].matcher === HOOK_MATCHER) {
      log(`[setup-agent-hooks] Hook already registered in ${settingsPath} — no duplicate written.`);
      return { changed: false, backupPath: null };
    }
    let backupPath = null;
    if (existed) {
      backupPath = `${settingsPath}.tripwire-bak-${now().toISOString()}`;
      fs.copyFileSync(settingsPath, backupPath);
      log(`[setup-agent-hooks] Backed up ${settingsPath} -> ${backupPath}`);
    }
    preToolUse[oursIdx] = { ...preToolUse[oursIdx], matcher: HOOK_MATCHER };
    hooks.PreToolUse = preToolUse;
    settings.hooks = hooks;
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    writeFileAtomic({ fs, filePath: settingsPath, data: JSON.stringify(settings, null, 2) + '\n', mode: 0o600 });
    log(`[setup-agent-hooks] Refreshed Tripwire PreToolUse matcher in ${settingsPath}.`);
    return { changed: true, backupPath };
  }

  let backupPath = null;
  if (existed) {
    backupPath = `${settingsPath}.tripwire-bak-${now().toISOString()}`;
    fs.copyFileSync(settingsPath, backupPath);
    log(`[setup-agent-hooks] Backed up ${settingsPath} -> ${backupPath}`);
  }

  preToolUse.push({
    matcher: HOOK_MATCHER,
    hooks: [{ type: 'command', command: hookCommand, timeout: HOOK_TIMEOUT_SECONDS }],
  });
  hooks.PreToolUse = preToolUse;
  settings.hooks = hooks;

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  // Highest-stakes file in the whole flow: atomic replace (temp 0600 + rename)
  // so a crash mid-write can never truncate the user's live Claude config.
  writeFileAtomic({ fs, filePath: settingsPath, data: JSON.stringify(settings, null, 2) + '\n', mode: 0o600 });
  return { changed: true, backupPath };
}

/** Overwrite-sync each agent-hooks/skills/tw-* dir into ~/.claude/skills/. */
function installSkills({ fs, skillsSourceDir, skillsDestRoot, log }) {
  if (!fs.existsSync(skillsSourceDir)) {
    throw new Error(`Skills source missing: ${skillsSourceDir}. Ensure your checkout includes agent-hooks/skills/, then re-run \`tripwire setup-agent-hooks\`.`);
  }
  const dirs = fs.readdirSync(skillsSourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('tw-'))
    .map(entry => entry.name)
    .sort();
  fs.mkdirSync(skillsDestRoot, { recursive: true });
  const installed = [];
  for (const name of dirs) {
    const dest = path.join(skillsDestRoot, name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(skillsSourceDir, name), dest, { recursive: true });
    installed.push(dest);
  }
  log(`[setup-agent-hooks] Installed ${installed.length} /tw-* skill(s) into ${skillsDestRoot}.`);
  return installed;
}

async function installDemoArtifacts({ fs, execFn, repoRoot, log }) {
  const script = path.join(repoRoot, 'scripts', 'install-demo-artifacts.sh');
  if (!fs.existsSync(script)) {
    log(`[setup-agent-hooks] WARNING: ${script} not found — skipping demo install; any already-installed demo artifacts will still be scanned.`);
    return;
  }
  log('[setup-agent-hooks] Installing demo artifacts…');
  try {
    // The script can stream a full Modal scan's output — far beyond exec's
    // default 1MB maxBuffer. Never let output volume abort the install.
    await execFn(`bash "${script}"`, { cwd: repoRoot, maxBuffer: Infinity });
  } catch (err) {
    throw new Error(`Demo artifact install failed (${script}): ${err.message}. Fix it or re-run without --with-demo.`, { cause: err });
  }
}

/**
 * Demo SKILL dirs actually installed under ~/.claude/skills/ — only the three
 * demo skills ever live there. The demo MCP artifacts are manifest-only
 * (~/.tripwire/demo-mcp.json) and are swept as a manifest FILE instead.
 */
function demoSkillPaths({ fs, skillsDestRoot }) {
  return DEMO_SKILL_NAMES
    .map(name => path.join(skillsDestRoot, name))
    .filter(p => fs.existsSync(p));
}

/** Parse `file` and return its non-empty mcpServers object, else null (skip silently — plan §4.4.6). */
function readMcpServers(fs, file) {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isPlainObject(json) && isPlainObject(json.mcpServers) && Object.keys(json.mcpServers).length > 0) {
      return json.mcpServers;
    }
  } catch { /* absent or unreadable — skip silently */ }
  return null;
}

/** mcpServers from ~/.claude.json: top-level merged with projects[<cwd>]; null when none. */
function readClaudeJsonServers({ fs, homedir, cwd }) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(path.join(homedir, '.claude.json'), 'utf8'));
  } catch { return null; }
  if (!isPlainObject(json)) return null;
  const servers = {};
  const collect = (obj) => {
    if (isPlainObject(obj) && isPlainObject(obj.mcpServers)) Object.assign(servers, obj.mcpServers);
  };
  collect(json);
  if (isPlainObject(json.projects)) collect(json.projects[cwd]);
  return Object.keys(servers).length > 0 ? servers : null;
}

/**
 * MCP sweep targets are always MANIFEST FILE paths — NEVER bare server keys and
 * NEVER server/fixture dir paths. Discovery's tryExpandManifest turns each file
 * into manifestEntry targets whose item identifier is the config KEY with
 * content_hash `pending:<key>`, matching the hook's key-based MCP resolution
 * (a bare key would instead be classified as an on-disk path and fail ENOENT,
 * permanently denying the server). Accepted consequence of the manifest-only
 * rule (plan §5.4): same-named keys in different projects share one identity
 * row, and MCP verdicts carry no content binding (pending hash).
 *
 * Files swept: <cwd>/.mcp.json (when it has servers); a manifest generated
 * under ~/.tripwire/ from ~/.claude.json's mcpServers (top-level +
 * projects[<cwd>]); and ~/.tripwire/demo-mcp.json when --with-demo.
 */
function mcpSweepManifests({ fs, cwd, homedir, tripwireDir, withDemo, log }) {
  const manifests = [];

  const projectManifest = path.join(cwd, '.mcp.json');
  if (readMcpServers(fs, projectManifest)) manifests.push(projectManifest);

  const generatedPath = path.join(tripwireDir, CLAUDE_JSON_SWEEP_MANIFEST);
  const claudeJsonServers = readClaudeJsonServers({ fs, homedir, cwd });
  if (claudeJsonServers) {
    // Regenerated every run; ~/.claude.json itself is never passed (it is not
    // a scannable manifest shape and holds unrelated state).
    fs.writeFileSync(generatedPath, JSON.stringify({ mcpServers: claudeJsonServers }, null, 2) + '\n');
    log(`[setup-agent-hooks] Wrote ${generatedPath} (${Object.keys(claudeJsonServers).length} MCP server key(s) from ~/.claude.json).`);
    manifests.push(generatedPath);
  } else {
    fs.rmSync(generatedPath, { force: true }); // stale manifest from a prior run
  }

  if (withDemo) {
    const demoManifest = path.join(tripwireDir, DEMO_MCP_MANIFEST);
    if (fs.existsSync(demoManifest)) manifests.push(demoManifest);
  }
  return manifests;
}

/** Bootstrap scan sweep (plan §4.3 bootstrap ordering). Never throws — failures are reported. */
async function runBootstrapSweep({ scanFn, cliBin, repoRoot, targets, log }) {
  if (targets.length === 0) return { submitted: 0, failed: [] };
  log(`[setup-agent-hooks] Bootstrap scan sweep: ${targets.length} target(s)…`);
  let stdout;
  try {
    ({ stdout } = await scanFn({ cliBin, repoRoot, targets }));
  } catch (err) {
    return { submitted: 0, failed: targets.map(target => ({ target, error: `scan invocation failed: ${err.message}` })) };
  }
  const result = extractTrailingJson(stdout);
  if (!result) {
    return { submitted: 0, failed: targets.map(target => ({ target, error: 'scan produced no parseable JSON result' })) };
  }
  return {
    submitted: Array.isArray(result.scan_run_ids) ? result.scan_run_ids.length : 0,
    failed: Array.isArray(result.failed_targets) ? result.failed_targets : [],
  };
}

function printSummary({ log, configState, configPath, hookCommand, settingsPath, backupPath, installedSkills, scans, cliBin }) {
  const enforcement = configState === 'enabled'
    ? 'ON'
    : configState === 'disabled'
      ? 'OFF (existing config has "enable": false — run /tw-enable to arm)'
      : `UNKNOWN — ${configPath} is unparseable; the hook treats that as tampering and DENIES. Delete it and re-run setup, or restore valid JSON.`;
  log('');
  log('[setup-agent-hooks] Tripwire Claude Code hooks installed.');
  log(`  Enforcement: ${enforcement}`);
  log(`  Config:      ${configPath}`);
  log(`  Handler:     ${hookCommand} (registered in ${settingsPath}${backupPath ? `; backup: ${backupPath}` : ''})`);
  log(`  Skills:      ${installedSkills.map(p => path.basename(p)).join(', ') || '(none found)'} -> ~/.claude/skills/`);
  if (scans.failed.length > 0) {
    log('');
    log(`  WARNING: ${scans.failed.length} bootstrap scan(s) PENDING/FAILED — enforcement will BLOCK these until they scan green:`);
    for (const { target, error } of scans.failed) {
      log(`    - ${target}: ${error}`);
    }
    log(`  Out-of-band remedies: \`node ${cliBin} scan <path> --no-defaults\` in a terminal,`);
    log(`  or hand-edit ${configPath} to "enable": false.`);
  } else {
    log(`  Bootstrap scans submitted: ${scans.submitted} (verdicts land asynchronously — check /tw-verify).`);
  }
  log('');
  log('  Verify:    /tw-verify <name>');
  log(`  Disable:   /tw-disable, or hand-edit ${configPath} to "enable": false`);
  log(`  Uninstall: remove the hooks.PreToolUse block from ${settingsPath}`);
  log('  Restart your Claude Code session so the hooks load.');
}

/** Injectable seams with production defaults (spread keeps complexity flat). */
function resolveOptions(opts) {
  return {
    withDemo: false,
    fs: defaultFs,
    homedir: os.homedir(),
    cwd: process.cwd(),
    execFn: defaultExecFn,
    scanFn: defaultScanFn,
    now: () => new Date(),
    nodeVersion: process.versions.node,
    repoRoot: defaultRepoRoot(),
    log: (msg) => console.error(msg),
    ...opts,
  };
}

/** Sweep targets: installed tw-* skills (realpaths) + demo skill dirs + MCP manifest FILES. */
async function gatherSweepTargets({ fs, withDemo, execFn, repoRoot, installedSkills, skillsDestRoot, cwd, homedir, tripwireDir, log }) {
  if (withDemo) {
    await installDemoArtifacts({ fs, execFn, repoRoot, log });
  }
  const targets = installedSkills.map(p => fs.realpathSync(p));
  if (withDemo) {
    targets.push(...demoSkillPaths({ fs, skillsDestRoot }).map(p => fs.realpathSync(p)));
  }
  targets.push(...mcpSweepManifests({ fs, cwd, homedir, tripwireDir, withDemo, log }));
  return [...new Set(targets)];
}

/**
 * `tripwire setup-agent-hooks` (plan §4.4, A4/T4). Idempotent. Seams
 * ({fs, homedir, cwd, execFn, scanFn, now, nodeVersion, repoRoot, log}) are
 * injectable for tests; defaults preserve the production path.
 *
 * Prints a human summary to stderr and ONE machine-readable JSON line to stdout:
 * {status:'installed', config_path, hooks_registered:true, scans:{submitted, failed}}.
 */
export async function runSetupAgentHooks(opts = {}) {
  const { withDemo, fs, homedir, cwd, execFn, scanFn, now, nodeVersion, repoRoot, log } = resolveOptions(opts);

  const root = path.resolve(repoRoot);
  const cliBin = path.join(root, 'cli', 'bin', 'tripwire.js');
  const envFile = path.join(root, '.env');
  const hooksSourceDir = path.join(root, 'agent-hooks', 'hooks');
  const skillsSourceDir = path.join(root, 'agent-hooks', 'skills');
  const tripwireDir = path.join(homedir, '.tripwire');
  const hooksDestDir = path.join(tripwireDir, 'hooks');
  const configPath = path.join(tripwireDir, 'config.json');
  const settingsPath = path.join(homedir, '.claude', 'settings.json');
  const skillsDestRoot = path.join(homedir, '.claude', 'skills');
  const hookCommand = path.join(hooksDestDir, 'pre-tool-use.sh');

  // 1. Preflight (hard-fails with remediation).
  log('[setup-agent-hooks] Preflight checks…');
  const { uvBin } = await preflight({ nodeVersion, envFile, fs, execFn });

  // 2. ~/.tripwire + config.json — written BEFORE hooks register (plan §3 tamper
  //    rule: config-before-hooks; hook registration itself is deferred to step 6).
  fs.mkdirSync(hooksDestDir, { recursive: true });
  ensureConfig({ fs, configPath, repoRoot: root, cliBin, envFile, uvBin, log });

  // 3. Handler scripts + guard-environment pre-warm (keeps first hook call in budget).
  installHandlers({ fs, hooksSourceDir, hooksDestDir });
  log('[setup-agent-hooks] Pre-warming guard environment (uv sync --extra guard)…');
  try {
    await execFn(`"${uvBin}" sync --extra guard`, { cwd: root });
  } catch (err) {
    throw new Error(
      `Guard environment pre-warm failed (\`uv sync --extra guard\` in ${root}): ${err.message}. ` +
      'Fix the uv environment and re-run — without the pre-warm the first hook invocation blows its 8s budget.',
      { cause: err }
    );
  }

  // 4. Install the /tw-* skills.
  const installedSkills = installSkills({ fs, skillsSourceDir, skillsDestRoot, log });

  // 5. Demo install (--with-demo) + bootstrap scan sweep: tw skills + demo skill
  //    dirs + MCP manifest files (sweep failures are reported, never thrown).
  const targets = await gatherSweepTargets({
    fs, withDemo, execFn, repoRoot: root, installedSkills, skillsDestRoot, cwd, homedir, tripwireDir, log,
  });
  const scans = await runBootstrapSweep({ scanFn, cliBin, repoRoot: root, targets, log });

  // 6. Register the PreToolUse hook — deliberately the LAST mutating step, so any
  //    failure in skills copy, demo install, or the sweep leaves the user's live
  //    Claude config untouched (config.json from step 2 still precedes it, §3).
  const merge = mergeSettings({ fs, settingsPath, hookCommand, homedir, now, log });

  // 7. Summary (stderr) + single machine-readable line (stdout).
  const configState = readConfigState(fs, configPath);
  printSummary({
    log, configState, configPath, hookCommand, settingsPath,
    backupPath: merge.backupPath, installedSkills, scans, cliBin,
  });
  const result = { status: 'installed', config_path: configPath, hooks_registered: true, scans };
  console.log(JSON.stringify(result));
  return result;
}
