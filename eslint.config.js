import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'temp/**', 'output/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
  // Prettier disables `curly` by default; re-enable after it — compatible with Prettier when using "all".
  {
    files: ['**/*.js'],
    rules: {
      curly: ['error', 'all'],
    },
  },
];
