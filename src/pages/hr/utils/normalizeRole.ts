// src/pages/hr/users/utils/normalizeRole.ts
import type { User } from "../../../services/users.service";

export function normalizeRole(r: any): User["role"] {
  const x = String(r || "").toUpperCase();
  if (x === "HR") return "HR";
  if (x === "MANAGER") return "MANAGER";
  return "EMPLOYEE";
}