// src/__mocks__/setup.ts

// Injecte import.meta globalement AVANT que Jest charge les modules
(globalThis as any).importMetaEnv = {
  VITE_API_URL: 'http://localhost:3000',
};