/**
 * Tests for cli/src/supabaseClient.js
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: getSupabase env validation — missing keys, postgres URI mix-up, happy path
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabase } from '../src/supabaseClient.js';

test('given missing supabase env when getSupabase then throws', () => {
  // -- Given --
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  // -- When / Then --
  try {
    assert.throws(() => getSupabase(), /SUPABASE_URL \/ SUPABASE_SERVICE_ROLE_KEY/);
  } finally {
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
  }
});

test('given postgres uri in SUPABASE_URL when getSupabase then throws', () => {
  // -- Given --
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'postgresql://postgres:x@db.example:5432/postgres';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

  // -- When / Then --
  try {
    assert.throws(() => getSupabase(), /HTTP API URL/);
  } finally {
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    else delete process.env.SUPABASE_URL;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test('given https url and key when getSupabase then returns client', () => {
  // -- Given --
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://abc.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  // -- When --
  try {
    const client = getSupabase();

    // -- Then --
    assert.ok(client);
    assert.equal(typeof client.from, 'function');
  } finally {
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    else delete process.env.SUPABASE_URL;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
