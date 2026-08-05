module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules', 'fixtures', 'prototypes', 'coverage'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Complexity enforcement — error mode so gate blocks.
    // eslint.complexity.config.js uses warn+modified variant for PR annotation; no conflict.
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
  },
};
