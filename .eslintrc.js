module.exports = {
  env: {
    node: true,
    es2021: true,
    mocha: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
    semi: ['warn', 'always'],
    quotes: ['warn', 'single', { avoidEscape: true }],
    'no-multiple-empty-lines': ['warn', { max: 2 }],
    'eol-last': ['warn', 'always'],
    'comma-dangle': ['warn', 'never'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never']
  }
};
