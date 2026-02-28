// src/pages/hr/users/components/UserDetailsGrid.tsx
import React from "react";
import { UserAvatar } from "./UserAvatar";
import { Pill } from "./Pill";
import { normalizeRole } from "../utils/normalizeRole";
import { fmtDate, fmtDateTime } from "../utils/formatters";
import { S } from "../styles/users.styles";

export function UserDetailsGrid({ user }: { user: any }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
        <UserAvatar name={user.name} email={user.email} avatarUrl={user.avatarUrl} size={56} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{user.name}</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>{user.email}</div>
          <Pill text={normalizeRole(user.role)} tone={user.role === "HR" ? "success" : "neutral"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={S.blockTitle}>Identity</div>

          <div className="muted">ID</div>
          <div style={S.blockValue}>{user._id}</div>

          <div className="muted">Matricule</div>
          <div style={S.blockValue}>{user.matricule || "-"}</div>

          <div className="muted">Telephone</div>
          <div style={S.blockValue}>{user.telephone || "-"}</div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={S.blockTitle}>Account</div>

          <div className="muted">Email</div>
          <div style={S.blockValue}>{user.email}</div>

          <div className="muted">Role</div>
          <div style={S.blockValue}>{normalizeRole(user.role)}</div>

          <div className="muted">Status</div>
          <div style={S.blockValue}>{user.status || (user.isActive ? "active" : "inactive") || "-"}</div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={S.blockTitle}>Work</div>

          <div className="muted">Department</div>
          <div style={S.blockValue}>{user.department || user.departement_id || "-"}</div>

          <div className="muted">Manager ID</div>
          <div style={S.blockValue}>{user.manager_id || "-"}</div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={S.blockTitle}>Timeline</div>

          <div className="muted">Date d’embauche</div>
          <div style={S.blockValue}>{fmtDate(user.date_embauche)}</div>

          <div className="muted">Created</div>
          <div style={S.blockValue}>{fmtDateTime(user.createdAt)}</div>

          <div className="muted">Updated</div>
          <div style={S.blockValue}>{fmtDateTime(user.updatedAt)}</div>

          <div className="muted">Last login</div>
          <div style={S.blockValue}>{fmtDateTime(user.lastLogin)}</div>
        </div>

        <div className="card" style={{ padding: 12, gridColumn: "1 / -1" }}>
          <div style={S.blockTitle}>Flags</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill text={`En ligne : ${user.en_ligne ? "Oui" : "Non"}`} tone={user.en_ligne ? "success" : "neutral"} />
            <Pill text={`Actif : ${user.isActive ? "Oui" : "Non"}`} />
            <Pill text={`Email vérifié : ${user.emailVerified ? "Oui" : "Non"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}