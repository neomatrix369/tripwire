// ESLint flat config — enforcement gate for security + complexity.
// Distinct from eslint.complexity.config.js which is warn-only for PR annotation.
import globals from 'globals';

export default [
  {
    files: ['*.js', 'test/**/*.js'],
    // support.js is a generated build artifact (dc-runtime/src/*.ts) — do not lint it.
    ignores: ['node_modules/**', 'coverage/**', 'tripwire-dashboard.config.js', 'support.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'complexity': ['error', 10],
      'max-depth': ['error', 4],
    },
  },
];
