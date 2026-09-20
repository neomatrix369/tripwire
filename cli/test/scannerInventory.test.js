/**
 * Tests for cli/src/scannerInventory.js.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: rollup rules, merge missing→not_run, format lines, expected sources by type
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedScannersFor,
  formatScannerInventory,
  inventoryForNotRun,
  mergeScannerInventory,
  rollupScannerInventory,
} from '../src/scannerInventory.js';

test('expectedScannersFor skill includes DepShield and Ossprey, excludes MCP-only', () => {
  const names = expectedScannersFor('skill');
  assert.ok(names.includes('DepShield'));
  assert.ok(names.includes('Ossprey'));
  assert.ok(names.includes('Cisco Skill Scanner: LLM-judge'));
  assert.ok(!names.includes('Cisco MCP Scanner: YARA'));
});

test('expectedScannersFor mcp includes MCP and both, excludes skill-only', () => {
  const names = expectedScannersFor('mcp_server');
  assert.ok(names.includes('Cisco MCP Scanner: YARA'));
  assert.ok(names.includes('DepShield'));
  assert.ok(!names.includes('Tessl: Lint'));
});

test('GWT-64.5: expectedScannersFor package is DepShield/Ossprey/Snyk/Cargo Audit', () => {
  const names = expectedScannersFor('package');
  assert.deepEqual(
    names.sort(),
    ['Cargo Audit', 'DepShield', 'Ossprey', 'Snyk'].sort(),
  );
  assert.ok(!names.some(n => n.startsWith('Cisco')));
  assert.ok(!names.some(n => n.startsWith('Tessl')));
});

test('rollup all completed is fully successful', () => {
  assert.equal(
    rollupScannerInventory([
      { scanner: 'Snyk', status: 'completed' },
      { scanner: 'DepShield', status: 'completed' },
    ]),
    'fully successful',
  );
});

test('rollup mix completed and skipped is partly successful', () => {
  assert.equal(
    rollupScannerInventory([
      { scanner: 'Snyk', status: 'completed' },
      { scanner: 'Ossprey', status: 'skipped_missing_credential' },
    ]),
    'partly successful',
  );
});

test('rollup zero completed is fully failed', () => {
  assert.equal(
    rollupScannerInventory([
      { scanner: 'Snyk', status: 'unreachable' },
      { scanner: 'Ossprey', status: 'skipped_missing_credential' },
    ]),
    'fully failed',
  );
});

test('rollup all not_run is not run', () => {
  assert.equal(
    rollupScannerInventory(inventoryForNotRun(null)),
    'not run',
  );
});

test('merge fills missing expected sources as not_run', () => {
  const inventory = mergeScannerInventory(
    ['DepShield', 'Ossprey'],
    [{ scanner_source: 'DepShield', status: 'completed' }],
  );
  assert.deepEqual(inventory, [
    { scanner: 'DepShield', status: 'completed' },
    { scanner: 'Ossprey', status: 'not_run' },
  ]);
});

test('formatScannerInventory includes rollup header and rows', () => {
  const text = formatScannerInventory(
    [
      { scanner: 'DepShield', status: 'completed' },
      { scanner: 'Ossprey', status: 'skipped_missing_credential' },
    ],
    { label: 'demo-skill' },
  );
  assert.match(text, /\[scanners\] demo-skill — partly successful/);
  assert.match(text, /DepShield: completed/);
  assert.match(text, /Ossprey: skipped_missing_credential/);
});
