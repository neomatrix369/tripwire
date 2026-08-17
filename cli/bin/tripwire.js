#!/usr/bin/env node
import { Command } from 'commander';
import { discoverTargets, VALID_TYPE_FILTERS } from '../src/discovery.js';
import { ensureSchema } from '../src/ensureSchema.js';
import { loadEnv } from '../src/loadEnv.js';
import { runScan } from '../src/orchestrator.js';
import { runRoute } from '../src/router.js';
import { runSetupAgentHooks } from '../src/setupAgentHooks.js';

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
  .description('Discover and scan AI skills/MCP servers (default command)')
  .argument('[targets...]', 'paths, git URLs, or live MCP endpoints; omit for machine defaults')
  .option('--targets <file>', 'JSON file with a "targets" array')
  .option('--concurrency <n>', 'max concurrent sandboxes', '5')
  .option('--force', 're-scan even if content hash is unchanged')
  .option('--no-defaults', 'error instead of scanning machine defaults on empty args')
  .option('--dry-discover', 'print discovered targets and exit, spawn nothing')
  .option('--type <type>', `restrict discovery to a single artifact category (${VALID_TYPE_FILTERS.join('|')})`)
  .action(async (targets, opts) => {
    try {
      const concurrency = Number(opts.concurrency);
      if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new Error('--concurrency must be a positive integer');
      }
      if (opts.type && !VALID_TYPE_FILTERS.includes(opts.type)) {
        throw new Error(`--type must be one of: ${VALID_TYPE_FILTERS.join(', ')}`);
      }
      const list = await discoverTargets({ targets, targetsFile: opts.targets, useDefaults: opts.defaults !== false, typeFilter: opts.type || null });
      if (opts.dryDiscover) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }
      if (list.length === 0) {
        throw new Error('No targets found. Pass a path/URL, or run inside a folder with agent-installed skills/MCP configs.');
      }
      await runScan(list, { concurrency, force: Boolean(opts.force) });
    } catch (err) {
      console.error(err.message || err);
      process.exitCode = 1;
    }
  });

program
  .command('route')
  .description('Run tiered model router for a completed batch (SIE + optional Model Studio)')
  .requiredOption('--batch-id <id>', 'batch_id to route')
  .option('--sie-model <model>', 'SIE model name (overrides SIE_MODEL env)')
  .option('--model-studio-model <model>', 'Model Studio model name (overrides MODEL_STUDIO_MODEL env)')
  .action(async (opts) => {
    try {
      await runRoute(opts.batchId, {
        sieModel: opts.sieModel,
        modelStudioModel: opts.modelStudioModel,
      });
    } catch (err) {
      console.error(err.message || err);
      process.exitCode = 1;
    }
  });

program
  .command('setup-agent-hooks')
  .description('Install Claude Code PreToolUse hooks, /tw-* skills, and ~/.tripwire config')
  .option('--with-demo', 'also install and scan demo artifacts', false)
  .action(async (opts) => {
    try {
      await runSetupAgentHooks({ withDemo: Boolean(opts.withDemo) });
    } catch (err) {
      console.error(err.message || err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
