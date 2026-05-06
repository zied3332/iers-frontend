type ApiBaseUrlScope = typeof globalThis & {
  __API_BASE_URL__?: string;
};

export function getApiBaseUrl() {
  const scope = globalThis as ApiBaseUrlScope;

  if (scope.__API_BASE_URL__) return scope.__API_BASE_URL__;

  return 'http://localhost:3000';
}