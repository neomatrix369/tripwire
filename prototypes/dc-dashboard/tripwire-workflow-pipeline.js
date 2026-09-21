/**
 * Slice 75 — operator-visible workflow pipeline helpers (pure ESM, no DOM).
 * Judge-panel honesty, coverage ledger preference, process line, CTA, narration.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-workflow-pipeline.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-run-progress.js
 *   EXTENSION-COST: would couple Run row normalization with coverage/evidence/CTA
 *     honesty used across Triage/Investigate — bloating the Run-only view model
 *   PARALLEL-RATIONALE: slice 75 assigns a reusable pure narration/honesty layer
 *     shared by Run/Triage/Investigate; different public surface from scanner rows
 */

const STATUS_PANEL_OFF = 'Judge panel not run (opt-in off)';
const STATUS_PANEL_ABSENT = 'Judge panel pending / not available yet';

const ABSENT_COPY = Object.freeze({
  attack_path: 'Not provided by scanner',
  prerequisites: 'Not provided by scanner',
  evidence: 'Evidence verification not run',
  verdict: 'Judgement pending — judge panel fields not present yet',
});

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} slots
 * @returns {boolean}
 */
function hasRealSlots(slots) {
  return Array.isArray(slots) && slots.length > 0;
}

/**
 * @param {unknown} judgements
 * @returns {boolean}
 */
function hasRealJudgements(judgements) {
  return Array.isArray(judgements) && judgements.length > 0;
}

/**
 * @param {Record<string, unknown>|null|undefined} data
 * @returns {boolean}
 */
function isExplicitlyOff(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.judgePanelEnabled === false) return true;
  if (data.panel_status === 'off') return true;
  if (data.judgePanel === null && data.judgePanelOptIn === false) return true;
  return false;
}

/**
 * @param {unknown} panel
 * @returns {boolean}
 */
function panelHasRealContent(panel) {
  if (!isPlainObject(panel)) return false;
  if (hasRealSlots(panel.slots)) return true;
  if (hasRealJudgements(panel.judgements)) return true;
  if (Number(panel.answered) > 0 || Number(panel.answered_count) > 0) return true;
  if (panel.finalVerdict != null || panel.final_verdict != null) return true;
  if (isPlainObject(panel.final_judge) && panel.final_judge.verdict != null) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} panel
 * @param {'live'|'present'} mode
 * @returns {ReturnType<typeof emptyJudgeState>}
 */
function normalizePresentPanel(panel, mode) {
  const slots = hasRealSlots(panel.slots)
    ? panel.slots
    : hasRealJudgements(panel.judgements)
      ? panel.judgements
      : [];
  const answered =
    panel.answered ??
    panel.answered_count ??
    slots.filter((s) => {
      const status = s?.status;
      return status === 'answered' || status === 'done' || (s?.verdict != null && s?.verdict !== '');
    }).length;
  const total =
    panel.total ??
    panel.total_judges ??
    (slots.length > 0 ? slots.length : 0);
  const finalJudge = isPlainObject(panel.final_judge) ? panel.final_judge : null;
  const finalVerdict =
    panel.finalVerdict ?? panel.final_verdict ?? finalJudge?.verdict ?? null;
  const finalReason =
    panel.finalReason ?? panel.final_reason ?? finalJudge?.reason ?? null;
  const finalModel =
    panel.finalModel ?? panel.final_model ?? finalJudge?.model ?? null;
  const disagreement =
    panel.disagreement ?? finalJudge?.disagreement ?? false;

  return {
    mode,
    answered: Number(answered) || 0,
    total: Number(total) || 0,
    slots,
    disagreement: !!disagreement,
    finalVerdict,
    finalReason,
    finalModel,
    panelOff: false,
    statusLine: `${Number(answered) || 0} of ${Number(total) || 0} judges answered`,
  };
}

