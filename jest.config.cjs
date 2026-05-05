module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['**/src/**/*.spec.ts', '**/src/**/*.spec.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        target: 'ES2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react-jsx',
        types: ['jest', 'node'],
      },
      diagnostics: false,
      // ✅ Remplace import.meta.env dans le code source
      stringReplacement: [
        {
          search: 'import\\.meta\\.env\\.VITE_API_URL',
          replace: '"http://localhost:3000"',
        },
      ],
    }],
  },

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],

  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
  ],
};