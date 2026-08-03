export default [
  {
    files: ['*.js'],
    ignores: ['test/**', 'tripwire-dashboard.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      complexity: ['warn', { max: 10, variant: 'modified' }],
    },
  },
];
