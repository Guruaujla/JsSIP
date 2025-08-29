module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  root: true,
  env: { browser: true, es2020: true },
  ignorePatterns: ['dist'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error'
  }
};
