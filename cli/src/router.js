import { getSupabase } from './supabaseClient.js';

function resolveModel(cliArg, envKey, defaultValue) {
  if (cliArg) return cliArg;
  const envValue = (process.env[envKey] || '').trim();
  if (envValue) return envValue;
  return defaultValue;
}

function computeConflicting(findings) {
  const valid = findings.filter(f => ['red', 'amber', 'green'].includes(f.severity));
  const bySrc = {};
  for (const f of valid) {
    if (!bySrc[f.scanner_source]) bySrc[f.scanner_source] = new Set();
    bySrc[f.scanner_source].add(f.severity);
  }
  const srcSeverities = Object.values(bySrc)
    .filter(s => s.size === 1)
    .map(s => [...s][0]);
  const distinctSrcSeverities = new Set(srcSeverities);
  return srcSeverities.length >= 2 && distinctSrcSeverities.size >= 2;
}

async function deleteOldFindings(supabase, batchId) {
  // Fetch all scan_run ids for this batch
  const { data: scanRuns, error: fetchError } = await supabase
    .from('scan_runs')
    .select('id')
    .eq('batch_id', batchId);
  if (fetchError) throw fetchError;

  const scanRunIds = (scanRuns || []).map(sr => sr.id);
  if (scanRunIds.length === 0) return;

  // Delete findings with tiered_router source for these scan_runs
  const { error: deleteError } = await supabase
    .from('findings')
    .delete()
    .eq('scanner_source', 'tiered_router')
    .in('scan_run_id', scanRunIds);
  if (deleteError) throw deleteError;
}

async function fetchItemData(supabase, scanRun) {
  // Fetch scan_run_scanners for this scan_run
  const { data: scanners, error: scannersError } = await supabase
    .from('scan_run_scanners')
    .select('*')
    .eq('scan_run_id', scanRun.id);
  if (scannersError) throw scannersError;

  // Fetch findings for this scan_run, excluding tiered_router
  const { data: allFindings, error: findingsError } = await supabase
    .from('findings')
    .select('*')
    .eq('scan_run_id', scanRun.id)
    .neq('scanner_source', 'tiered_router');
  if (findingsError) throw findingsError;

  const findings = allFindings || [];
  const scannersList = scanners || [];

  // Compute conflicting: 2+ distinct scanner sources with different severities
  const conflicting = computeConflicting(findings);

  // Compute unusual_status: any scanner status != 'completed'
  const unusual_status = scannersList.some(s => s.status !== 'completed');

  return {
    findingCount: findings.length,
    conflicting,
    unusual_status,
  };
}

export async function runRoute(batchId, opts = {}) {
  const sieModel = resolveModel(opts.sieModel, 'SIE_MODEL', 'gen-4b');
  const modelStudioModel = resolveModel(opts.modelStudioModel, 'MODEL_STUDIO_MODEL', 'qwen3.8-max');

  console.log(`SIE model: ${sieModel}, Model Studio model: ${modelStudioModel}`);

  const supabase = getSupabase();

  // Idempotency DELETE: remove old tiered_router findings for this batch
  await deleteOldFindings(supabase, batchId);

  // Fetch scan_runs for this batch, excluding failed ones
  const { data: scanRuns, error: scanRunsError } = await supabase
    .from('scan_runs')
    .select('*')
    .eq('batch_id', batchId)
    .neq('status', 'failed');
  if (scanRunsError) throw scanRunsError;

  const runs = scanRuns || [];

  // Fetch items for quick lookup
  const itemIds = [...new Set(runs.map(sr => sr.item_id))];
  const { data: itemsData, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .in('id', itemIds);
  if (itemsError) throw itemsError;
  const itemsById = {};
  (itemsData || []).forEach(item => {
    itemsById[item.id] = item;
  });

  console.log(`[route] Batch ${batchId}: ${runs.length} items`);

  // Process each scan_run
  for (const scanRun of runs) {
    const item = itemsById[scanRun.item_id];
    const itemLabel = item?.identifier || scanRun.item_id;

    try {
      const data = await fetchItemData(supabase, scanRun);
      console.log(
        `[route] Item ${itemLabel} (${scanRun.id}): status=${scanRun.status}, findings=${data.findingCount}, conflicting=${data.conflicting}, unusual_status=${data.unusual_status}`
      );
    } catch (err) {
      console.error(`[error] Failed to fetch data for item ${itemLabel}: ${err.message}`);
      throw err;
    }
  }
}
