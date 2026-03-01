// src/pages/hr/users/utils/types.ts
import type { User } from "../../../services/users.service";

export type EditableUser = Pick<
  User,
  "_id" | "name" | "email" | "telephone" | "matricule" | "department" | "date_embauche" | "role"
> & {
  departement_id?: string;
  manager_id?: string;
  status?: string;
  isActive?: boolean;
  emailVerified?: boolean;
};