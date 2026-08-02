/**
 * Tests for tripwire-realtime.js (Live ACL Realtime subscription).
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: subscribe gating, CDN failure, mocked channel subscribe, unsubscribe/connected
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connected,
  subscribe,
  unsubscribe,
} from '../tripwire-realtime.js';

test('given missing config when subscribe then null', async () => {
  // -- Given / When / Then --
  assert.equal(await subscribe({}, () => {}), null);
  assert.equal(await subscribe({ SUPABASE_URL: 'https://x.supabase.co' }, () => {}), null);
});

test('given CDN load failure when subscribe then null', async () => {
  // -- Given / When --
  const status = await subscribe(
    { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    () => {},
    {
      loadCreateClient: async () => {
        throw new Error('cdn down');
      },
    }
  );

  // -- Then --
  assert.equal(status, null);
});

test('given mocked client when subscribe then SUBSCRIBED and connected', async () => {
  // -- Given --
  const statuses = [];
  let onUpdateCount = 0;
  const channel = {
    on() {
      return channel;
    },
    subscribe(cb) {
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return channel;
    },
  };
  const client = {
    channel() {
      return channel;
    },
    removeChannel() {
      statuses.push('removed');
    },
  };

  // -- When --
  const status = await subscribe(
    { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    () => {
      onUpdateCount += 1;
    },
    {
      loadCreateClient: async () => () => client,
    }
  );

  // -- Then --
  assert.equal(status, 'SUBSCRIBED');
  assert.equal(connected(), true);

  // -- Cleanup --
  unsubscribe();
  assert.equal(connected(), false);
  assert.ok(statuses.includes('removed'));
  assert.equal(onUpdateCount, 0);
});

test('given unsubscribe when not connected then safe noop', () => {
  // -- Given / When / Then --
  unsubscribe();
  assert.equal(connected(), false);
});

test('given channel event when subscribed then debounced onUpdate fires', async () => {
  // -- Given --
  let payloads = 0;
  let debounced;
  const channel = {
    on(_a, _b, cb) {
      debounced = cb;
      return channel;
    },
    subscribe(cb) {
      setTimeout(() => cb('SUBSCRIBED'), 0);
      return channel;
    },
  };
  const client = {
    channel() {
      return channel;
    },
    removeChannel() {},
  };

  // -- When --
  await subscribe(
    { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    () => {
      payloads += 1;
    },
    { loadCreateClient: async () => () => client }
  );
  debounced({ type: 'INSERT' });
  debounced({ type: 'UPDATE' });
  await new Promise((r) => setTimeout(r, 700));

  // -- Then --
  assert.equal(payloads, 1);
  unsubscribe();
});
