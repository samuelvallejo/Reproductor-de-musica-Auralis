import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/test-results/**', '**/playwright-report/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    files: ['apps/**/src/**/*.ts', 'apps/**/src/**/*.tsx', 'packages/playlist-core/src/**/*.ts'],
    ignores: ['**/*.test.ts', 'packages/playlist-core/src/persistence.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'NewExpression[callee.name="Map"]', message: 'Use our own StringMap for application collections.' },
        { selector: 'NewExpression[callee.name="Set"]', message: 'Use our own LinkedSet for application collections.' },
        { selector: 'NewExpression[callee.name="Array"]', message: 'Use our own LinkedSequence for application collections.' },
        { selector: 'VariableDeclarator > ArrayExpression', message: 'Keep application lists in LinkedSequence; encode arrays only at transport boundaries.' },
        { selector: 'CallExpression[callee.object.name="Array"][callee.property.name="from"]', message: 'Use LinkedSequence.from instead of an array-backed collection.' },
      ],
    },
  },
);
