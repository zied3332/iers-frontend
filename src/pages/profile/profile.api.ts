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

export async function patchMe(payload: { telephone?: string; avatarUrl?: string }) {
  const res = await fetch(`${BASE}/users/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
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