/**
 * Tests for tripwire-triage.js target type / quality / per-target filters.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-73.1 type filters; GWT-73.2 quality filters; GWT-73.3 per-target chips; GWT-73.4 compose with status
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTriageView, buildWorkflowFindingTitle } from '../tripwire-triage.js';

const FIXTURES = Object.freeze([
  {
    id: 'f-skill-high',
    severity: 'High',
    triageStatus: 'to_fix',
    itemId: 'i1',
    itemName: 'safe-csv-cleaner',
    itemType: 'skill',
    itemQuality: 88,
  },
  {
    id: 'f-skill-low',
    severity: 'Medium',
    triageStatus: 'needs_review',
    itemId: 'i3',
    itemName: 'vuln-prompt-injection-notes',
    itemType: 'skill',
    itemQuality: 61,
  },
  {
    id: 'f-skill-unscored',
    severity: 'Low',
    triageStatus: 'to_fix',
    itemId: 'i11',
    itemName: 'new-onboarding-helper',
    itemType: 'skill',
    itemQuality: null,
  },
  {
    id: 'f-mcp',
    severity: 'High',
    triageStatus: 'to_fix',
    itemId: 'i6',
    itemName: 'vuln-command-injection-server',
    itemType: 'mcp_server',
    itemQuality: null,
  },
  {
    id: 'f-pkg',
    severity: 'Medium',
    triageStatus: 'dismissed',
    itemId: 'p1',
    itemName: 'repo-root-package',
    itemType: 'package',
    itemQuality: null,
  },
]);

test('given mixed target findings when Skills type filter then only skill findings listed', () => {
  /**
   * Scenario: Type filter narrows Triage to one inventory target kind.
   * Slice: GWT-73.1
   *
   * Given findings from skills, MCP servers, and packages,
   * When the operator selects Skills on Triage,
   * Then only skill findings remain and status-tab counts reflect that set.
   */
  // -- Given / When --
  const view = buildTriageView({
    findings: FIXTURES,
    typeFilter: 'skill',
    qualityTab: 'all',
    triageFilter: 'all',
  });

  // -- Then --
  assert.deepEqual(
    view.filteredFindings.map((f) => f.id),
    ['f-skill-high', 'f-skill-low', 'f-skill-unscored'],
    'Skills type filter must drop MCP and package findings',
  );
  const allTab = view.tabs.find((t) => t.id === 'all');
  assert.equal(allTab.count, 3, 'status All count must use type-filtered set');
  assert.equal(view.typeTabs.find((t) => t.id === 'skill').selected, true);
});

test('given skill findings when quality high tab then only skills meeting floor plus MCP pass-through', () => {
  /**
   * Scenario: Quality tabs reuse inventory Tessl rules (skills only; non-skills pass).
   * Slice: GWT-73.2
   *
   * Given mixed skills and an MCP finding,
   * When Quality ≥ 80 is selected,
   * Then high-quality skills and non-skill targets remain; low/unscored skills drop.
   */
  // -- Given / When --
  const view = buildTriageView({
    findings: FIXTURES,
    typeFilter: 'all',
    qualityTab: 'high',
    triageFilter: 'all',
  });

  // -- Then --
  const ids = view.filteredFindings.map((f) => f.id);
  assert.ok(ids.includes('f-skill-high'), 'high-quality skill must remain');
  assert.ok(ids.includes('f-mcp'), 'MCP must pass through quality tabs');
  assert.ok(ids.includes('f-pkg'), 'package must pass through quality tabs');
  assert.ok(!ids.includes('f-skill-low'), 'low-quality skill must drop');
  assert.ok(!ids.includes('f-skill-unscored'), 'unscored skill must drop');
});

test('given multi-target findings when Triage renders then per-target chips include All and each target', () => {
  /**
   * Scenario: Per-target chips list distinct targets in the active type/quality scope.
   * Slice: GWT-73.3
   *
   * Given findings from multiple targets,
   * When Triage builds the view,
   * Then chips include All targets plus one chip per distinct itemId with counts.
   */
  // -- Given / When --
  const view = buildTriageView({
    findings: FIXTURES,
    typeFilter: 'all',
    qualityTab: 'all',
    triageFilter: 'all',
    targetFilter: 'all',
  });

  // -- Then --
  assert.equal(view.targetChips[0].id, 'all');
  assert.equal(view.targetChips[0].selected, true);
  const names = view.targetChips.slice(1).map((c) => c.label);
  assert.deepEqual(
    names.sort(),
    [
      'new-onboarding-helper',
      'repo-root-package',
      'safe-csv-cleaner',
      'vuln-command-injection-server',
      'vuln-prompt-injection-notes',
    ],
  );
  const mcpChip = view.targetChips.find((c) => c.id === 'i6');
  assert.equal(mcpChip.count, 1);
});

test('given two findings on same target when chips built then count is two', () => {
  /**
   * Scenario: Target chip counts aggregate multiple findings per itemId.
   * Slice: GWT-73.3
   *
   * Given two findings for one MCP target,
   * When Triage builds chips,
   * Then that chip count is 2.
   */
  // -- Given --
  const findings = [
    { ...FIXTURES[3], id: 'f-mcp-a' },
    { ...FIXTURES[3], id: 'f-mcp-b', severity: 'Low' },
  ];

  // -- When --
  const view = buildTriageView({
    findings,
    typeFilter: 'all',
    qualityTab: 'all',
    triageFilter: 'all',
  });

  // -- Then --
  assert.equal(view.targetChips.find((c) => c.id === 'i6').count, 2);
});

