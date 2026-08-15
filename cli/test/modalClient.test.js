/**
 * T3 — spawnScanSandbox must pass an ABSOLUTE, package-relative scan_app.py path
 * to `modal run`, so `tripwire scan` works from any cwd (hooks/skills never run
 * at the repo root). Mocked spawnImpl, no live Modal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnScanSandbox } from '../src/modalClient.js';

const EXPECTED_SCAN_APP = fileURLToPath(new URL('../../sandbox/scan_app.py', import.meta.url));

function fakeExitingProc(code = 0) {
  const proc = new EventEmitter();
  queueMicrotask(() => proc.emit('exit', code)); // async so listeners attach first
  return proc;
}

test('spawnScanSandbox passes an absolute scan_app.py path (cwd-independent)', async () => {
  const spawned = [];
  await spawnScanSandbox({
    target: '/abs/target/dir',
    itemType: 'skill',
    itemId: 'item-1',
    scanRunId: 'run-1',
    spawnImpl: (cmd, args, opts) => {
      spawned.push({ cmd, args, opts });
      return fakeExitingProc(0);
    },
  });

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].cmd, 'modal');
  assert.equal(spawned[0].args[0], 'run');
  assert.ok(path.isAbsolute(spawned[0].args[1]), 'scan_app.py path must be absolute');
  assert.equal(spawned[0].args[1], EXPECTED_SCAN_APP);
  assert.deepEqual(spawned[0].args.slice(2), [
    '--target', '/abs/target/dir',
    '--item-type', 'skill',
    '--item-id', 'item-1',
    '--scan-run-id', 'run-1',
  ]);
  assert.equal(spawned[0].opts.stdio, 'inherit');
});

test('spawnScanSandbox rejects on non-zero sandbox exit', async () => {
  await assert.rejects(
    spawnScanSandbox({
      target: '/abs/target/dir',
      itemType: 'mcp_server',
      itemId: 'item-2',
      scanRunId: 'run-2',
      spawnImpl: () => fakeExitingProc(3),
    }),
    /sandbox exited 3/
  );
});
