// ESLint flat config (ESLint 9+) — enforcement gate for security + complexity.
// Distinct from eslint.complexity.config.js which is warn-only for PR annotation.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'test/**/*.js', 'bin/**/*.js'],
    ignores: ['node_modules/**', 'coverage/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Security — block eval-family APIs that enable code injection
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'complexity': ['error', 10],
      'max-depth': ['error', 4],
    },
  },
];
