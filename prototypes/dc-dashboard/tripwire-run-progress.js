/**
 * Run-step progress view model (Slice 68 Stream B / GWT-68.2).
 * Pure ESM — no DOM.
 */

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
 * Build scanner rows + judge progress summary for the Run step.
 *
 * @param {{
 *   scanners?: Array<{ target?: *, scanner?: *, status?: *, candidates?: *, errors?: * }>,
 *   judges?: { answered?: number, total?: number, slots?: Array }
 * }} [input]
 * @returns {{
 *   scannerRows: Array<{ target: *, scanner: *, status: *, candidates: *, errors: * }>,
 *   judgesSummary: string,
 *   judgeSlots: Array<{ slot: *, verdict: *, confidence: *, status: * }>
 * }}
 */
export function buildRunProgressView({ scanners, judges } = {}) {
  const scannerRows = (scanners ?? []).map(normalizeScannerRow);
  const answered = judges?.answered ?? 0;
  const total = judges?.total ?? DEFAULT_JUDGE_TOTAL;
  const judgeSlots = (judges?.slots ?? []).map(normalizeJudgeSlot);
  return {
    scannerRows,
    judgesSummary: `${answered} of ${total} judges answered`,
    judgeSlots,
  };
}
