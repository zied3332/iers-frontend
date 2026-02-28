// src/pages/hr/users/components/EditForm.tsx
import React from "react";
import type { User } from "../../../services/users.service";
import type { EditableUser } from "../utils/types";
import { normalizeRole } from "../utils/normalizeRole";
import { S } from "../styles/users.styles";

function Label({ text }: { text: string }) {
  return (
    <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
      {text}
    </div>
  );
}

export function EditForm({
  value,
  onChange,
  onChangeRole,
}: {
  value: EditableUser;
  onChange: React.Dispatch<React.SetStateAction<EditableUser | null>>;
  onChangeRole: (role: User["role"]) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="card" style={{ padding: 12 }}>
        <div style={S.blockTitle}>Basic</div>

        <Label text="Name" />
        <input className="input" value={value.name} onChange={(e) => onChange((p) => (p ? { ...p, name: e.target.value } : p))} />

        <div style={{ height: 10 }} />

        <Label text="Email" />
        <input className="input" value={value.email} onChange={(e) => onChange((p) => (p ? { ...p, email: e.target.value } : p))} />

        <div style={{ height: 10 }} />

        <Label text="Role" />
        <select className="select" value={normalizeRole(value.role)} onChange={(e) => onChangeRole(normalizeRole(e.target.value))}>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
        </select>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={S.blockTitle}>Work</div>

        <Label text="Department" />
        <input className="input" value={value.department || ""} onChange={(e) => onChange((p) => (p ? { ...p, department: e.target.value } : p))} />

        <div style={{ height: 10 }} />

        <Label text="Hire date" />
        <input
          className="input"
          type="date"
          value={value.date_embauche ? String(value.date_embauche).slice(0, 10) : ""}
          onChange={(e) => onChange((p) => (p ? { ...p, date_embauche: e.target.value } : p))}
        />

        <div style={{ height: 10 }} />

        <Label text="Matricule" />
        <input className="input" value={value.matricule || ""} onChange={(e) => onChange((p) => (p ? { ...p, matricule: e.target.value } : p))} />

        <div style={{ height: 10 }} />

        <Label text="Telephone" />
        <input className="input" value={value.telephone || ""} onChange={(e) => onChange((p) => (p ? { ...p, telephone: e.target.value } : p))} />
      </div>
    </div>
  );
}