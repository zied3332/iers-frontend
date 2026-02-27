// src/services/auth.service.ts
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ApiError = Error & { status?: number };

async function handle(res: Response) {
  if (!res.ok) {
    const txt = await res.text();

    let message = txt || "Request failed";
    try {
      const j = JSON.parse(txt);
      message = Array.isArray(j.message) ? j.message.join(", ") : (j.message || j.error || message);
    } catch {
      // keep message as txt
    }

    const err: ApiError = new Error(message);
    err.status = res.status; // ✅ keep status (401 vs 403)
    throw err;
  }

  // Some endpoints may return empty body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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

/**
 * POST /auth/forgot-password
 * Demande d'envoi d'un email avec lien de réinitialisation.
 */
export async function requestPasswordReset(email: string) {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  return handle(res);
}

/**
 * POST /auth/reset-password
 * Réinitialise le mot de passe avec le token reçu par email.
 */
export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword: newPassword.trim() }),
  });
  return handle(res);
}

export type Role = "HR" | "MANAGER" | "EMPLOYEE";

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

/**
 * POST /auth/profile
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const token = localStorage.getItem("token");
  if (!token) {
    const err: ApiError = new Error("No token found. Please login.");
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${BASE}/auth/profile`, {
    method: "POST",
    headers: authHeaders(),
  });

  // ✅ IMPORTANT: distinguish 401 vs 403
  if (res.status === 401) {
    logout();
    // optional: redirect to login
    // window.location.href = "/auth/login";
  }

  if (res.status === 403) {
    // DO NOT logout
    // redirect to an Access Denied page
    window.location.href = "/403";
    // still throw so callers know request failed
  }

  return handle(res);
}