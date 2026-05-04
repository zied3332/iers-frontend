// jest.config.ts
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        target: 'ES2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      diagnostics: false,
    }],
  },
  // ✅ Remplace import.meta.env par un objet simple
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    'import.meta': {
      env: {
        VITE_API_URL: 'http://localhost:3000',
      },
    },
  },
  testRegex: '.*\\.spec\\.ts$',
};