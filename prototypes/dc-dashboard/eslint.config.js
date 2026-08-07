// ESLint flat config — security and baseline-quality checks for the prototype dashboard.
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
    },
  },
];
