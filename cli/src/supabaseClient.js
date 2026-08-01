import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. See README.md Setup.');
  }
  // Common mix-up: postgres URI belongs in SUPABASE_DB_URL (psql), not SUPABASE_URL (HTTP API).
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      'SUPABASE_URL must be the project HTTP API URL (https://<ref>.supabase.co), ' +
        'not a postgresql:// connection string. Put the DB URI in SUPABASE_DB_URL for psql.'
    );
  }
  return createClient(url, key);
}
