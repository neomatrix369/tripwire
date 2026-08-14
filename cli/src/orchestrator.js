import { ensureSchema } from './ensureSchema.js';
import { getSupabase } from './supabaseClient.js';
import { hashLocalPath } from './hash.js';
import { spawnScanSandbox } from './modalClient.js';
import { runRoute } from './router.js';

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

function normalizeIdentifier(targetPath) {
  return String(targetPath || '').replace(/^\.\//, '').replace(/\/+$/, '');
}

async function upsertItem(supabase, target) {
  const identifier = normalizeIdentifier(target.target);
  const contentHash = target.avail === 'source_on_disk'
    ? await hashLocalPath(target.target)
    : 'pending:' + identifier;
  const { data: byHash } = await supabase.from('items').select('*').eq('content_hash', contentHash).maybeSingle();
  if (byHash) return { item: byHash, cached: true };

  // Reuse the latest row for this path so the live heatmap does not accumulate
  // duplicate identifier rows when content_hash changes between scans.
  const { data: byIdent } = await supabase
    .from('items')
    .select('*')
    .eq('identifier', identifier)
    .order('updated_at', { ascending: false })
    .limit(1);
  const existing = Array.isArray(byIdent) ? byIdent[0] : null;
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('items')
      .update({ content_hash: contentHash, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return { item: updated, cached: false };
  }

  const { data: inserted, error } = await supabase.from('items').insert({
    type: target.type, name: identifier.split('/').pop() || identifier,
    identifier, content_hash: contentHash,
    install_locus: target.locus || 'unknown', source_availability: target.avail || 'unknown'
  }).select().single();
  if (error) throw error;
  return { item: inserted, cached: false };
}

async function dispatchTarget(supabase, target, { batchId, force, spawnFn }) {
  try {
    const { item, cached } = await upsertItem(supabase, target);
    if (cached && !force) {
      console.log(`[skip] ${target.target} — content unchanged since last scan`);
      return { target: target.target, scanRunId: null };
    }
    const { data: run, error: runError } = await supabase.from('scan_runs').insert({
      item_id: item.id, batch_id: batchId, status: 'running'
    }).select().single();
    if (runError) throw runError;

    try {
      await spawnFn({ target: target.target, itemType: target.type, itemId: item.id, scanRunId: run.id });
      return { target: target.target, scanRunId: run.id };
    } catch (err) {
      console.error(`[error] sandbox failed for ${target.target}: ${err.message}`);
      await supabase.from('scan_runs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', run.id);
      await supabase.rpc('tripwire_rollup_item', { p_item_id: item.id });
      return { target: target.target, scanRunId: run.id, error: err.message };
    }
  } catch (err) {
    const message = err.message || String(err);
    console.error(`[error] scan dispatch failed for ${target.target}: ${message}`);
    return { target: target.target, scanRunId: null, error: message };
  }
}

function assertPositiveConcurrency(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }
}

async function createScanBatch(supabase, targets, concurrency) {
  const { data: batch, error } = await supabase.from('scan_batches').insert({
    source_path: targets.map(t => t.target).join(','), item_count: targets.length, concurrency_limit: concurrency
  }).select().single();
  if (error) throw new Error(`Failed to create scan batch: ${error.message || error.code || 'unknown error'}`);
  return batch.id;
}

export async function runScan(targets, {
  concurrency = 5,
  force = false,
  // Injectable seams for characterization tests (defaults preserve production path).
  ensureSchemaFn = ensureSchema,
  getSupabaseFn = getSupabase,
  spawnFn = spawnScanSandbox,
  routeFn = runRoute,
} = {}) {
  assertPositiveConcurrency(concurrency);
  await ensureSchemaFn();
  const supabase = getSupabaseFn();
  const batchId = await createScanBatch(supabase, targets, concurrency);

  const outcomes = await mapWithConcurrency(
    targets,
    concurrency,
    target => dispatchTarget(supabase, target, { batchId, force, spawnFn }),
  );

  const failures = outcomes.filter(outcome => outcome.error);
  const result = {
    batch_id: batchId,
    scan_run_ids: outcomes.map(outcome => outcome.scanRunId).filter(Boolean),
    failed_targets: failures.map(({ target, error }) => ({ target, error })),
  };
  console.log(JSON.stringify(result, null, 2));

  try {
    await routeFn(batchId);
  } catch (err) {
    console.warn(`[warn] auto-route failed for batch ${batchId}: ${err.message}`);
  }

  if (failures.length) {
    throw new Error(`${failures.length} target scan dispatch failure(s); inspect failed_targets output`);
  }
  return result;
}
