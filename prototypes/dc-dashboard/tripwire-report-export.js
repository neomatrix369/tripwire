/**
 * Slice 71 Stream B — report export serializer (pure ESM, browser-safe).
 * Masks secrets by default; builds JSON/Markdown payloads with coverage.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-report-export.js
 *   CLOSEST-EXISTING: cli/src/evidenceVerify.js (maskSecrets / SECRET_RULES)
 *   EXTENSION-COST: Node-only fs would break browser dashboard export
 *   PARALLEL-RATIONALE: SLICE-71-CONTRACT assigns Stream B exclusive ownership
 */

/** Mirror cli/src/evidenceVerify.js SECRET_RULES (Bearer, sk-/api keys). */
const SECRET_RULES = Object.freeze([
  Object.freeze({ re: /Bearer\s+\S+/gi, to: 'Bearer [REDACTED]' }),
  Object.freeze({
    re: /\b(sk-|sk-ant-|ospy_|tsi_|dashscope)[A-Za-z0-9_-]{8,}\b/gi,
    to: '[REDACTED_KEY]',
  }),
  Object.freeze({
    re: /api[_-]?key["']?\s*[:=]\s*["']?[^"'&\s]+/gi,
    to: 'api_key=[REDACTED]',
  }),
]);

/**
 * @param {unknown} text
 * @param {{ reveal?: boolean }} [opts]
 * @returns {{ text: string, masked: boolean }}
 */
export function maskSecrets(text, { reveal = false } = {}) {
  const source = String(text ?? '');
  if (reveal) return { text: source, masked: false };
  let out = source;
  let masked = false;
  for (const rule of SECRET_RULES) {
    const next = out.replace(rule.re, rule.to);
    if (next !== out) masked = true;
    out = next;
  }
  return { text: out, masked };
}

/**
 * Deep-mask every string leaf unless revealSecrets is true.
 * @param {unknown} value
 * @param {boolean} revealSecrets
 * @returns {unknown}
 */
function maskValue(value, revealSecrets) {
  if (typeof value === 'string') {
    return maskSecrets(value, { reveal: revealSecrets }).text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, revealSecrets));
  }
  if (value != null && typeof value === 'object') {
    return maskObject(value, revealSecrets);
  }
  return value;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {boolean} revealSecrets
 * @returns {Record<string, unknown>}
 */
function maskObject(obj, revealSecrets) {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    out[key] = maskValue(val, revealSecrets);
  }
  return out;
}

/**
 * Normalize one finding for export (evidence, verdicts, fixes, verification, provenance).
 * @param {Record<string, unknown>} finding
 * @param {boolean} revealSecrets
 * @returns {Record<string, unknown>}
 */
function normalizeFinding(finding, revealSecrets) {
  const src = finding && typeof finding === 'object' ? finding : {};
  const row = {
    id: src.id,
    title: src.title,
    severity: src.severity,
    triageStatus: src.triageStatus,
    reportDisposition: src.reportDisposition,
    evidence: pickEvidence(src),
    verdicts: pickVerdicts(src),
    fixes: src.fixes ?? src.fix ?? undefined,
    verification: pickVerification(src),
    provenance: pickProvenance(src),
    howWeDecided: src.howWeDecided,
    scanner: src.scanner ?? src.scannerDetails,
    weaknessIds: src.weaknessIds ?? src.weakness_ids ?? src.cweIds,
    aiSecIds: src.aiSecIds ?? src.ai_sec_ids,
    message: src.message,
    snippet: src.snippet,
    file_path: src.file_path ?? src.filePath,
    location: src.location,
  };
  return dropUndefined(maskObject(row, revealSecrets));
}

/**
 * @param {Record<string, unknown>} src
 * @returns {unknown}
 */
function pickEvidence(src) {
  if (src.evidence != null) return src.evidence;
  const highlight = src.evidenceHighlight ?? src.snippet;
  if (highlight == null && src.message == null) return undefined;
  return {
    highlight: highlight ?? undefined,
    message: src.message,
    source: src.source,
    sink: src.sink,
  };
}

/**
 * @param {Record<string, unknown>} src
 * @returns {unknown}
 */
function pickVerdicts(src) {
  if (src.verdicts != null) return src.verdicts;
  if (src.verdictLine == null && src.verdict == null) return undefined;
  return {
    line: src.verdictLine,
    verdict: src.verdict,
    agreement: src.agreement,
  };
}

/**
 * @param {Record<string, unknown>} src
 * @returns {unknown}
 */
function pickVerification(src) {
  if (src.verification != null) return src.verification;
  if (src.evidenceVerification == null && src.evidence_status == null) return undefined;
  return {
    evidenceVerification: src.evidenceVerification,
    evidence_status: src.evidence_status,
    independently_confirmed: src.independently_confirmed,
  };
}

/**
 * @param {Record<string, unknown>} src
 * @returns {unknown}
 */
function pickProvenance(src) {
  if (src.provenance != null) return src.provenance;
  if (src.howWeDecided == null) return undefined;
  return { howWeDecided: src.howWeDecided };
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function dropUndefined(obj) {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) out[key] = val;
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} coverage
 * @param {boolean} revealSecrets
 * @returns {Record<string, unknown>}
 */