test('given target chip selected when status to_fix then filters compose', () => {
  /**
   * Scenario: Type, target, and status filters AND together; rows expose target name.
   * Slice: GWT-73.4
   *
   * Given an MCP target chip and To fix status,
   * When Triage filters,
   * Then only that target's to_fix findings remain with itemName set.
   */
  // -- Given / When --
  const view = buildTriageView({
    findings: FIXTURES,
    typeFilter: 'mcp_server',
    qualityTab: 'all',
    targetFilter: 'i6',
    triageFilter: 'to_fix',
  });

  // -- Then --
  assert.equal(view.filteredFindings.length, 1);
  assert.equal(view.filteredFindings[0].id, 'f-mcp');
  assert.equal(view.filteredFindings[0].itemName, 'vuln-command-injection-server');
  assert.equal(view.targetChips.find((c) => c.id === 'i6').selected, true);
  assert.equal(view.tabs.find((t) => t.id === 'to_fix').selected, true);
});

test('given dependency finding when buildWorkflowFindingTitle then package and CVE distinguish rows', () => {
  /**
   * Scenario: SCA findings share category; title uses package@ver · CVE instead.
   * Slice: GWT-73 uniqueness follow-up
   *
   * Given two dependency_vulnerability findings with different packages/CVEs,
   * When titles are built,
   * Then each title is distinct and does not collapse to the bare category.
   */
  // -- Given --
  const a = {
    category: 'dependency_vulnerability',
    package_name: 'lodash',
    package_version: '4.17.20',
    cve_ids: ['CVE-2021-23337'],
    message: 'lodash@4.17.20: CVE-2021-23337',
  };
  const b = {
    category: 'dependency_vulnerability',
    package_name: 'minimist',
    package_version: '0.0.8',
    cve_ids: ['CVE-2021-44906'],
  };

  // -- When --
  const titleA = buildWorkflowFindingTitle(a);
  const titleB = buildWorkflowFindingTitle(b);
  const bare = buildWorkflowFindingTitle({ category: 'dependency_vulnerability' });
  const fromMessage = buildWorkflowFindingTitle({
    category: 'dependency_vulnerability',
    message: 'unique advisory text for this package',
  });

  // -- Then --
  assert.equal(titleA, 'lodash@4.17.20 · CVE-2021-23337');
  assert.equal(titleB, 'minimist@0.0.8 · CVE-2021-44906');
  assert.notEqual(titleA, titleB);
  assert.equal(bare, 'dependency_vulnerability');
  assert.match(fromMessage, /unique advisory/);
  assert.equal(buildWorkflowFindingTitle(null), 'Finding');
});

test('given same package CVE in different lockfiles when titled then path distinguishes rows', () => {
  /**
   * Scenario: Monorepo SCA hits share package/CVE; file_path is the unique signal.
   *
   * Given braces@3.0.3 · same CVE under two package.json paths,
   * When titles are built,
   * Then each title includes its path so Triage rows are not identical.
   */
  // -- Given --
  const localWeb = {
    package_name: 'braces',
    package_version: '3.0.3',
    cve_ids: ['CVE-2026-93687'],
    file_path: 'packages/local-web/package.json',
  };
  const webCore = {
    ...localWeb,
    file_path: 'packages/web-core/package.json',
  };

  // -- When --
  const titleLocal = buildWorkflowFindingTitle(localWeb);
  const titleCore = buildWorkflowFindingTitle(webCore);

  // -- Then --
  assert.match(titleLocal, /packages\/local-web\/package\.json/);
  assert.match(titleCore, /packages\/web-core\/package\.json/);
  assert.notEqual(titleLocal, titleCore);
});

test('given identical SCA rows when buildTriageView then duplicates collapse with count', () => {
  /**
   * Scenario: Exact duplicate inserts must not spam Triage.
   *
   * Given three identical braces findings for one path,
   * When Triage builds,
   * Then one row remains with duplicateCount 3.
   */
  // -- Given --
  const base = {
    severity: 'High',
    triageStatus: 'to_fix',
    itemId: 'vk',
    itemName: 'vibe-kanban',
    itemType: 'package',
    package_name: 'braces',
    package_version: '3.0.3',
    cve_ids: ['CVE-2026-93687'],
    file_path: 'packages/local-web/package.json',
    scanner: 'Snyk',
    category: 'dependency_vulnerability',
  };
  const findings = [
    { ...base, id: 'a' },
    { ...base, id: 'b' },
    { ...base, id: 'c' },
  ];

  // -- When --
  const view = buildTriageView({
    findings,
    typeFilter: 'all',
    qualityTab: 'all',
    triageFilter: 'all',
  });

  // -- Then --
  assert.equal(view.filteredFindings.length, 1);
  assert.equal(view.filteredFindings[0].duplicateCount, 3);
  assert.equal(view.tabs.find((t) => t.id === 'to_fix').count, 1);
});
