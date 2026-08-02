/**
 * Supabase Realtime subscription for the Tripwire dashboard.
 *
 * Subscribes to Postgres Changes on scan_runs, scan_run_scanners, and findings
 * so the dashboard updates within ~1s of Modal writing a scanner result,
 * instead of waiting for the 8s poll cycle.
 *
 * Prerequisites:
 *   1. Tables added to supabase_realtime publication (see db/schema.sql).
 *   2. RLS SELECT policies for anon on the subscribed tables (already present).
 *
 * Uses @supabase/supabase-js v2 loaded from ESM CDN at runtime — no npm
 * install required for this HTML prototype.
 */

const CDN_URL = "https://esm.sh/@supabase/supabase-js@2";
const DEBOUNCE_MS = 600;

let _client = null;
let _channel = null;
let _debounceTimer = null;

async function getCreateClient() {
  const mod = await import(CDN_URL);
  return mod.createClient;
}

/**
 * Connect to Supabase Realtime and subscribe to scan-table changes.
 *
 * @param {{ SUPABASE_URL: string, SUPABASE_ANON_KEY: string }} config
 * @param {(payload: object) => void} onUpdate  Debounced callback fired when
 *   any scan_runs / scan_run_scanners / findings row changes.
 * @returns {Promise<'SUBSCRIBED'|'CHANNEL_ERROR'|'TIMED_OUT'|null>}
 *   Channel status string, or null if setup failed entirely.
 */
export async function subscribe(config, onUpdate, { loadCreateClient = getCreateClient } = {}) {
  if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) return null;

  let createClient;
  try {
    createClient = await loadCreateClient();
  } catch (err) {
    console.warn("[tripwire-realtime] CDN load failed:", err.message);
    return null;
  }

  _client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  const debouncedCallback = (payload) => {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => onUpdate(payload), DEBOUNCE_MS);
  };

  return new Promise((resolve) => {
    _channel = _client
      .channel("tripwire-scans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scan_runs" },
        debouncedCallback,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scan_run_scanners" },
        debouncedCallback,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "findings" },
        debouncedCallback,
      )
      .subscribe((status) => {
        console.info("[tripwire-realtime]", status);
        resolve(status);
      });
  });
}

/** Tear down the channel and client. Safe to call when not connected. */
export function unsubscribe() {
  clearTimeout(_debounceTimer);
  if (_channel && _client) {
    _client.removeChannel(_channel);
    console.info("[tripwire-realtime] unsubscribed");
  }
  _channel = null;
  _client = null;
}

/** @returns {boolean} true when a Realtime channel is active. */
export function connected() {
  return _channel != null;
}
