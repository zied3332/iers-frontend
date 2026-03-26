const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
}

async function handle(res: Response) {
  if (!res.ok) {
    const txt = await res.text();
    const message = txt || "Request failed";
    const err: Error & { status?: number } = new Error(message);
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getAllDepartments(): Promise<Department[]> {
  const res = await fetch(`${BASE}/departments`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handle(res);
}

export async function createDepartment(data: {
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
}): Promise<Department> {
  const res = await fetch(`${BASE}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateDepartment(
  id: string,
  data: {
    name?: string;
    code?: string;
    description?: string;
    manager_id?: string;
  }
): Promise<Department> {
  const res = await fetch(`${BASE}/departments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteDepartment(id: string): Promise<void> {
  const res = await fetch(`${BASE}/departments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  await handle(res);
}
