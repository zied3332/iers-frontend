// src/services/users.service.ts
import axios from "axios";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

const BASE = getApiBaseUrl();

function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

// Keep for fetch-based JSON requests
function authHeaders() {
  const token = getToken();

  // ✅ Don't send "Bearer null"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle(res: Response) {
  const txt = await res.text();

  if (!res.ok) {
    let msg = "Erreur serveur";
    try {
      const j = JSON.parse(txt);
      const raw = Array.isArray(j.message) ? j.message.join(", ") : (j.message || j.error);
      if (typeof raw === "string") msg = raw;
    } catch {
      if (txt && txt.length < 150) msg = txt;
    }
    throw new Error(msg);
  }

  return txt ? JSON.parse(txt) : null;
}

export type User = {
  _id: string;
  name: string;
  email: string;
  role: "HR" | "SUPER_MANAGER" | "MANAGER" | "EMPLOYEE";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  status?: "ACTIVE" | "DISABLED" | string;
  department?: string;
  matricule?: string;
  telephone?: string;
  date_embauche?: string;
  en_ligne?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * ✅ Get the currently logged-in user
 * Backend endpoint in this project: POST /auth/profile
 */
export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("No token found. Please login.");

  const res = await fetch(`${BASE}/auth/profile`, {
    method: "POST",
    headers: authHeaders(),
  });

  // If token expired/invalid -> logout
  if (res.status === 401) logout();

  return handle(res);
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${BASE}/users`, { headers: authHeaders() });
  return handle(res);
}

export async function updateUserRole(userId: string, role: User["role"]) {
  const res = await fetch(`${BASE}/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  return handle(res);
}

export async function deleteUser(userId: string) {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle(res);
}

export type UpdateUserPayload = Partial<
  Pick<User, "name" | "email" | "role" | "department" | "matricule" | "telephone" | "date_embauche">
>;

export type CreateUserPayload = {
  name: string;
  email: string;
  password?: string;
  role: User["role"];
  avatarUrl?: string;
  matricule?: string;
  telephone?: string;
  date_embauche?: string;
};

// ✅ Create new user (HR)
export async function createUser(payload: CreateUserPayload) {
  const res = await fetch(`${BASE}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

// ✅ Update any user (HR)
export async function updateUser(userId: string, payload: UpdateUserPayload) {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: "PUT", // you can change to PATCH later if backend supports it
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function approveUserAccount(userId: string) {
  const res = await fetch(`${BASE}/users/${userId}/approve`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handle(res);
}

export async function rejectUserAccount(userId: string) {
  const res = await fetch(`${BASE}/users/${userId}/reject`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handle(res);
}

/* =========================================================
   ✅ Excel Import (Bulk create users)
   Backend expected: POST /users/import (multipart/form-data)
   Field name: "file"
   Returns: { created, skipped?, failed?, errors? }
   ========================================================= */

export type ImportUsersResult = {
  created: number;
  skipped?: number;
  failed?: number;
  // row is 1-based (Excel row). field optional.
  errors?: Array<{ row: number; field?: string; message: string }>;
};

export async function importUsersExcel(file: File): Promise<ImportUsersResult> {
  const token = getToken();
  if (!token) throw new Error("No token found. Please login.");

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await axios.post(`${BASE}/users/import`, form, {
      headers: {
        // ✅ don't set Content-Type manually (axios will set boundary)
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return res.data as ImportUsersResult;
  } catch (e: any) {
    // normalize axios error into Error(message) like handle()
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Import failed";
    throw new Error(Array.isArray(msg) ? msg.join(", ") : String(msg));
  }
}