/**
 * @param {'off'|'absent'} mode
 * @param {string} statusLine
 * @returns {{
 *   mode: string,
 *   answered: number,
 *   total: number,
 *   slots: [],
 *   disagreement: boolean,
 *   finalVerdict: null,
 *   finalReason: null,
 *   finalModel: null,
 *   panelOff: boolean,
 *   statusLine: string
 * }}
 */
function emptyJudgeState(mode, statusLine) {
  return {
    mode,
    answered: 0,
    total: 0,
    slots: [],
    disagreement: false,
    finalVerdict: null,
    finalReason: null,
    finalModel: null,
    panelOff: mode === 'off',
    statusLine,
  };
}

/**
 * Resolve judge-panel UI state without fabricating pending slots.
 *
 * @param {Record<string, unknown>|null|undefined} data
 */
export function resolveJudgePanelState(data) {
  if (isExplicitlyOff(data)) {
    return emptyJudgeState('off', STATUS_PANEL_OFF);
  }

  const panelRun = data?.panel_run;
  if (panelHasRealContent(panelRun)) {
    return normalizePresentPanel(panelRun, 'live');
  }

  const judgePanel = data?.judgePanel;
  if (panelHasRealContent(judgePanel)) {
    return normalizePresentPanel(judgePanel, 'present');
  }

  const judges = data?.judges;
  if (panelHasRealContent(judges)) {
    return normalizePresentPanel(judges, 'present');
  }

  return emptyJudgeState('absent', STATUS_PANEL_ABSENT);
}

/**
 * @param {Record<string, unknown>} ledger
 * @returns {{ discovered: number, scanned: number, failed: number, skipped: number, source: 'ledger' }}
 */
function fromLedger(ledger) {
  return {
    discovered: Number(ledger.discovered) || 0,
    scanned: Number(ledger.scanned) || 0,
    failed: Number(ledger.failed) || 0,
    skipped: Number(ledger.skipped) || 0,
    source: 'ledger',
  };
}

/**
 * @param {unknown} candidate
 * @returns {boolean}
 */
function looksLikeCoverageCounts(candidate) {
  if (!isPlainObject(candidate)) return false;
  return (
    'discovered' in candidate ||
    'scanned' in candidate ||
    'failed' in candidate ||
    'skipped' in candidate
  );
}

/**
 * Prefer CLI coverage ledger; else item-count heuristics (source tagged).
 *
 * @param {Record<string, unknown>|null|undefined} data
 */
export function resolveCoverageHonesty(data) {
  const ledger =
    (looksLikeCoverageCounts(data?.coverage) && data.coverage) ||
    (looksLikeCoverageCounts(data?.coverage_ledger) && data.coverage_ledger) ||
    (looksLikeCoverageCounts(data?.coverageLedger) && data.coverageLedger) ||
    null;

  if (ledger) return fromLedger(ledger);

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    discovered: items.length,
    scanned: items.filter((it) => it.lastScan || it.status === 'running').length,
    failed: items.filter((it) => it.status === 'error').length,
    skipped: items.filter((it) => it.status === 'grey' || it.status === 'no_coverage').length,
    source: 'heuristic',
  };
}

/**
 * Honest placeholder copy — never "judge panel pending" for non-verdict fields.
 *
 * @param {'attack_path'|'prerequisites'|'evidence'|'verdict'} kind
 * @returns {string}
 */
export function honestAbsentCopy(kind) {
  return ABSENT_COPY[kind] ?? ABSENT_COPY.verdict;
}

/**
 * @param {unknown} value
 * @returns {'verified'|'unverified'|'not run'|string}
 */
export function formatEvidenceVerification(value) {
  if (value == null || value === '') return 'not run';
  const raw = String(value).trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (raw === 'verified' || raw === 'ok' || raw === 'pass' || raw === 'passed') {
    return 'verified';
  }
  if (raw === 'unverified' || raw === 'fail' || raw === 'failed') {
    return 'unverified';
  }
  if (
    raw === 'not_run' ||
    raw === 'notrun' ||
    raw === 'pending' ||
    raw === 'absent' ||
    raw === 'n/a'
  ) {
    return 'not run';
  }
  return String(value).trim();
}

