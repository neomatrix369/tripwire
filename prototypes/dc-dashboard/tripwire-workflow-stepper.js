/**
 * Slice 68 Stream A — workflow stepper (pure view model).
 * Steps: Run → Triage → Investigate → Fix → Verify → Report.
 * stateLabel is text status (not colour-only): current | complete | upcoming.
 */

export const WORKFLOW_STEPS = Object.freeze([
  Object.freeze({ id: "run", label: "Run" }),
  Object.freeze({ id: "triage", label: "Triage" }),
  Object.freeze({ id: "investigate", label: "Investigate" }),
  Object.freeze({ id: "fix", label: "Fix" }),
  Object.freeze({ id: "verify", label: "Verify" }),
  Object.freeze({ id: "report", label: "Report" }),
]);

/**
 * @param {number} index
 * @param {number} currentIndex
 * @returns {'current'|'complete'|'upcoming'}
 */
function stateLabelFor(index, currentIndex) {
  if (index === currentIndex) return "current";
  if (index < currentIndex) return "complete";
  return "upcoming";
}

/**
 * @param {{ currentStep: string }} state
 * @returns {{ steps: Array<{ id: string, label: string, current: boolean, stateLabel: string }> }}
 */
export function buildStepperView({ currentStep }) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);
  const steps = WORKFLOW_STEPS.map((step, index) => ({
    id: step.id,
    label: step.label,
    current: index === currentIndex,
    stateLabel: stateLabelFor(index, currentIndex),
  }));
  return { steps };
}
