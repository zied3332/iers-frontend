// jest.setup.cjs
// Simule import.meta.env pour Jest (qui ne supporte pas nativement import.meta)
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000',
        MODE: 'test',
        DEV: false,
        PROD: false,
      },
    },
  },
  writable: true,
  configurable: true,
});