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
  },
};
