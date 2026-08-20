/**
 * Tests for Tripwire.dc.html visual token contract (slice 43).
 *
 * Author: swami
 * Created: 2026-08-20
 * Scope: FolderGate cream/tan × Tripwire HUD — :root tokens, CTA vs signal, display font
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'Tripwire.dc.html'),
  'utf8',
);

test('given Tripwire.dc.html when parsed then paper field tokens are present', () => {
  // -- Given / When / Then --
  assert.match(html, /--bg-base:\s*#F5F2EA/i, 'GWT-43.1: cream paper --bg-base');
  assert.match(html, /--cta:\s*#C4A574/i, 'GWT-43.2: tan CTA token');
  assert.match(html, /--signal:\s*#00D9FF/i, 'GWT-43.2: cyan remains signal-only');
  assert.match(html, /--font-display:\s*'Fraunces'/i, 'GWT-43.3: serif display face');
  assert.match(html, /family=Fraunces/i, 'GWT-43.3: Fraunces loaded from Google Fonts');
});

test('given hero CTA markup when scanned then uses cta fill not cyan fill', () => {
  // -- Given / When --
  const openDashboardButtons = [...html.matchAll(/<button[^>]*background:var\(--cta\);color:#1C1915[^>]*>[\s\S]*?Open Dashboard/g)];

  // -- Then --
  assert.ok(openDashboardButtons.length >= 1, 'GWT-43.2: Open Dashboard primary uses --cta + charcoal label');
  assert.doesNotMatch(
    html,
    /background:var\(--accent\);color:#031017[\s\S]{0,200}Open Dashboard/,
    'GWT-43.5: no leftover dark-on-cyan Open Dashboard fill',
  );
});

test('given hardcoded styles when scanned then cyan is not used as chrome button fill defaults', () => {
  // -- Given / When / Then --
  assert.doesNotMatch(
    html,
    /activeBorder\|\|'#00D9FF'/,
    'GWT-43.5: btnStyle default active border is not cyan',
  );
  assert.match(
    html,
    /activeBorder\|\|'#C4A574'/,
    'GWT-43.5: btnStyle default active border is tan',
  );
  assert.match(
    html,
    /running:\s*\{\s*color:\s*'#00D9FF'/,
    'GWT-43.2: scanning/running status may keep signal cyan',
  );
});
