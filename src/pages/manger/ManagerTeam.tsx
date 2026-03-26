import React, { useEffect, useMemo, useState } from "react";
import "../../index.css";
import { getCurrentUser } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import { getUsers } from "../../services/users.service";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  matricule: string;
  status: "Online" | "Offline";
};

function statusBadge(status: TeamMember["status"]) {
  if (status === "Online") return "badge-high";
  return "badge-medium";
}

function getDepartmentId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return "";
}

export default function ManagerTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [departmentName, setDepartmentName] = useState("");

  const loadTeam = async () => {
    setLoading(true);
    setError("");

    try {
      const [me, users, departments] = await Promise.all([getCurrentUser(), getUsers(), getAllDepartments()]);

      const managedDepartment = departments.find((d) => d.manager_id === me._id);
      const managedDepartmentId = managedDepartment?._id || getDepartmentId((me as any).departement_id);

      setDepartmentName(managedDepartment?.name || "");

      if (!managedDepartmentId) {
        setMembers([]);
        return;
      }

      const team = (users as any[])
        .filter((u) => String(u.role || "").toUpperCase() === "EMPLOYEE")
        .filter((u) => getDepartmentId(u.departement_id) === managedDepartmentId)
        .map((u) => ({
          id: String(u._id || ""),
          name: String(u.name || "-"),
          role: String(u.role || "EMPLOYEE"),
          email: String(u.email || "-"),
          matricule: String(u.matricule || "-"),
          status: u.en_ligne ? "Online" : "Offline",
        } as TeamMember));

      setMembers(team);
    } catch (e: any) {
      setError(e?.message || "Failed to load team");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const filteredMembers = useMemo(() => {
    let result = members;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((m) =>
        [m.name, m.email, m.role, m.matricule].some((v) => v.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((m) => m.status.toLowerCase() === statusFilter);
    }

    return result;
  }, [members, search, statusFilter]);

  return (
    <div className="container">
      <div className="card section-card">
        <div className="section-head">
          <div>
            <div className="section-title">My Team</div>
            <div className="muted">
              {departmentName
                ? `Employees assigned to your department: ${departmentName}.`
                : "Employees assigned to your department."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              placeholder="Search name, role, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "online" | "offline")}
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <button className="btn btn-primary" onClick={loadTeam}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 12, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
            <span style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</span>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Matricule</th>
            </tr>
          </thead>

          <tbody>
            {!loading && filteredMembers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#64748b", fontWeight: 700 }}>
                  No employees found for your department.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={5} style={{ color: "#64748b", fontWeight: 700 }}>
                  Loading team members...
                </td>
              </tr>
            )}

            {filteredMembers.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 900 }}>
                  {m.name}
                  <div className="muted" style={{ margin: 0 }}>
                    {m.id.slice(0, 8)}
                  </div>
                </td>

                <td>{m.role}</td>
                <td>{m.email}</td>

                <td>
                  <span className={`badge ${statusBadge(m.status)}`}>{m.status}</span>
                </td>
                <td>{m.matricule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}