/**
 * Run-step progress view model (Slice 68 Stream B / GWT-68.2; Slice 75 narration).
 * Pure ESM — no DOM.
 */

import {
  buildPrimaryCta,
  buildProcessLine,
} from './tripwire-workflow-pipeline.js';

const DEFAULT_JUDGE_TOTAL = 3;

/**
 * @param {{ target?: *, scanner?: *, status?: *, candidates?: *, errors?: * }|null|undefined} row
 */
function normalizeScannerRow(row) {
  const src = row ?? {};
  return {
    target: src.target ?? "",
    scanner: src.scanner ?? "",
    status: src.status ?? "",
    candidates: src.candidates ?? 0,
    errors: src.errors ?? 0,
  };
}

/**
 * @param {{ slot?: *, verdict?: *, confidence?: *, status?: * }|null|undefined} slot
 */
function normalizeJudgeSlot(slot) {
  const src = slot ?? {};
  return {
    slot: src.slot ?? "",
    verdict: src.verdict ?? "",
    confidence: src.confidence ?? null,
    status: src.status ?? "",
  };
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isTerminalScannerStatus(status) {
  const s = String(status ?? "").toLowerCase();
  return (
    s === "done" ||
    s === "completed" ||
    s === "failed" ||
    s === "skipped" ||
    s === "timed_out" ||
    s === "unreachable"
  );
}

/**
 * @param {{ answered?: number, total?: number, slots?: Array, mode?: string, panelOff?: boolean }} [judges]
 */
function judgesStateForNarration(judges) {
  if (judges?.mode) return judges;
  const slots = judges?.slots ?? [];
  const answered = judges?.answered ?? 0;
  const total = judges?.total ?? (slots.length || 0);
  const panelOff = !!judges?.panelOff;
  let mode = "absent";
  if (panelOff) mode = "off";
  else if (slots.length > 0 || answered > 0) mode = "present";
  return {
    mode,
    answered,
    total,
    slots,
    panelOff,
    statusLine: `${answered} of ${total} judges answered`,
  };
}

/**
 * Build scanner rows + judge progress summary for the Run step.
 *
 * @param {{
 *   scanners?: Array<{ target?: *, scanner?: *, status?: *, candidates?: *, errors?: * }>,
 *   judges?: { answered?: number, total?: number, slots?: Array, mode?: string, panelOff?: boolean },
 *   processLine?: string,
 *   primaryCta?: { label: string, visible: boolean },
 *   includeNarration?: boolean,
 *   hasFindings?: boolean
 * }} [input]
 * @returns {{
 *   scannerRows: Array<{ target: *, scanner: *, status: *, candidates: *, errors: * }>,
 *   judgesSummary: string,
 *   judgeSlots: Array<{ slot: *, verdict: *, confidence: *, status: * }>,
 *   processLine?: string,
 *   primaryCta?: { label: string, visible: boolean }
 * }}
 */
export function buildRunProgressView({
  scanners,
  judges,
  processLine,
  primaryCta,
  includeNarration,
  hasFindings,
} = {}) {
  const scannerRows = (scanners ?? []).map(normalizeScannerRow);
  const answered = judges?.answered ?? 0;
  const total = judges?.total ?? DEFAULT_JUDGE_TOTAL;
  const judgeSlots = (judges?.slots ?? []).map(normalizeJudgeSlot);
  const view = {
    scannerRows,
    judgesSummary: `${answered} of ${total} judges answered`,
    judgeSlots,
  };

  if (processLine != null) view.processLine = processLine;
  if (primaryCta != null) view.primaryCta = primaryCta;

  if (includeNarration) {
    const judgesState = judgesStateForNarration(judges);
    const scannersComplete =
      scannerRows.length > 0 &&
      scannerRows.every((row) => isTerminalScannerStatus(row.status));
    if (view.processLine == null) {
      view.processLine = buildProcessLine({
        scanners: scannerRows,
        judgesState,
        hasFindings: !!hasFindings,
      });
    }
    if (view.primaryCta == null) {
      view.primaryCta = buildPrimaryCta({
        scannersComplete,
        hasFindings: !!hasFindings,
        panelMode: judgesState.mode,
      });
    }
  }

  return view;
}
