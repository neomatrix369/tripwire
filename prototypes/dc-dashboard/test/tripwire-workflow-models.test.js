/**
 * Tests for slice-74 workflow model labels (defaults on tabs + actuals in panels).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-74.1 stepper defaults (role-aware soft-amend); GWT-74.2 Run actuals;
 *   GWT-74.3 Investigate/Fix; GWT-74.4 no invented models; GWT-74.5 / GWT-75.11
 *   parent-prefixed models line
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStepperView } from '../tripwire-workflow-stepper.js';
import {
  STAGE_DEFAULT_MODELS,
  buildModelsUsedLine,
  defaultModelHintForStep,
  formatModelHint,
} from '../tripwire-workflow-models.js';

test('GWT-74.1 given workflow chrome when stepper renders then modelHints are role-aware', () => {
  /**
   * Scenario: Stepper tabs show role-aware default model hints.
   * Slice: GWT-74.1 soft-amend
   *
   * Given the approved-repo workflow chrome,
   * When the stepper builds for currentStep=run,
   * Then Run/Triage/Investigate carry role labels; Fix/Verify/Report stay empty.
   */
  // -- Given / When --
  const { steps } = buildStepperView({ currentStep: 'run' });
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));

  // -- Then --
  assert.equal(
    byId.run.modelHint,
    'panel (light/mid): gen-4b · final (stronger): gen-27b',
  );
  assert.equal(byId.triage.modelHint, 'SIE triage: gen-4b');
  assert.match(byId.investigate.modelHint, /SIE/);
  assert.match(byId.investigate.modelHint, /Model Studio|MS/);
  assert.match(byId.investigate.modelHint, /gen-4b/);
  assert.match(byId.investigate.modelHint, /qwen3\.8-max/);
  assert.equal(byId.fix.modelHint, '', 'Fix tab stays blank until LLM propose is the default');
  assert.equal(byId.verify.modelHint, '');
  assert.equal(byId.report.modelHint, '');
  assert.deepEqual(STAGE_DEFAULT_MODELS.run, ['gen-4b', 'gen-27b']);
  assert.deepEqual(STAGE_DEFAULT_MODELS.fix, []);
});

test('GWT-74.2 given judge slots with modelIds when Run builds then modelsUsedLine lists role-labelled actuals', () => {
  /**
   * Scenario: Run panel prefers actual judge model IDs with panel vs final roles.
   * Slice: GWT-74.2 soft-amend
   *
   * Given judge slots and a final model,
   * When buildModelsUsedLine runs for step run,
   * Then the line distinguishes panel vs final in text.
   */
  // -- Given --
  const judges = {
    slots: [
      { slot: 'j1', modelId: 'gen-4b', status: 'done' },
      { slot: 'j2', model: 'gen-4b', status: 'done' },
      { slot: 'j3', modelId: 'gen-4b', status: 'done' },
    ],
    finalModel: 'gen-27b',
  };

  // -- When --
  const actual = buildModelsUsedLine({ stepId: 'run', judges });

  // -- Then --
  assert.equal(actual, 'Models used: panel: gen-4b · final: gen-27b');
});

test('GWT-74.2 given empty judge models when Run builds then falls back to role-aware default hint', () => {
  /**
   * Scenario: Run panel falls back to role-aware defaults when slots lack model fields.
   * Slice: GWT-74.2 soft-amend
   */
  // -- Given / When --
  const actual = buildModelsUsedLine({
    stepId: 'run',
    judges: { slots: [{ slot: 'j1', status: 'pending' }] },
  });

  // -- Then --
  assert.equal(
    actual,
    'Models (default): panel (light/mid): gen-4b · final (stronger): gen-27b',
  );
});

test('GWT-74.3 given finding with router models when Investigate builds then SIE/MS line shown', () => {
  /**
   * Scenario: Investigate shows actual router model IDs for the selected finding.
   * Slice: GWT-74.3
   */
  // -- Given --
  const finding = {
    models: { sie: 'gen-4b', model_studio: 'qwen3.8-max' },
    judgePanel: { slots: [{ slot: 'a', modelId: 'gen-27b' }] },
  };

  // -- When --
  const actual = buildModelsUsedLine({ stepId: 'investigate', finding });

  // -- Then --
  assert.match(actual, /Models used:/);
  assert.match(actual, /SIE=gen-4b · MS=qwen3\.8-max/);
  assert.match(actual, /judges: gen-27b/);
});

test('GWT-74.3 given LLM fix model when Fix builds then modelsUsedLine names that model', () => {
  /**
   * Scenario: Fix panel names the model that proposed the patch.
   * Slice: GWT-74.3
   */
  // -- Given / When --
  const actual = buildModelsUsedLine({
    stepId: 'fix',
    proposedFix: { source: 'generateFn', modelId: 'gen-27b', unifiedDiff: '--- a\n+++ b\n' },
  });

  // -- Then --
  assert.equal(actual, 'Models used: gen-27b');
});

test('GWT-74.3 given heuristic fix when Fix builds then no model line', () => {
  /**
   * Scenario: Heuristic fixes must not invent an LLM model ID or a fake "Models used" line.
   * Slice: GWT-74.3 / GWT-74.4
   */
  // -- Given / When --
  const actual = buildModelsUsedLine({
    stepId: 'fix',
    proposedFix: { source: 'heuristic', unifiedDiff: '--- a\n+++ b\n' },
  });

  // -- Then --
  assert.equal(actual, '');
  assert.equal(actual.includes('gen-27b'), false);
  assert.equal(actual.includes('heuristic'), false);
});

test('GWT-74.4 given verify step with no models when line builds then empty string', () => {
  /**
   * Scenario: Verify/Report omit model lines when unused.
   * Slice: GWT-74.4
   */
  // -- Given / When --
  const verify = buildModelsUsedLine({ stepId: 'verify' });
  const report = buildModelsUsedLine({ stepId: 'report' });

  // -- Then --
  assert.equal(verify, '');
  assert.equal(report, '');
  assert.equal(defaultModelHintForStep('verify'), '');
  assert.equal(formatModelHint([]), '');
});

test('GWT-74.5 / GWT-75.11 given finding with parent when models line builds then type·name prefix', () => {
  /**
   * Scenario: Models line is attributable to parent target when a finding is in context.
   * Slice: GWT-74.5 / GWT-75.11
   *
   * Given an Investigate finding with skill parent and router models,
   * When buildModelsUsedLine runs,
   * Then the line is prefixed with skill · name.
   */
  // -- Given --
  const finding = {
    itemType: 'skill',
    itemName: 'safe-csv-cleaner',
    models: { sie: 'gen-4b', model_studio: 'qwen3.8-max' },
  };

  // -- When --
  const actual = buildModelsUsedLine({ stepId: 'investigate', finding });

  // -- Then --
  assert.match(actual, /^skill · safe-csv-cleaner — /);
  assert.match(actual, /Models used:/);
  assert.match(actual, /SIE=gen-4b · MS=qwen3\.8-max/);
});
