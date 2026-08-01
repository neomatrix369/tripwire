#!/usr/bin/env node
import { Command } from 'commander';
import { discoverTargets } from '../src/discovery.js';
import { ensureSchema } from '../src/ensureSchema.js';
import { loadEnv } from '../src/loadEnv.js';
import { runScan } from '../src/orchestrator.js';

loadEnv();

const program = new Command();
program.name('tripwire').description('Scan AI skills and MCP servers for security issues');

program
  .command('setup')
  .description('Apply db/schema.sql to Supabase if tables are missing (uses SUPABASE_DB_URL)')
  .option('--force', 're-apply schema even if probe says ready', false)
  .action(async (opts) => {
    try {
      const result = await ensureSchema({ force: Boolean(opts.force) });
      console.log(JSON.stringify(result));
    } catch (err) {
      console.error(err.message || err);
      process.exitCode = 1;
    }
  });

program
  .command('scan', { isDefault: true })
  .argument('[targets...]', 'paths, git URLs, or live MCP endpoints; omit for machine defaults')
  .option('--targets <file>', 'JSON file with a "targets" array')
  .option('--concurrency <n>', 'max concurrent sandboxes', '5')
  .option('--no-defaults', 'error instead of scanning machine defaults on empty args')
  .option('--dry-discover', 'print discovered targets and exit, spawn nothing')
  .action(async (targets, opts) => {
    const list = await discoverTargets({ targets, targetsFile: opts.targets, useDefaults: opts.defaults !== false });
    if (opts.dryDiscover) {
      console.log(JSON.stringify(list, null, 2));
      return;
    }
    if (list.length === 0) {
      console.error('No targets found. Pass a path/URL, or run inside a folder with agent-installed skills/MCP configs.');
      process.exitCode = 1;
      return;
    }
    await runScan(list, { concurrency: Number(opts.concurrency) });
  });

program.parseAsync(process.argv);
