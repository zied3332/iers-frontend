// src/pages/hr/users/utils/mappers.ts
import type { EditableUser } from "./types";
import { normalizeRole } from "./normalizeRole";

export function toEditable(u: any): EditableUser {
  return {
    _id: u._id,
    name: u.name ?? "",
    email: u.email ?? "",
    telephone: u.telephone ?? "",
    matricule: u.matricule ?? "",
    department: u.department ?? u.departement_id ?? "",
    date_embauche: u.date_embauche ?? "",
    role: normalizeRole(u.role),
    departement_id: u.departement_id,
    manager_id: u.manager_id,
    status: u.status,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
  };
}