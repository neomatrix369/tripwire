/**
 * Tests for Workflow chrome polish (slice 76).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-76.1 shared panel typography; GWT-76.2 compact filter toolbars;
 *        GWT-76.3 filter group labels; GWT-76.4 plain-language override buttons
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(HERE, '..', 'Tripwire.dc.html');

function loadHtml() {
  return readFileSync(HTML_PATH, 'utf8');
}

test('GWT-76.1 given Workflow html when inspected then shared panel typography tokens exist', () => {
  /**
   * Scenario: All Workflow panels share display/sans/mono chrome classes.
   * Slice: 76 — shared panel typography
   *
   * Given Tripwire.dc.html Workflow chrome,
   * When CSS class definitions are inspected,
   * Then tw-panel-kicker / tw-panel-title / tw-panel-meta / tw-panel-body exist
   * with display or sans or mono font tokens as appropriate.
   */
  // -- Given --
  const html = loadHtml();

  // -- When / Then --
  assert.match(html, /\.tw-panel-kicker\s*\{[^}]*font-family:\s*var\(--font-sans\)/s,
    'panel kicker must use sans');
  assert.match(html, /\.tw-panel-title\s*\{[^}]*font-family:\s*var\(--font-display\)/s,
    'panel title must use display font');
  assert.match(html, /\.tw-panel-meta\s*\{[^}]*font-family:\s*var\(--font-mono\)/s,
    'panel meta must use mono');
  assert.match(html, /\.tw-panel-body\s*\{[^}]*font-family:\s*var\(--font-sans\)/s,
    'panel body must use sans');
});

test('GWT-76.1 given Workflow panels when rendered then each step uses shared chrome classes', () => {
  /**
   * Scenario: Run through Report panels consume shared chrome classes, not only Fix.
   * Slice: 76 — typography sync across six panels
   *
   * Given Workflow panel markup,
   * When each step panel is inspected,
   * Then Run/Triage/Investigate/Fix/Verify/Report reference tw-panel-* classes.
   */
  // -- Given --
  const html = loadHtml();

  // -- When --
  const panels = [
    { label: 'Run', aria: 'aria-label="Run progress"' },
    { label: 'Triage', aria: 'aria-label="Triage"' },
    { label: 'Investigate', aria: 'aria-label="Investigate"' },
    { label: 'Fix', aria: 'aria-label="Fix"' },
    { label: 'Verify', aria: 'aria-label="Verify"' },
    { label: 'Report', aria: 'aria-label="Report"' },
  ];

  // -- Then --
  for (const panel of panels) {
    const idx = html.indexOf(panel.aria);
    assert.ok(idx >= 0, `${panel.label} panel must exist`);
    const chunk = html.slice(idx, idx + 1800);
    assert.match(chunk, /tw-panel-(kicker|title|meta|body|filter-label)/,
      `${panel.label} panel must use shared tw-panel-* chrome`);
  }
});

test('GWT-76.2 given Triage filters when rendered then compact toolbar class is used', () => {
  /**
   * Scenario: Triage filter rows use denser shared toolbar chrome.
   * Slice: 76 — filter density
   *
   * Given Triage filter markup,
   * When CSS and tablists are inspected,
   * Then tw-filter-toolbar exists with tighter gap than legacy 8px triage tabs
   * and Triage tablists use that class.
   */
  // -- Given --
  const html = loadHtml();

  // -- When / Then --
  assert.match(html, /\.tw-filter-toolbar\s*\{[^}]*gap:\s*4px/s,
    'compact toolbar must use 4px gap');
  assert.match(html, /\.tw-filter-toolbar\s*\{[^}]*margin:\s*[0-4]px/s,
    'compact toolbar must use reduced vertical margin');
  const triageIdx = html.indexOf('aria-label="Triage"');
  const triageChunk = html.slice(triageIdx, triageIdx + 2500);
  assert.match(triageChunk, /class="tw-filter-toolbar"/,
    'Triage filter rows must use tw-filter-toolbar');
});

test('GWT-76.3 given Triage filter rows when rendered then group labels are visible', () => {
  /**
   * Scenario: Each Triage filter tablist has a text group label.
   * Slice: 76 — filter group labels
   *
   * Given Triage filter rows,
   * When markup is inspected,
   * Then Type / Quality / Target / Status labels appear as tw-panel-filter-label.
   */
  // -- Given --
  const html = loadHtml();
  const triageIdx = html.indexOf('aria-label="Triage"');
  const triageChunk = html.slice(triageIdx, triageIdx + 2500);

  // -- When / Then --
  for (const label of ['Type', 'Quality', 'Target', 'Status']) {
    assert.match(
      triageChunk,
      new RegExp(`tw-panel-filter-label[^>]*>\\s*${label}\\s*<`),
      `Triage must show ${label} group label`,
    );
  }
});

test('GWT-76.4 given Triage finding overrides when rendered then plain-language labels', () => {
  /**
   * Scenario: Override buttons use plain language, not snake_case status ids.
   * Slice: 76 — plain-language Triage buttons
   *
   * Given Triage finding override buttons,
   * When button labels are inspected,
   * Then labels are To fix / Needs review / Dismiss and handlers still set status ids.
   */
  // -- Given --
  const html = loadHtml();
  const triageIdx = html.indexOf('aria-label="Triage"');
  const nextPanel = html.indexOf('aria-label="Investigate"', triageIdx);
  const triageChunk = html.slice(triageIdx, nextPanel > triageIdx ? nextPanel : triageIdx + 8000);

  // -- When / Then --
  assert.match(triageChunk, />To fix</, 'override must say To fix');
  assert.match(triageChunk, />Needs review</, 'override must say Needs review');
  assert.match(triageChunk, />Dismiss</, 'override must say Dismiss');
  assert.doesNotMatch(triageChunk, />to_fix</, 'must not show snake_case to_fix as label');
  assert.doesNotMatch(triageChunk, />needs_review</, 'must not show snake_case needs_review as label');
  assert.doesNotMatch(triageChunk, />dismissed</, 'must not show snake_case dismissed as label');
  assert.match(html, /setWorkflowTriageStatus\(f\.id,\s*'to_fix'\)/,
    'handler must still set to_fix');
  assert.match(html, /setWorkflowTriageStatus\(f\.id,\s*'needs_review'\)/,
    'handler must still set needs_review');
  assert.match(html, /setWorkflowTriageStatus\(f\.id,\s*'dismissed'\)/,
    'handler must still set dismissed');
});
