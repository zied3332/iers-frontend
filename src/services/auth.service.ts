const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  department?: string;
  matricule: string;
  telephone: string;
  date_embauche: string;
}) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function loginUser(data: { email: string; password: string }) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res) as Promise<{
    access_token: string;
    user: { id: string; email: string; name: string; role: string };
  }>;
}

/* =========================================================
   ✅ ADDED FOR /profile (keep everything above unchanged)
   ========================================================= */

export type Role = "hr" | "manager" | "employee";

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  matricule?: string;
  telephone?: string;
  date_embauche?: string;
  en_ligne?: boolean;
  lastLogin?: string;
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function logout() {
  localStorage.removeItem("token");
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found. Please login.");

  // ✅ Backend endpoint for current user
  const res = await fetch(`${BASE}/users/me`, {
    method: "GET",
    headers: authHeaders(),
  });

  // optional: auto logout if token invalid
  if (res.status === 401) logout();

  return handle(res);
}