// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "node-test-runner",
  // Mutate only production source, never test helpers or fixtures
  mutate: ["src/**/*.js", "!src/**/*.test.js"],
  // Discovered via node --test; Stryker will re-run per mutant
  coverageAnalysis: "perTest",
  // Kill threshold: 80% consistent with Python mutmut nightly budget
  thresholds: {
    high: 80,
    low: 60,
    break: 0, // warn but don't fail nightly build on first run
  },
  reporters: ["progress", "html", "json"],
  htmlReporter: {
    fileName: "reports/mutation/mutation-report.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation-report.json",
  },
  timeoutMS: 60000,
  concurrency: 4,
};

export default config;
