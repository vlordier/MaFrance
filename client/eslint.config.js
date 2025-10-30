import js from '@eslint/js';
import vue from 'eslint-plugin-vue';

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        CustomEvent: 'readonly',
        alert: 'readonly',
        btoa: 'readonly',
        Chart: 'readonly',
      }
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'error',
      'vue/no-unused-vars': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/require-v-for-key': 'error',
      'vue/no-use-v-if-with-v-for': 'error',
      'vue/no-unused-components': 'error',
      'vue/require-default-prop': 'warn',
      'vue/require-prop-types': 'warn',
      'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
      'vue/html-self-closing': ['error', { html: { void: 'never' }, svg: 'always', math: 'always' }],
      'vue/v-slot-style': ['error', { atComponent: 'v-slot', default: 'v-slot' }],
      'vue/html-indent': ['error', 2],
      'vue/multiline-html-element-content-newline': 'error',
      'vue/singleline-html-element-content-newline': 'error',
      'vue/attributes-order': 'error',
      'vue/attribute-hyphenation': 'error',
      'vue/v-on-event-hyphenation': 'error',
      'vue/html-quotes': ['error', 'double'],
      'vue/order-in-components': 'error',
      'no-dupe-keys': 'error',
      'vue/no-dupe-keys': 'error',
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-prototype-builtins': 'error',
      'no-case-declarations': 'error',
      'no-unreachable': 'error',
      'no-useless-escape': 'error',
      'vue/no-parsing-error': 'error',
      'vue/require-explicit-emits': 'warn',
    }
  }
];