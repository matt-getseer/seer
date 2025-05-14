import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    ignores: ['**/generated/**', '**/dist/**', '**/node_modules/**', '**/prisma/**']
  },
  js.configs.recommended,
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off'
    }
  }
]; 