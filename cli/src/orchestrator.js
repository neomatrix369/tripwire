import { ensureSchema } from './ensureSchema.js';
import { getSupabase } from './supabaseClient.js';
import { hashLocalPath } from './hash.js';
import { spawnScanSandbox } from './modalClient.js';

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx).catch(err => ({ error: err.message }));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function upsertItem(supabase, target) {
  let contentHash = null;
  if (target.avail === 'source_on_disk') {
    contentHash = await hashLocalPath(target.target);
  } else {
    // cloneable / introspection_only: hashed inside the sandbox after clone/introspection.
    contentHash = 'pending:' + target.target;
  }
  const { data: existing } = await supabase.from('items').select('*').eq('content_hash', contentHash).maybeSingle();
  if (existing) return { item: existing, cached: true };

  const { data: inserted, error } = await supabase.from('items').insert({
    type: target.type, name: target.target.split('/').pop() || target.target,
    identifier: target.target, content_hash: contentHash,
    install_locus: target.locus || 'unknown', source_availability: target.avail || 'unknown'
  }).select().single();
  if (error) throw error;
  return { item: inserted, cached: false };
}

export async function runScan(targets, { concurrency = 5 } = {}) {
  await ensureSchema();
  const supabase = getSupabase();
  let batchId = null;
  if (targets.length > 1) {
    const { data: batch } = await supabase.from('scan_batches').insert({
      source_path: targets.map(t => t.target).join(','), item_count: targets.length, concurrency_limit: concurrency
    }).select().single();
    batchId = batch.id;
  }

  const scanRunIds = await mapWithConcurrency(targets, concurrency, async (target) => {
    const { item, cached } = await upsertItem(supabase, target);
    if (cached) {
      console.log(`[skip] ${target.target} — content unchanged since last scan`);
      return null;
    }
    const { data: run, error: runError } = await supabase.from('scan_runs').insert({
      item_id: item.id, batch_id: batchId, status: 'running'
    }).select().single();
    if (runError) throw runError;

    try {
      await spawnScanSandbox({ target: target.target, itemType: target.type, itemId: item.id, scanRunId: run.id });
    } catch (err) {
      console.error(`[error] sandbox failed for ${target.target}: ${err.message}`);
      await supabase.from('scan_runs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', run.id);
    }
    return run.id;
  });

  console.log(JSON.stringify({ batch_id: batchId, scan_run_ids: scanRunIds.filter(Boolean) }, null, 2));
}
