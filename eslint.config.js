import js from '@eslint/js';
import security from 'eslint-plugin-security';
import { ESLINT_COMPLEXITY_LIMIT, ESLINT_MAX_PARAMS } from './constants.js';

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    plugins: {
      security: security
    },
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      'no-unused-vars': ['error', { 'vars': 'all', 'args': 'all', 'ignoreRestSiblings': false, 'argsIgnorePattern': '^_' }],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'no-shadow': 'error',
      'no-redeclare': 'error',
      'no-magic-numbers': ['error', { 'ignore': [0, 1, -1, 2, 3, 4, 5, 10, 50, 100, 500, 1000] }],
      'complexity': ['error', ESLINT_COMPLEXITY_LIMIT],
      'max-lines-per-function': ['error', 100],
      'max-params': ['error', ESLINT_MAX_PARAMS],
      'eqeqeq': 'error',
      'curly': 'error',
      'brace-style': ['error', '1tbs'],
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'no-multi-spaces': 'error',
      // Security-specific rules
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error'
    }
  }
  ,
  {
    // Node / server-side and scripts override: expose common Node globals and allow console
    files: [
      'setup/**',
      'routes/**',
      'services/**',
      'config/**',
      'middleware/**',
      'server.js',
      'setup.js'
    ],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      },
      parserOptions: {
        ecmaVersion: 2021
      }
    },
    rules: {
      // server scripts commonly use console for logging and rely on Node globals
      'no-console': 'off'
    }
  }
  ,
  {
    // Constants file override: allow CommonJS module
    files: ['constants.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        exports: 'readonly'
      }
    }
  }
  ,
  {
    // Browser files override: expose browser globals
    files: [
      'public/sw.js',
      'client/index.html'
    ],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        navigator: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        location: 'readonly',
        window: 'readonly',
        postMessage: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly'
      },
      parserOptions: {
        ecmaVersion: 2021
      }
    },
    rules: {
      // browser scripts commonly use console for debugging
      'no-console': 'off'
    }
  }
];