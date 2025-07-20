module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  ignorePatterns: [
    'js/vendor/**/*',
    'js/polyfills/**/*',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Relax some strict rules for the migration
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
      ts: 'never',
    }],
    'import/no-unresolved': 'off', // Turn off until we fix all imports
    'no-unused-vars': 'warn', // Make this a warning instead of error
    'class-methods-use-this': 'warn',
    'max-len': ['error', { code: 120 }], // Increase line length limit
    'no-param-reassign': 'warn',
    'func-names': 'warn',
    'no-shadow': 'warn',
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      rules: {
        // TypeScript specific rules
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        
        // Turn off conflicting rules
        'no-unused-vars': 'off', // Use TypeScript version instead
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'warn',
        
        // Relax import rules for TypeScript
        'import/extensions': ['error', 'ignorePackages', {
          js: 'never',
          ts: 'never',
        }],
        'import/no-unresolved': 'off',
        
        // Relax style rules during migration
        'max-len': ['warn', { code: 150 }], // Increase line length temporarily
        'no-param-reassign': 'warn',
        'class-methods-use-this': 'warn',
        'func-names': 'warn',
        'no-underscore-dangle': 'warn', // Allow private members with _
        'camelcase': 'warn', // Allow some legacy naming
        'no-plusplus': 'off', // Allow ++ operator
        'consistent-return': 'warn',
        'no-bitwise': 'off', // Allow bitwise operations
        'no-restricted-syntax': 'off', // Allow for..in loops
        'guard-for-in': 'warn',
        'no-loop-func': 'warn',
        'no-console': 'warn', // Allow console statements for debugging
        'no-continue': 'warn', // Allow continue statements  
        'no-unreachable': 'warn', // Allow unreachable code temporarily
        'eqeqeq': 'warn', // Allow == comparisons temporarily
        'prefer-destructuring': 'warn', // Allow non-destructuring
        'default-case': 'warn', // Allow switch without default
        'no-return-assign': 'warn', // Allow return assignments
        'no-constant-condition': 'warn', // Allow constant conditions
        'import/no-extraneous-dependencies': 'warn', // Allow dev deps in source
        'no-nested-ternary': 'off',
        'import/prefer-default-export': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
};