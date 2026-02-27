// src/pages/profile.api.ts
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const txt = await res.text();
    try {
      const j = JSON.parse(txt);
      throw new Error(Array.isArray(j.message) ? j.message.join(", ") : j.message);
    } catch {
      throw new Error(txt || "Request failed");
    }
  }
  return res.json();
}

const PROFILE_UPDATE_PATH = import.meta.env.VITE_PROFILE_UPDATE_PATH as string | undefined;

export async function patchMe(payload: { telephone?: string; avatarUrl?: string }) {
  const pathsToTry = PROFILE_UPDATE_PATH
    ? [PROFILE_UPDATE_PATH]
    : ["/users/me", "/auth/profile", "/auth/me", "/profile"];

  let lastError: Error | null = null;
  for (const path of pathsToTry) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) return (await res.json().catch(() => ({}))) ?? {};
      if (res.status === 404) {
        lastError = new Error(`Cannot PATCH ${path}`);
        continue;
      }
      const txt = await res.text();
      let msg = txt;
      try {
        const j = JSON.parse(txt);
        msg = Array.isArray(j.message) ? j.message.join(", ") : (j.message || j.error || txt);
      } catch {
        /* use txt */
      }
      throw new Error(msg);
    } catch (e: any) {
      if (e?.message?.includes("Cannot PATCH") || e?.message?.includes("404")) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error("Cannot update profile (no endpoint available).");
}

export async function patchUserById(userId: string, payload: any) {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function changeMyPassword(payload: { currentPassword: string; newPassword: string }) {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}