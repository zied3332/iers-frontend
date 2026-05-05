module.exports = {
  testEnvironment: 'jsdom',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
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
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/main.tsx',
    '!**/*.d.ts'
  ],
  coverageDirectory: '../coverage',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '../test-results',
      outputName: 'junit.xml',
    }],
  ],
};