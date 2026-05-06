import { getApiBaseUrl } from './utils/apiBaseUrl';

(globalThis as typeof globalThis & { __API_BASE_URL__?: string }).__API_BASE_URL__ =
  import.meta.env.VITE_API_URL || getApiBaseUrl();