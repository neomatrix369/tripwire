export default [
  {
    files: ['src/**/*.js', 'bin/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      complexity: ['warn', { max: 10, variant: 'modified' }],
    },
  },
];
