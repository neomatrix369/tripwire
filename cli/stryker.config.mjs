// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  // Built-in command runner — works with `node --test` without extra packages
  testRunner: "command",
  commandRunner: {
    command: "node --test test/*.test.js",
  },
  // Mutate only production source, never test helpers or fixtures
  mutate: ["src/**/*.js", "!src/**/*.test.js"],
  // command runner doesn't support per-test coverage analysis
  coverageAnalysis: "off",
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