/** Terminal / finished scanner statuses (not still running). Slice 77. */
const TERMINAL_SCANNER_STATUSES = Object.freeze(
  new Set([
    'done',
    'completed',
    'failed',
    'skipped',
    'timed_out',
    'timedout',
    'unreachable',
    'not_applicable',
    'blocked',
    'not_run',
    'n/a',
    'na',
    'absent',
    'error',
  ]),
);

const ACTIVE_SCANNER_STATUSES = Object.freeze(
  new Set(['running', 'pending', 'queued', 'not_started', 'in_progress', 'active']),
);

/**
 * Normalize scanner status tokens (spaces/hyphens → underscore).
 * @param {unknown} status
 * @returns {string}
 */
export function normalizeScannerStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function scannerIsActive(status) {
  const s = normalizeScannerStatus(status);
  return ACTIVE_SCANNER_STATUSES.has(s);
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function scannerIsTerminal(status) {
  const s = normalizeScannerStatus(status);
  if (!s) return false;
  return TERMINAL_SCANNER_STATUSES.has(s);
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function scannerIsComplete(status) {
  return scannerIsTerminal(status);
}

/**
 * True when every scanner row is finished (or there are no rows).
 * `not_applicable` / `blocked` count as finished so Run CTA can advance.
 *
 * @param {Array<{ status?: unknown }>|null|undefined} scanners
 * @returns {boolean}
 */
export function areScannersFinished(scanners) {
  const rows = Array.isArray(scanners) ? scanners : [];
  if (rows.length === 0) return false;
  return rows.every((r) => scannerIsTerminal(r?.status));
}

/**
 * Prefer finished rows for Run advancement; active rows block completion.
 *
 * @param {Array<{ status?: unknown }>|null|undefined} scanners
 * @returns {boolean}
 */
export function scannersReadyForTriage(scanners) {
  const rows = Array.isArray(scanners) ? scanners : [];
  if (rows.length === 0) return false;
  if (rows.some((r) => scannerIsActive(r?.status))) return false;
  return rows.every((r) => scannerIsTerminal(r?.status));
}

/**
 * Collect scanner rows the same way the dashboard Run panel does.
 * @param {{ items?: Array<{ name?: string, identifier?: string, findings?: unknown[], scanners?: Array<{ source?: string, scanner?: string, status?: string, output?: Record<string, unknown> }> }> }} data
 * @returns {Array<{ target: string, scanner: string, status: string, candidates: number, errors: number }>}
 */
export function collectScannerRows(data) {
  if (!data?.items) return [];
  const rows = [];
  for (const item of data.items) {
    for (const sc of item.scanners || []) {
      const out = sc.output || {};
      rows.push({
        target: item.name || item.identifier || '',
        scanner: sc.source || sc.scanner || '',
        status: sc.status || '',
        candidates:
          out.candidates ??
          out.findings_count ??
          (item.findings || []).filter((f) => f.scanner === sc.source).length,
        errors:
          out.errors ??
          (sc.status === 'failed' || sc.status === 'unreachable' ? 1 : 0),
      });
    }
  }
  return rows;
}

/**
 * Run-panel readiness: process line + primary CTA from scanner rows + findings.
 * @param {{
 *   scanners?: Array<{ status?: unknown }>,
 *   hasFindings?: boolean,
 *   judgesState?: { mode?: string, panelOff?: boolean }
 * }} [input]
 * @returns {{ processLine: string, ctaVisible: boolean, scannersComplete: boolean }}
 */
export function buildRunReadiness({ scanners, hasFindings, judgesState } = {}) {
  const scannersComplete = scannersReadyForTriage(scanners);
  const processLine = buildProcessLine({
    scanners,
    judgesState: judgesState ?? { mode: 'absent' },
    hasFindings: !!hasFindings,
  });
  const cta = buildPrimaryCta({
    scannersComplete,
    hasFindings: !!hasFindings,
    panelMode: judgesState?.mode ?? 'absent',
  });
  return {
    processLine,
    ctaVisible: !!cta.visible,
    scannersComplete,
  };
}

/**
 * Short plain-language process summary for the Run step.
 *
 * @param {{
 *   scanners?: Array<{ status?: unknown, scanner?: unknown }>,
 *   judgesState?: { mode?: string, answered?: number, total?: number, statusLine?: string, panelOff?: boolean },
 *   hasFindings?: boolean
 * }} [input]
 * @returns {string}
 */
export function buildProcessLine({ scanners, judgesState, hasFindings } = {}) {
  const rows = scanners ?? [];
  const active = rows.filter((r) => scannerIsActive(r.status));
  const complete = rows.filter((r) => scannerIsComplete(r.status));
  const mode = judgesState?.mode ?? 'absent';

  let scannersPart;
  if (rows.length === 0) {
    scannersPart = 'No scanners reported yet';
  } else if (active.length > 0) {
    scannersPart = `Scanners running (${active.length} active)`;
  } else if (complete.length === rows.length) {
    scannersPart = 'Scanners complete';
  } else {
    scannersPart = `Scanners ${complete.length} of ${rows.length} finished`;
  }

  let judgesPart;
  if (mode === 'off' || judgesState?.panelOff) {
    judgesPart = 'judge panel off';
  } else if (mode === 'absent') {
    judgesPart = 'judges pending';
  } else {
    const answered = judgesState?.answered ?? 0;
    const total = judgesState?.total ?? 0;
    judgesPart =
      total > 0
        ? `${answered} of ${total} judges answered`
        : judgesState?.statusLine || 'judges in progress';
  }

  const nextPart = hasFindings
    ? 'findings ready for triage'
    : 'waiting for findings';

  return `${scannersPart} · ${judgesPart} · ${nextPart}`;
}

/**
 * Primary CTA when Run is ready to advance to Triage.
 *
 * @param {{
 *   scannersComplete?: boolean,
 *   hasFindings?: boolean,
 *   panelMode?: string
 * }} [input]
 * @returns {{ label: string, visible: boolean }}
 */
export function buildPrimaryCta({ scannersComplete, hasFindings, panelMode } = {}) {
  if (!hasFindings) {
    return { label: 'Review findings', visible: false };
  }
  // Findings exist → allow Triage. scannersComplete preferred but not required when
  // panel is off/absent (operator can review while stragglers run). Terminal
  // statuses (not_applicable/blocked) count toward scannersComplete via
  // scannersReadyForTriage — never block solely on N/A rows.
  const ready =
    !!scannersComplete ||
    panelMode === 'off' ||
    panelMode === 'absent';
  return {
    label: 'Review findings',
    visible: ready,
  };
}

/**
 * Deduplicate workflow findings by stable id (first wins).
 * @param {Array<{ id?: unknown }>|null|undefined} findings
 * @returns {Array<object>}
 */
export function dedupeFindingsById(findings) {
  if (!Array.isArray(findings)) return [];
  const seen = new Set();
  const out = [];
  for (const f of findings) {
    const id = f?.id != null ? String(f.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(f);
  }
  return out;
}

/**
 * Scope findings to one skill / mcp / package target.
 * @param {Array<{ itemId?: unknown }>|null|undefined} findings
 * @param {string|null|undefined} targetId
 * @returns {Array<object>}
 */
export function scopeFindingsToTarget(findings, targetId) {
  if (!Array.isArray(findings)) return [];
  if (targetId == null || targetId === '' || targetId === 'all') return findings.slice();
  const id = String(targetId);
  return findings.filter((f) => String(f?.itemId ?? '') === id);
}

/**
 * Single-select: replace selection with one id (or clear if same id toggled off).
 * @param {unknown} ids
 * @param {unknown} findingId
 * @param {{ toggleOff?: boolean }} [opts]
 * @returns {string[]}
 */
export function selectSingleFinding(ids, findingId, { toggleOff = true } = {}) {
  if (findingId == null || findingId === '') return normalizeSelectionIds(ids);
  const id = String(findingId);
  const current = normalizeSelectionIds(ids);
  if (toggleOff && current.length === 1 && current[0] === id) return [];
  return [id];
}

/**
 * @param {Array<{ triageStatus?: string }>|null|undefined} findings
 * @returns {{ triageStatus?: string }|null}
 */
export function pickFirstToFixFinding(findings) {
  if (!Array.isArray(findings)) return null;
  return findings.find((f) => f?.triageStatus === 'to_fix') ?? null;
}

/**
 * Parent target label: "type · name" (never colour-only).
 *
 * @param {Record<string, unknown>|null|undefined} finding
 * @returns {string}
 */
export function formatParentTargetMeta(finding) {
  if (!finding || typeof finding !== 'object') return '';
  const type = String(
    finding.itemType ?? finding.parentType ?? finding.type ?? '',
  ).trim();
  const name = String(
    finding.itemName ??
      finding.parentName ??
      finding.name ??
      finding.itemId ??
      '',
  ).trim();
  if (type && name) return `${type} · ${name}`;
  if (type) return type;
  if (name) return name;
  return '';
}

/**
 * @param {unknown} ids
 * @returns {string[]}
 */
export function normalizeSelectionIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    if (raw == null || raw === '') continue;
    const id = String(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Single-select (slice 77): selecting a finding replaces the previous selection.
 * Toggle-off when the same id is selected again.
 * @param {unknown} ids
 * @param {unknown} findingId
 * @returns {string[]}
 */
export function toggleFindingSelection(ids, findingId) {
  return selectSingleFinding(ids, findingId, { toggleOff: true });
}

/**
 * @param {{ selectedIds?: unknown, activeId?: unknown }} [input]
 * @returns {string} empty when N ≤ 1
 */
export function selectionProgressLabel({ selectedIds, activeId } = {}) {
  const ids = normalizeSelectionIds(selectedIds);
  const n = ids.length;
  if (n <= 1) return '';
  let k = 1;
  if (activeId != null && activeId !== '') {
    const idx = ids.indexOf(String(activeId));
    if (idx >= 0) k = idx + 1;
  }
  return `${k} of ${n} selected`;
}

/**
 * Final-judge + disagreement narration for GWT-75.2.
 *
 * @param {{
 *   mode?: string,
 *   panelOff?: boolean,
 *   finalVerdict?: unknown,
 *   finalReason?: unknown,
 *   finalModel?: unknown,
 *   disagreement?: boolean,
 *   statusLine?: string
 * }|null|undefined} judgesState
 * @returns {{ finalLine: string, disagreementLine: string }}
 */
export function buildFinalJudgeNarration(judgesState) {
  if (!judgesState || judgesState.mode === 'off' || judgesState.panelOff) {
    return {
      finalLine: STATUS_PANEL_OFF,
      disagreementLine: '',
    };
  }
  if (judgesState.mode === 'absent' || judgesState.finalVerdict == null) {
    return {
      finalLine: STATUS_PANEL_ABSENT,
      disagreementLine: '',
    };
  }

  const verdict = String(judgesState.finalVerdict);
  const reason = judgesState.finalReason
    ? ` — ${judgesState.finalReason}`
    : '';
  const model = judgesState.finalModel
    ? ` (${judgesState.finalModel})`
    : '';
  const finalLine = `Final verdict: ${verdict}${reason}${model}`;
  const disagreementLine = judgesState.disagreement
    ? 'Judges disagreed — final judge weighed reasons (not vote count alone)'
    : 'Judges agreed on the verdict';

  return { finalLine, disagreementLine };
}
