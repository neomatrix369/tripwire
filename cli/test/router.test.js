/**
 * Tests for cli/src/router.js.

 * Author: swami
 * Created: 2026-08-14
 * Scope: preserve prior tiered_router strips when SIE skips; replace on success
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRoute } from '../src/router.js';

function makeThenable(value) {
  return {
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

/**
 * In-memory Supabase stub for one batch / one scan run.
 * Tracks tiered_router findings so wipe-on-SIE-skip can be asserted.
 */
function createRouterSupabaseStub({
  batchId = 'batch-1',
  scanRunId = 'run-1',
  itemId = 'item-1',
  item = { id: 'item-1', identifier: 'safe-csv-cleaner', type: 'skill' },
  scanners = [{ scanner_source: 'Snyk', status: 'completed' }],
  nonRouterFindings = [],
  initialRouterFindings = [],
} = {}) {
  const findings = [...initialRouterFindings];
  const calls = { deletes: [], inserts: [] };

  function findingsQuery() {
    let filters = {};
    const api = {
      select() { return api; },
      eq(col, val) { filters[col] = val; return api; },
      neq(col, val) { filters[`neq:${col}`] = val; return api; },
      in() { return api; },
      delete() {
        return {
          eq(col, val) {
            filters[col] = val;
            return {
              eq(col2, val2) {
                filters[col2] = val2;
                return makeThenable((() => {
                  calls.deletes.push({ ...filters });
                  const before = findings.length;
                  for (let i = findings.length - 1; i >= 0; i -= 1) {
                    const f = findings[i];
                    if (filters.scanner_source && f.scanner_source !== filters.scanner_source) continue;
                    if (filters.scan_run_id && f.scan_run_id !== filters.scan_run_id) continue;
                    findings.splice(i, 1);
                  }
                  return { data: null, error: null, deleted: before - findings.length };
                })());
              },
              then: makeThenable({ data: null, error: null }).then.bind(
                makeThenable({ data: null, error: null }),
              ),
            };
          },
        };
      },
      then(resolve, reject) {
        let rows = findings.filter((f) => {
          if (filters.scan_run_id && f.scan_run_id !== filters.scan_run_id) return false;
          if (filters.scanner_source && f.scanner_source !== filters.scanner_source) return false;
          if (filters['neq:scanner_source'] && f.scanner_source === filters['neq:scanner_source']) {
            return false;
          }
          return true;
        });
        // Non-router select uses neq tiered_router — supply fixture rows
        if (filters['neq:scanner_source'] === 'tiered_router') {
          rows = nonRouterFindings.filter(
            (f) => !filters.scan_run_id || f.scan_run_id === filters.scan_run_id,
          );
        }
        return makeThenable({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  const supabase = {
    findings,
    calls,
    from(table) {
      if (table === 'scan_runs') {
        return {
          select() {
            return {
              eq(col, val) {
                if (col === 'batch_id' && val === batchId) {
                  return {
                    neq() {
                      return makeThenable({
                        data: [{ id: scanRunId, item_id: itemId, batch_id: batchId, status: 'complete' }],
                        error: null,
                      });
                    },
                    then: makeThenable({
                      data: [{ id: scanRunId, item_id: itemId, batch_id: batchId, status: 'complete' }],
                      error: null,
                    }).then.bind(makeThenable({
                      data: [{ id: scanRunId, item_id: itemId, batch_id: batchId, status: 'complete' }],
                      error: null,
                    })),
                  };
                }
                return makeThenable({ data: [], error: null });
              },
            };
          },
        };
      }
      if (table === 'items') {
        return {
          select() {
            return {
              in() {
                return makeThenable({ data: [item], error: null });
              },
            };
          },
        };
      }
      if (table === 'scan_run_scanners') {
        return {
          select() {
            return {
              eq() {
                return makeThenable({ data: scanners, error: null });
              },
            };
          },
        };
      }
      if (table === 'findings') {
        return {
          select: () => findingsQuery(),
          delete: () => findingsQuery().delete(),
          insert(row) {
            calls.inserts.push(row);
            findings.push({ ...row });
            return makeThenable({ data: [row], error: null });
          },
        };
      }
      return {
        select() { return makeThenable({ data: [], error: null }); },
      };
    },
  };

  return supabase;
}

test('given prior routing_review when SIE fails then strip finding is preserved', async () => {
  /**
   * Scenario: Re-route must not wipe Scan → SIE → ■ when SIE is unreachable.
   * Slice: tiered router — preserve strips on SIE skip
   *
   * Given a scan run already has routing_review (SIE-only, not escalated),
   * When runRoute is invoked and SIE throws for that item,
   * Then the prior tiered_router finding remains so the dashboard can show the strip.
   */
  // -- Given --
  const prior = {
    scan_run_id: 'run-1',
    item_id: 'item-1',
    severity: 'green',
    category: 'routing_review',
    scanner_source: 'tiered_router',
    message: JSON.stringify({
      escalated: false,
      signals: { conflicting: false, unusual_status: false, low_confidence: false },
      models: { sie: 'gen-4b', model_studio: null },
      reasoning: { sie: 'clean', model_studio: null },
    }),
  };
  const supabase = createRouterSupabaseStub({ initialRouterFindings: [prior] });
  const prevSie = process.env.SIE_ENDPOINT;
  const prevSieKey = process.env.SIE_API_KEY;
  const prevMs = process.env.ALIBABA_OPENAI_BASE_URL;
  const prevMsKey = process.env.DASHSCOPE_API_KEY;
  process.env.SIE_ENDPOINT = 'https://sie.example';
  process.env.SIE_API_KEY = 'sk-sie-test';
  process.env.ALIBABA_OPENAI_BASE_URL = 'https://ms.example/v1';
  process.env.DASHSCOPE_API_KEY = 'sk-ms-test';

  // -- When --
  try {
    await runRoute('batch-1', {
      getSupabaseFn: () => supabase,
      callSieFn: async () => {
        throw new Error('HTTP 503: provisioning');
      },
    });
  } finally {
    process.env.SIE_ENDPOINT = prevSie;
    process.env.SIE_API_KEY = prevSieKey;
    process.env.ALIBABA_OPENAI_BASE_URL = prevMs;
    process.env.DASHSCOPE_API_KEY = prevMsKey;
  }

  // -- Then --
  const routerRows = supabase.findings.filter((f) => f.scanner_source === 'tiered_router');
  assert.equal(routerRows.length, 1, 'prior routing_review must survive SIE skip');
  assert.equal(routerRows[0].category, 'routing_review');
  assert.equal(supabase.calls.deletes.length, 0, 'must not delete before a successful route');
  assert.equal(supabase.calls.inserts.length, 0);
});

test('given SIE declines escalate when route succeeds then writes routing_review', async () => {
  /**
   * Scenario: Successful non-escalation persists Scan → SIE → ■ as routing_review.
   * Slice: tiered router — SIE-only path
   *
   * Given scanners completed with no conflict,
   * When SIE returns escalate=false,
   * Then a routing_review finding is written for the scan run.
   */
  // -- Given --
  const supabase = createRouterSupabaseStub();
  const prevSie = process.env.SIE_ENDPOINT;
  const prevSieKey = process.env.SIE_API_KEY;
  const prevMs = process.env.ALIBABA_OPENAI_BASE_URL;
  const prevMsKey = process.env.DASHSCOPE_API_KEY;
  process.env.SIE_ENDPOINT = 'https://sie.example';
  process.env.SIE_API_KEY = 'sk-sie-test';
  process.env.ALIBABA_OPENAI_BASE_URL = 'https://ms.example/v1';
  process.env.DASHSCOPE_API_KEY = 'sk-ms-test';

  // -- When --
  try {
    await runRoute('batch-1', {
      getSupabaseFn: () => supabase,
      callSieFn: async () => ({
        escalate: false,
        low_confidence: false,
        reasoning: 'Scanners agree; no escalation.',
      }),
    });
  } finally {
    process.env.SIE_ENDPOINT = prevSie;
    process.env.SIE_API_KEY = prevSieKey;
    process.env.ALIBABA_OPENAI_BASE_URL = prevMs;
    process.env.DASHSCOPE_API_KEY = prevMsKey;
  }

  // -- Then --
  assert.equal(supabase.calls.inserts.length, 1);
  assert.equal(supabase.calls.inserts[0].category, 'routing_review');
  const env = JSON.parse(supabase.calls.inserts[0].message);
  assert.equal(env.escalated, false);
  assert.equal(env.models.model_studio, null);
});