function normalizeCoverage(coverage, revealSecrets) {
  const src = coverage && typeof coverage === 'object' ? coverage : {};
  const row = {
    repo: src.repo,
    commit: src.commit,
    discovered: src.discovered ?? 0,
    scanned: src.scanned ?? 0,
    failed: src.failed ?? 0,
    skipped: src.skipped ?? 0,
    targets: src.targets,
    scanners: src.scanners,
    statuses: src.statuses,
    unsupportedReasons: src.unsupportedReasons ?? src.unsupported_reasons,
  };
  return dropUndefined(maskObject(row, revealSecrets));
}

/**
 * @param {{
 *   findings?: unknown[],
 *   coverage?: Record<string, unknown>,
 *   meta?: Record<string, unknown>,
 *   revealSecrets?: boolean,
 * }} [input]
 * @returns {{
 *   meta: { repo?: unknown, commit?: unknown, exportedAt?: unknown },
 *   findings: Record<string, unknown>[],
 *   coverage: Record<string, unknown>,
 * }}
 */
export function buildReportPayload({
  findings,
  coverage,
  meta,
  revealSecrets = false,
} = {}) {
  const metaSrc = meta && typeof meta === 'object' ? meta : {};
  const rawMeta = {
    repo: metaSrc.repo,
    commit: metaSrc.commit,
    exportedAt: metaSrc.exportedAt,
  };
  return {
    meta: dropUndefined(maskObject(rawMeta, revealSecrets)),
    findings: (Array.isArray(findings) ? findings : []).map((f) =>
      normalizeFinding(f, revealSecrets),
    ),
    coverage: normalizeCoverage(coverage, revealSecrets),
  };
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
export function serializeReportJson(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * @param {{
 *   meta?: Record<string, unknown>,
 *   findings?: Record<string, unknown>[],
 *   coverage?: Record<string, unknown>,
 *   headline?: unknown,
 * }} payload
 * @returns {string}
 */
export function serializeReportMarkdown(payload) {
  const src = payload && typeof payload === 'object' ? payload : {};
  const lines = ['# Tripwire Report', ''];
  appendMetaSection(lines, src.meta);
  if (src.headline != null) {
    lines.push('## Headline', '', String(src.headline), '');
  }
  appendFindingsSection(lines, src.findings);
  appendCoverageSection(lines, src.coverage);
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * @param {string[]} lines
 * @param {Record<string, unknown>|undefined} meta
 */
function appendMetaSection(lines, meta) {
  if (!meta || Object.keys(meta).length === 0) return;
  lines.push('## Meta', '');
  for (const [key, val] of Object.entries(meta)) {
    lines.push(`- **${key}**: ${stringifyLeaf(val)}`);
  }
  lines.push('');
}

/**
 * @param {string[]} lines
 * @param {unknown} findings
 */
function appendFindingsSection(lines, findings) {
  lines.push('## Findings', '');
  const list = Array.isArray(findings) ? findings : [];
  if (list.length === 0) {
    lines.push('_No findings._', '');
    return;
  }
  for (const finding of list) {
    appendOneFinding(lines, finding);
  }
}

/**
 * @param {string[]} lines
 * @param {Record<string, unknown>} finding
 */
function appendOneFinding(lines, finding) {
  const title = finding.title ?? finding.id ?? 'Finding';
  const severity = finding.severity ? ` (${finding.severity})` : '';
  lines.push(`### ${title}${severity}`, '');
  if (finding.evidence != null) {
    lines.push('**Evidence**', '', fence(stringifyBlock(finding.evidence)), '');
  }
  if (finding.verdicts != null) {
    lines.push('**Verdicts**', '', fence(stringifyBlock(finding.verdicts)), '');
  }
  if (finding.fixes != null) {
    lines.push('**Fixes**', '', fence(stringifyBlock(finding.fixes)), '');
  }
  if (finding.verification != null) {
    lines.push('**Verification**', '', fence(stringifyBlock(finding.verification)), '');
  }
  if (finding.provenance != null || finding.howWeDecided != null) {
    const prov = finding.provenance ?? { howWeDecided: finding.howWeDecided };
    lines.push('**Provenance**', '', fence(stringifyBlock(prov)), '');
  }
  if (finding.scanner != null) {
    lines.push(`- **Scanner**: ${stringifyLeaf(finding.scanner)}`);
  }
  if (finding.weaknessIds != null) {
    lines.push(`- **Weakness IDs**: ${stringifyLeaf(finding.weaknessIds)}`);
  }
  lines.push('');
}

/**
 * @param {string[]} lines
 * @param {Record<string, unknown>|undefined} coverage
 */
function appendCoverageSection(lines, coverage) {
  lines.push('## Coverage', '');
  const cov = coverage && typeof coverage === 'object' ? coverage : {};
  const keys = [
    'repo',
    'commit',
    'discovered',
    'scanned',
    'failed',
    'skipped',
    'targets',
    'scanners',
    'statuses',
    'unsupportedReasons',
  ];
  for (const key of keys) {
    if (cov[key] === undefined) continue;
    lines.push(`- **${key}**: ${stringifyLeaf(cov[key])}`);
  }
  lines.push('');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringifyLeaf(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringifyBlock(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/**
 * @param {string} body
 * @returns {string}
 */
function fence(body) {
  return `\`\`\`\n${body}\n\`\`\``;
}
