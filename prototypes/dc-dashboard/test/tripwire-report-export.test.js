/**
 * Tests for tripwire-report-export.js (GWT-71.2 report export serializer).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: maskSecrets default/reveal; buildReportPayload evidence/verdicts/provenance/coverage;
 *   serializeReportJson / serializeReportMarkdown non-empty with Coverage section
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maskSecrets,
  buildReportPayload,
  serializeReportJson,
  serializeReportMarkdown,
} from '../tripwire-report-export.js';

const SECRET_SNIPPET = 'Authorization: Bearer sk-ant-abcdefghijklmnopqrstuv';
const API_KEY_LINE = 'api_key=sk-abcdefghijklmnopqrstuv';

const SAMPLE_FINDING = {
  id: 'f-sqli-1',
  title: 'SQL injection in login',
  severity: 'High',
  triageStatus: 'to_fix',
  evidenceHighlight: `query = "SELECT * FROM users WHERE id=" + id; ${SECRET_SNIPPET}`,
  message: API_KEY_LINE,
  snippet: SECRET_SNIPPET,
  source: 'login.js:42',
  sink: 'db.query',
  verdictLine: 'Likely exploitable with crafted id.',
  agreement: '2 of 3 agree',
  fixes: { suggestion: 'Use parameterized queries' },
  evidenceVerification: 'Confirmed in unit fixture',
  evidence_status: 'evidence_verified',
  independently_confirmed: true,
  howWeDecided: {
    judges: [{ slot: 'j1', verdict: 'true_positive' }],
    final: 'true_positive',
    rawIds: ['judge-raw-aaa'],
  },
  scanner: 'semgrep',
  weaknessIds: ['CWE-89'],
  aiSecIds: ['AML.T0043'],
};

const SAMPLE_COVERAGE = {
  repo: 'acme/app',
  commit: 'abc1234',
  discovered: 10,
  scanned: 8,
  failed: 1,
  skipped: 1,
  targets: [{ path: 'src/login.js', status: 'scanned' }],
  scanners: [{ id: 'semgrep', status: 'ok' }, { id: 'gap-x', status: 'unsupported', reason: 'lang' }],
  unsupportedReasons: ['gap-x: lang'],
};

test('GWT-71.2 given secret text when maskSecrets default then secrets masked', () => {
  // -- Given --
  const text = SECRET_SNIPPET;

  // -- When --
  const actual = maskSecrets(text);

  // -- Then --
  assert.equal(actual.masked, true, 'masked flag must be true by default');
  assert.doesNotMatch(actual.text, /sk-ant-abcdefghijklmnopqrstuv/, 'raw secret must not appear');
  assert.match(actual.text, /REDACTED/i, 'redaction marker required');
});

test('GWT-71.2 given revealSecrets true when buildReportPayload then secrets revealed', () => {
  // -- Given --
  const findings = [SAMPLE_FINDING];

  // -- When --
  const actual = buildReportPayload({
    findings,
    coverage: SAMPLE_COVERAGE,
    meta: { repo: 'acme/app', commit: 'abc1234', exportedAt: '2026-09-20T12:00:00Z' },
    revealSecrets: true,
  });

  // -- Then --
  const blob = JSON.stringify(actual);
  assert.match(blob, /sk-ant-abcdefghijklmnopqrstuv/, 'revealSecrets must preserve Bearer/sk tokens');
  assert.match(blob, /api_key=sk-abcdefghijklmnopqrstuv/, 'revealSecrets must preserve api_key lines');
});

test('GWT-71.2 given finished triage when buildReportPayload then evidence verdicts provenance coverage', () => {
  // -- Given --
  const findings = [SAMPLE_FINDING];
  const coverage = SAMPLE_COVERAGE;
  const meta = { repo: 'acme/app', commit: 'abc1234', exportedAt: '2026-09-20T12:00:00Z' };

  // -- When --
  const actual = buildReportPayload({ findings, coverage, meta });

  // -- Then --
  assert.equal(actual.meta.repo, 'acme/app');
  assert.equal(actual.meta.commit, 'abc1234');
  assert.ok(actual.findings.length === 1, 'one finding exported');

  const finding = actual.findings[0];
  assert.ok(finding.evidence, 'evidence required');
  assert.ok(finding.verdicts, 'verdicts required');
  assert.ok(finding.fixes, 'fixes required when present');
  assert.ok(finding.verification, 'verification required');
  assert.ok(finding.provenance || finding.howWeDecided, 'provenance/howWeDecided required');
  assert.equal(finding.scanner, 'semgrep');
  assert.deepEqual(finding.weaknessIds, ['CWE-89']);

  const blob = JSON.stringify(finding);
  assert.doesNotMatch(blob, /sk-ant-abcdefghijklmnopqrstuv/, 'secrets masked by default in findings');
  assert.match(blob, /REDACTED/i);

  assert.equal(actual.coverage.discovered, 10);
  assert.equal(actual.coverage.scanned, 8);
  assert.equal(actual.coverage.failed, 1);
  assert.equal(actual.coverage.skipped, 1);
  assert.ok(actual.coverage.targets, 'coverage targets when provided');
  assert.ok(actual.coverage.scanners, 'coverage scanners when provided');
  assert.ok(actual.coverage.unsupportedReasons, 'unsupported reasons when provided');
});

test('GWT-71.2 given payload when serializeReportJson and Markdown then non-empty with Coverage', () => {
  // -- Given --
  const payload = buildReportPayload({
    findings: [SAMPLE_FINDING],
    coverage: SAMPLE_COVERAGE,
    meta: { repo: 'acme/app', commit: 'abc1234' },
  });

  // -- When --
  const json = serializeReportJson(payload);
  const md = serializeReportMarkdown(payload);

  // -- Then --
  assert.ok(json.length > 0, 'JSON serializer must be non-empty');
  assert.match(json, /"coverage"/, 'JSON must include coverage');
  assert.match(json, /"discovered"/);

  assert.ok(md.length > 0, 'Markdown serializer must be non-empty');
  assert.match(md, /## Coverage/, 'Markdown must include Coverage section');
  assert.match(md, /## Findings/, 'Markdown must include Findings section');
  assert.match(md, /discovered/i);
  assert.doesNotMatch(md, /sk-ant-abcdefghijklmnopqrstuv/, 'Markdown must keep secrets masked');
});
