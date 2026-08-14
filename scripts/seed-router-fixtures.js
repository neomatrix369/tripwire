#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../cli/src/loadEnv.js';
import { getSupabase } from '../cli/src/supabaseClient.js';

loadEnv();

const supabase = getSupabase();

async function cleanupItem(contentHash) {
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();
  if (!existing) return null;

  const { data: runs } = await supabase
    .from('scan_runs')
    .select('id')
    .eq('item_id', existing.id);
  const runIds = (runs || []).map(r => r.id);

  if (runIds.length > 0) {
    await supabase.from('findings').delete().in('scan_run_id', runIds);
    await supabase.from('scan_run_scanners').delete().in('scan_run_id', runIds);
    const batchIds = [...new Set((runs || []).map(r => r.batch_id).filter(Boolean))];
    await supabase.from('scan_runs').delete().in('id', runIds);
    if (batchIds.length > 0) {
      await supabase.from('scan_batches').delete().in('id', batchIds);
    }
  }
  return existing.id;
}

async function seedConflict() {
  await cleanupItem('fixture-conflict-001');

  const { data: item, error: itemErr } = await supabase
    .from('items')
    .upsert({ type: 'skill', name: 'Conflict Test Skill', identifier: 'fixture/conflict-test', content_hash: 'fixture-conflict-001', heatmap_status: 'grey', install_locus: 'local', source_availability: 'source_on_disk' }, { onConflict: 'content_hash' })
    .select()
    .single();
  if (itemErr) throw itemErr;

  const { data: batch, error: batchErr } = await supabase
    .from('scan_batches')
    .insert({ source_path: 'fixture/conflict', item_count: 1 })
    .select()
    .single();
  if (batchErr) throw batchErr;

  const { data: run, error: runErr } = await supabase
    .from('scan_runs')
    .insert({ item_id: item.id, batch_id: batch.id, status: 'complete' })
    .select()
    .single();
  if (runErr) throw runErr;

  const { error: scannersErr } = await supabase.from('scan_run_scanners').insert([
    { scan_run_id: run.id, scanner_source: 'cisco_skill', status: 'completed', checks_run: 3 },
    { scan_run_id: run.id, scanner_source: 'snyk', status: 'completed', checks_run: 3 },
  ]);
  if (scannersErr) throw scannersErr;

  const { error: findingsErr } = await supabase.from('findings').insert([
    { scan_run_id: run.id, item_id: item.id, severity: 'red', category: 'injection', message: 'Prompt injection risk detected', scanner_source: 'cisco_skill' },
    { scan_run_id: run.id, item_id: item.id, severity: 'green', category: 'dependency', message: 'No vulnerable dependencies', scanner_source: 'snyk' },
  ]);
  if (findingsErr) throw findingsErr;

  return batch.id;
}

async function seedTriage() {
  await cleanupItem('fixture-triage-001');

  const { data: item, error: itemErr } = await supabase
    .from('items')
    .upsert({ type: 'mcp_server', name: 'Triage Test Server', identifier: 'fixture/triage-test', content_hash: 'fixture-triage-001', heatmap_status: 'grey', install_locus: 'cloud', source_availability: 'unavailable' }, { onConflict: 'content_hash' })
    .select()
    .single();
  if (itemErr) throw itemErr;

  const { data: batch, error: batchErr } = await supabase
    .from('scan_batches')
    .insert({ source_path: 'fixture/triage', item_count: 1 })
    .select()
    .single();
  if (batchErr) throw batchErr;

  const { data: run, error: runErr } = await supabase
    .from('scan_runs')
    .insert({ item_id: item.id, batch_id: batch.id, status: 'partial-failed' })
    .select()
    .single();
  if (runErr) throw runErr;

  const { error: scannersErr } = await supabase.from('scan_run_scanners').insert([
    { scan_run_id: run.id, scanner_source: 'cisco_mcp', status: 'unreachable', checks_run: 0 },
  ]);
  if (scannersErr) throw scannersErr;

  return batch.id;
}

try {
  const conflictBatchId = await seedConflict();
  const triageBatchId = await seedTriage();
  console.log('Conflict batch ID: ', conflictBatchId);
  console.log('Triage batch ID:   ', triageBatchId);
  console.log('\nRun router against these with:');
  console.log(`  node cli/bin/tripwire.js route --batch-id ${conflictBatchId}`);
  console.log(`  node cli/bin/tripwire.js route --batch-id ${triageBatchId}`);
} catch (err) {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
}
