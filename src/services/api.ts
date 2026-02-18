const BASE = import.meta.env.VITE_API_URL;

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}