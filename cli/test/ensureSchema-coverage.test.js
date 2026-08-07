/**
 * Coverage tests for probeSchema / applySchema / ensureSchema.
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: missing/ready probe, applySchema validation, ensureSchema ready/applied paths
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySchema,
  ensureSchema,
  probeSchema,
} from '../src/ensureSchema.js';

function mockSupabase({ itemsError = null, colError = null } = {}) {
  return {
    from(table) {
      return {
        select() {
          return {
            limit: async () => {
              if (table === 'items') return { error: itemsError };
              return { error: colError };
            },
          };
        },
      };
    },
  };
}

test('given items missing when probeSchema then missing', async () => {
  // -- Given --
  const sb = mockSupabase({
    itemsError: { code: 'PGRST205', message: 'Could not find the table' },
  });

  // -- When / Then --
  assert.equal(await probeSchema(sb), 'missing');
});

test('given completed_at missing when probeSchema then missing', async () => {
  // -- Given --
  const sb = mockSupabase({
    colError: { code: 'PGRST204', message: "Could not find the 'completed_at' column" },
  });

  // -- When / Then --
  assert.equal(await probeSchema(sb), 'missing');
});

test('given ready tables when probeSchema then ready', async () => {
  // -- Given / When / Then --
  assert.equal(await probeSchema(mockSupabase()), 'ready');
});

test('given non-schema probe error when probeSchema then throws', async () => {
  // -- Given --
  const sb = mockSupabase({ itemsError: { message: 'JWT expired' } });

  // -- When / Then --
  await assert.rejects(() => probeSchema(sb), /Supabase probe failed/);
});

test('given completed_at probe auth failure when probeSchema then aborts rather than reporting ready', async () => {
  // -- Given --
  const sb = mockSupabase({ colError: { message: 'JWT expired' } });

  // -- When / Then --
  await assert.rejects(() => probeSchema(sb), /Supabase probe failed: JWT expired/);
});

test('given empty db url when applySchema then throws', async () => {
  // -- Given / When / Then --
  await assert.rejects(() => applySchema({ dbUrl: '' }), /Set SUPABASE_DB_URL/);
});

test('given http url when applySchema then throws', async () => {
  // -- Given / When / Then --
  await assert.rejects(
    () => applySchema({ dbUrl: 'https://example.com' }),
    /postgresql:\/\//
  );
});

test('given ready probe when ensureSchema then ready without apply', async () => {
  // -- Given / When / Then --
  assert.deepEqual(await ensureSchema({ supabase: mockSupabase(), force: false }), {
    status: 'ready',
  });
});

test('given missing schema when ensureSchema without db url then throws on apply', async () => {
  // -- Given --
  const sb = mockSupabase({
    itemsError: { code: 'PGRST205', message: 'Could not find the table' },
  });
  const prev = process.env.SUPABASE_DB_URL;
  delete process.env.SUPABASE_DB_URL;

  // -- When / Then --
  try {
    await assert.rejects(() => ensureSchema({ supabase: sb, force: false }), /SUPABASE_DB_URL/);
  } finally {
    if (prev !== undefined) process.env.SUPABASE_DB_URL = prev;
  }
});

test('given fake Client when applySchema then connects and queries', async () => {
  // -- Given --
  const calls = { connect: 0, query: 0, end: 0 };
  class FakeClient {
    constructor(opts) {
      this.opts = opts;
    }
    async connect() {
      calls.connect += 1;
    }
    async query() {
      calls.query += 1;
    }
    async end() {
      calls.end += 1;
    }
  }

  // -- When --
  await applySchema({
    dbUrl: 'postgresql://u:p@127.0.0.1:5432/db',
    ClientImpl: FakeClient,
  });

  // -- Then --
  assert.deepEqual(calls, { connect: 1, query: 1, end: 1 });
});

test('given Client connect ENOTFOUND when applySchema then hint in error', async () => {
  // -- Given --
  class FailingClient {
    async connect() {
      const err = new Error('getaddrinfo ENOTFOUND');
      err.code = 'ENOTFOUND';
      throw err;
    }
    async query() {}
    async end() {}
  }

  // -- When / Then --
  await assert.rejects(
    () =>
      applySchema({
        dbUrl: 'postgresql://u:p@db.example.co:5432/db',
        ClientImpl: FailingClient,
      }),
    /Session pooler/
  );
});

test('given force apply when ensureSchema then applied', async () => {
  // -- Given --
  let applyCalls = 0;
  const sb = mockSupabase();

  // -- When --
  const result = await ensureSchema({
    supabase: sb,
    force: true,
    applySchemaFn: async () => {
      applyCalls += 1;
    },
  });

  // -- Then --
  assert.equal(result.status, 'applied');
  assert.equal(applyCalls, 1);
});

test('given apply ok but still missing when ensureSchema then throws', async () => {
  // -- Given --
  const sb = mockSupabase({
    itemsError: { code: 'PGRST205', message: 'Could not find the table' },
  });

  // -- When / Then --
  await assert.rejects(
    () =>
      ensureSchema({
        supabase: sb,
        force: true,
        applySchemaFn: async () => {},
      }),
    /still not queryable/
  );
});
