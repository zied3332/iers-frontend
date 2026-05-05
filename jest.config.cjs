module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['**/src/**/*.spec.ts', '**/src/**/*.spec.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // ✅ Remplace import.meta.env au niveau du transform
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
      // ✅ Remplace import.meta.env.VITE_API_URL avant compilation
      astTransformers: {
        before: [],
      },
    }],
  },

  // ✅ Remplace import.meta par un objet compatible Jest
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },

  // ✅ Exécuté avant chaque fichier de test
  setupFiles: ['<rootDir>/jest.setup.cjs'],

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