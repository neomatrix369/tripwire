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
import { STATUS_META } from '../tripwire-status.js';

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
    /running:\s*\{\s*color:\s*'#0E7490'/,
    'GWT-43.6: scanning/running *text* uses signal-ink, not neon cyan',
  );
});

const INK = {
  muted: '#6B645A',
  cta: '#7A5C2E',
  red: '#B42318',
  amber: '#8B5A00',
  green: '#0F766E',
  signal: '#0E7490',
  violet: '#6D28D9',
};

function rootToken(name) {
  const m = html.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  return m ? m[1].toUpperCase() : null;
}

test('given paper field when :root is read then ink tokens meet AA hex contract', () => {
  // -- Given / When / Then --
  assert.equal(rootToken('text-muted'), INK.muted, 'GWT-43.7: muted ink');
  assert.equal(rootToken('cta-ink'), INK.cta, 'GWT-43.7: link ink');
  assert.equal(rootToken('red-ink'), INK.red, 'GWT-43.6: red ink');
  assert.equal(rootToken('amber-ink'), INK.amber, 'GWT-43.6: amber ink');
  assert.equal(rootToken('green-ink'), INK.green, 'GWT-43.6: green ink');
  assert.equal(rootToken('signal-ink'), INK.signal, 'GWT-43.6: signal ink');
  assert.equal(rootToken('violet-ink'), INK.violet, 'GWT-43.8: error ink');
});

test('given intro chrome when scanned then logo and links use AA ink not tan fill', () => {
  // -- Given / When / Then --
  assert.match(html, /a \{ color: var\(--cta-ink\)/, 'GWT-43.7: links use --cta-ink');
  assert.match(
    html,
    /letter-spacing:0\.08em;color:var\(--text-primary\);margin-right:16px/,
    'GWT-43.7: TRIPWIRE wordmark is charcoal',
  );
  assert.doesNotMatch(
    html,
    /span style="color:var\(--cta\)">unreviewed code/,
    'GWT-43.9: hero emphasis is not tan fill as text',
  );
});

test('given glow and hover when scanned then cream is not blown out', () => {
  // -- Given / When / Then --
  assert.doesNotMatch(
    html,
    /\.stat-card\.risk \.stat-num \{[^}]*text-shadow/,
    'GWT-43.10: no neon text-shadow on risk stat numbers',
  );
  assert.doesNotMatch(
    html,
    /filter:\s*brightness\(1\.12\)/,
    'GWT-43.10: no brightness(1.12) hover on cream',
  );
});

test('given STATUS_META when compared to :root then ink hexes bind', () => {
  // -- Given / When / Then --
  assert.equal(STATUS_META.red.color.toUpperCase(), INK.red, 'GWT-43.8: red');
  assert.equal(STATUS_META.amber.color.toUpperCase(), INK.amber, 'GWT-43.8: amber');
  assert.equal(STATUS_META.green.color.toUpperCase(), INK.green, 'GWT-43.8: green');
  assert.equal(STATUS_META.running.color.toUpperCase(), INK.signal, 'GWT-43.8: running');
  assert.equal(STATUS_META.error.color.toUpperCase(), INK.violet, 'GWT-43.8: error');
  assert.equal(STATUS_META.grey.color.toUpperCase(), INK.muted, 'GWT-43.8: grey');
});

test('given neon fills when scanned then they are not used as color: text', () => {
  // CSS `color:` only — not dotColor/textColor/activeColor property names
  const cssColor = String.raw`(?<![a-zA-Z-])color:\s*`;
  // -- Given / When / Then --
  assert.doesNotMatch(html, new RegExp(`${cssColor}#FFB020`, 'i'), 'GWT-43.9: amber fill not text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}#34D399`, 'i'), 'GWT-43.9: green fill not text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}#00D9FF`, 'i'), 'GWT-43.9: cyan fill not text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}#C4A574`, 'i'), 'GWT-43.9: tan fill not text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}'#f43f5e'`, 'i'), 'GWT-43.9: old rose not status text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}'#f59e0b'`, 'i'), 'GWT-43.9: old amber not status text');
  assert.doesNotMatch(html, new RegExp(`${cssColor}'#4da2ff'`, 'i'), 'GWT-43.9: old scanning blue not text');
  assert.doesNotMatch(html, /color:var\(--red\)(?!-ink)/, 'GWT-43.6: text uses --red-ink');
  assert.doesNotMatch(html, /color:var\(--amber\)(?!-ink)/, 'GWT-43.6: text uses --amber-ink');
  assert.doesNotMatch(html, /color:var\(--green\)(?!-ink)/, 'GWT-43.6: text uses --green-ink');
  assert.doesNotMatch(html, /color:var\(--signal\)(?!-ink)/, 'GWT-43.6: text uses --signal-ink');
  assert.doesNotMatch(html, /color:var\(--cta\)(?!-ink)/, 'GWT-43.7: text uses --cta-ink');
});
