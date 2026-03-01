const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

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
  role: "HR" | "MANAGER" | "EMPLOYEE";
  department?: string;
  matricule?: string;
  telephone?: string;
  date_embauche?: string;
  en_ligne?: boolean;
  lastLogin?: string;
};

/**
 * ✅ Get the currently logged-in user
 * Backend recommended endpoint: GET /auth/me
 * If your backend uses /users/me instead, just change it here.
 */
export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("No token found. Please login.");

  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });

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
export type UpdateUserPayload = Partial<Pick<
  User,
  "name" | "email" | "role" | "department" | "matricule" | "telephone" | "date_embauche"
>>;

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
    method: "PUT", // ✅ use PATCH (recommended for partial updates)
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}