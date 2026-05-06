module.exports = {
  testEnvironment: 'jsdom',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/services/activities.service.ts',
    'src/services/activityReviews.service.ts',
    'src/services/departments.service.ts',
    'src/services/domains.service.ts',
    'src/services/employee.service.ts',
    'src/services/notifications.service.ts',
    'src/services/post-activity-evaluations.service.ts',
    'src/services/users.service.ts',
  ],
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