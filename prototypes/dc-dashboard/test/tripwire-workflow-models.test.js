/**
 * Tests for slice-74 workflow model labels (defaults on tabs + actuals in panels).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-74.1 stepper defaults; GWT-74.2 Run actuals; GWT-74.3 Investigate/Fix;
 *   GWT-74.4 no invented models
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

test('GWT-74.1 given workflow chrome when stepper renders then modelHints match defaults SSOT', () => {
  /**
   * Scenario: Stepper tabs show configured default model aliases.
   * Slice: GWT-74.1
   *
   * Given the approved-repo workflow chrome,
   * When the stepper builds for currentStep=run,
   * Then Run/Triage/Investigate/Fix carry default hints and Verify/Report are empty.
   */
  // -- Given / When --
  const { steps } = buildStepperView({ currentStep: 'run' });
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));

  // -- Then --
  assert.equal(byId.run.modelHint, 'gen-4b · gen-27b');
  assert.equal(byId.triage.modelHint, 'gen-4b');
  assert.equal(byId.investigate.modelHint, 'gen-4b · qwen3.8-max');
  assert.equal(byId.fix.modelHint, 'gen-27b');
  assert.equal(byId.verify.modelHint, '');
  assert.equal(byId.report.modelHint, '');
  assert.deepEqual(STAGE_DEFAULT_MODELS.run, ['gen-4b', 'gen-27b']);
});

test('GWT-74.2 given judge slots with modelIds when Run builds then modelsUsedLine lists actuals', () => {
  /**
   * Scenario: Run panel prefers actual judge model IDs over defaults.
   * Slice: GWT-74.2
   *
   * Given judge slots that record modelId,
   * When buildModelsUsedLine runs for step run,
   * Then the line lists distinct actual IDs.
   */
  // -- Given --
  const judges = {
    slots: [
      { slot: 'j1', modelId: 'gen-4b', status: 'done' },
      { slot: 'j2', model: 'gen-27b', status: 'done' },
      { slot: 'j3', modelId: 'gen-4b', status: 'done' },
    ],
  };

  // -- When --
  const actual = buildModelsUsedLine({ stepId: 'run', judges });

  // -- Then --
  assert.equal(actual, 'Models used: gen-4b · gen-27b');
});

test('GWT-74.2 given empty judge models when Run builds then falls back to default hint', () => {
  /**
   * Scenario: Run panel falls back to defaults when slots lack model fields.
   * Slice: GWT-74.2
   */
  // -- Given / When --
  const actual = buildModelsUsedLine({
    stepId: 'run',
    judges: { slots: [{ slot: 'j1', status: 'pending' }] },
  });

  // -- Then --
  assert.equal(actual, 'Models (default): gen-4b · gen-27b');
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

test('GWT-74.3 given heuristic fix when Fix builds then no invented model alias', () => {
  /**
   * Scenario: Heuristic fixes must not invent an LLM model ID.
   * Slice: GWT-74.3 / GWT-74.4
   */
  // -- Given / When --
  const actual = buildModelsUsedLine({
    stepId: 'fix',
    proposedFix: { source: 'heuristic', unifiedDiff: '--- a\n+++ b\n' },
    fallbackToDefaults: false,
  });

  // -- Then --
  assert.equal(actual, 'Models used: heuristic (no LLM)');
  assert.equal(actual.includes('gen-27b'), false);
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
