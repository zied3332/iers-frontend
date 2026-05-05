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
        jsx: 'react-jsx'
      },
      diagnostics: false,
    }],
  },
  globals: {
    'import.meta': {
      env: { VITE_API_URL: 'http://localhost:3000' },
    },
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
  ],
};