import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/no-unescaped-entities': 'warn',
      'react/prop-types': 'warn',
      'react/no-deprecated': 'warn',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/'],
  },
];
