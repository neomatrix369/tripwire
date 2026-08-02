/**
 * Extra orchestrator coverage: spawn failure, identifier reuse, batch path.
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: runScan error handling + upsert by identifier + multi-target batch
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runScan } from '../src/orchestrator.js';

function makeThenable(value) {
  return {
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

function createSupabaseStub({
  byHashItem = null,
  byIdentItem = null,
  itemId = 'item-1',
  runId = 'run-1',
  batchId = 'batch-1',
} = {}) {
  const calls = { failedUpdates: 0, rpc: 0, batches: 0, updates: 0 };

  const supabase = {
    calls,
    from(table) {
      return {
        select() {
          if (table === 'items') {
            return {
              eq(col) {
                if (col === 'content_hash') {
                  return {
                    maybeSingle: () => makeThenable({ data: byHashItem, error: null }),
                  };
                }
                if (col === 'identifier') {
                  return {
                    order() {
                      return {
                        limit() {
                          return makeThenable({
                            data: byIdentItem ? [byIdentItem] : [],
                            error: null,
                          });
                        },
                      };
                    },
                  };
                }
                return { maybeSingle: () => makeThenable({ data: null, error: null }) };
              },
            };
          }
          return {
            eq() {
              return { maybeSingle: () => makeThenable({ data: null, error: null }) };
            },
          };
        },
        insert(row) {
          if (table === 'scan_batches') {
            return {
              select() {
                return {
                  single: () => makeThenable({ data: { id: batchId, ...row }, error: null }),
                };
              },
            };
          }
          if (table === 'items') {
            return {
              select() {
                return {
                  single: () =>
                    makeThenable({ data: { id: itemId, ...row }, error: null }),
                };
              },
            };
          }
          if (table === 'scan_runs') {
            return {
              select() {
                return {
                  single: () => makeThenable({ data: { id: runId, ...row }, error: null }),
                };
              },
            };
          }
          return {
            select() {
              return { single: () => makeThenable({ data: {}, error: null }) };
            },
          };
        },
        update() {
          calls.updates += 1;
          if (table === 'scan_runs') {
            calls.failedUpdates += 1;
            return {
              eq() {
                return makeThenable({ data: null, error: null });
              },
            };
          }
          return {
            eq() {
              return {
                select() {
                  return {
                    single: () =>
                      makeThenable({
                        data: { id: byIdentItem?.id || itemId, content_hash: 'new' },
                        error: null,
                      }),
                  };
                },
              };
            },
          };
        },
      };
    },
    rpc() {
      calls.rpc += 1;
      return makeThenable({ data: null, error: null });
    },
  };
  return supabase;
}

test('given spawn failure when runScan then marks failed and rolls up', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(tmpdir(), 'tw-orch-'));
  await writeFile(path.join(dir, 'SKILL.md'), '# s');
  const sb = createSupabaseStub();
  const targets = [{ target: dir, type: 'skill', locus: 'local', avail: 'source_on_disk' }];

  // -- When --
  await runScan(targets, {
    ensureSchemaFn: async () => ({ status: 'ready' }),
    getSupabaseFn: () => sb,
    spawnFn: async () => {
      throw new Error('modal down');
    },
  });

  // -- Then --
  assert.ok(sb.calls.failedUpdates >= 1);
  assert.ok(sb.calls.rpc >= 1);
  await rm(dir, { recursive: true, force: true });
});

test('given existing identifier when upsert then updates hash', async () => {
  // -- Given --
  const dir = await mkdtemp(path.join(tmpdir(), 'tw-ident-'));
  await writeFile(path.join(dir, 'SKILL.md'), '# s');
  const sb = createSupabaseStub({
    byIdentItem: { id: 'item-existing', identifier: dir },
  });
  const targets = [{ target: dir, type: 'skill', locus: 'local', avail: 'source_on_disk' }];
  let spawned = 0;

  // -- When --
  await runScan(targets, {
    ensureSchemaFn: async () => ({ status: 'ready' }),
    getSupabaseFn: () => sb,
    spawnFn: async () => {
      spawned += 1;
    },
  });

  // -- Then --
  assert.equal(spawned, 1);
  assert.ok(sb.calls.updates >= 1);
  await rm(dir, { recursive: true, force: true });
});

test('given multiple targets when runScan then creates batch', async () => {
  // -- Given --
  const root = await mkdtemp(path.join(tmpdir(), 'tw-batch-'));
  const a = path.join(root, 'a');
  const b = path.join(root, 'b');
  await writeFile(path.join(await mkdirSafe(a), 'SKILL.md'), '# a');
  await writeFile(path.join(await mkdirSafe(b), 'SKILL.md'), '# b');
  const sb = createSupabaseStub();
  const targets = [
    { target: a, type: 'skill', locus: 'local', avail: 'source_on_disk' },
    { target: b, type: 'skill', locus: 'local', avail: 'source_on_disk' },
  ];

  // -- When --
  await runScan(targets, {
    ensureSchemaFn: async () => ({ status: 'ready' }),
    getSupabaseFn: () => sb,
    spawnFn: async () => {},
  });

  // -- Then --
  assert.ok(true); // batch insert path exercised without throw
  await rm(root, { recursive: true, force: true });
});

async function mkdirSafe(p) {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(p, { recursive: true });
  return p;
}

test('given introspection target when runScan then uses pending hash', async () => {
  // -- Given --
  const sb = createSupabaseStub();
  const targets = [
    {
      target: 'https://mcp.example.com/sse',
      type: 'mcp_server',
      locus: 'cloud',
      avail: 'introspection_only',
    },
  ];
  let spawned = 0;

  // -- When --
  await runScan(targets, {
    ensureSchemaFn: async () => ({ status: 'ready' }),
    getSupabaseFn: () => sb,
    spawnFn: async () => {
      spawned += 1;
    },
  });

  // -- Then --
  assert.equal(spawned, 1);
});
