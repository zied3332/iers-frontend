import React, { useEffect, useMemo, useState } from "react";
import {
  deleteEmployeeById,
  getAllEmployees,
  patchEmployeeById,
  type EmployeeRecord,
} from "../../services/employee.service";
import { getAllDepartments, type Department } from "../../services/departments.service";
import { useNavigate } from "react-router-dom";

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #eaecef",
  borderRadius: 18,
  padding: 16,
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: bg,
  color,
  fontWeight: 900,
  fontSize: 12,
});

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGreen: React.CSSProperties = {
  ...btn,
  border: "none",
  background: "#1f7a5a",
  color: "white",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  outline: "none",
  fontWeight: 700,
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  background: "white",
  fontWeight: 800,
  outline: "none",
};

const actionBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
};

const actionBtnPrimary: React.CSSProperties = {
  ...actionBtn,
  border: "1px solid rgba(31,122,90,0.22)",
  background: "rgba(31,122,90,0.08)",
  color: "#145a41",
};

const actionBtnDanger: React.CSSProperties = {
  ...actionBtn,
  border: "1px solid rgba(239,68,68,0.25)",
  background: "rgba(239,68,68,0.08)",
  color: "#b91c1c",
};

const fieldLabel: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const fieldValue: React.CSSProperties = {
  marginTop: 4,
  fontWeight: 800,
  color: "#0f172a",
};

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);


type Emp = {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  department: string;
  email: string;
  matricule: string;
  seniority: string;
  experienceYears: number;
};

type EditForm = {
  jobTitle: string;
  seniorityLevel: "JUNIOR" | "MID" | "SENIOR";
  experienceYears: number;
};

function normalizeSeniority(value: any): "JUNIOR" | "MID" | "SENIOR" {
  const v = String(value || "").trim().toUpperCase();
  if (v === "MID") return "MID";
  if (v === "SENIOR") return "SENIOR";
  return "JUNIOR";
}

function getDepartmentId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return "";
}

function formatYears(years: number): string {
  const y = Number.isFinite(years) ? years : 0;
  return `${y} ${y === 1 ? "year" : "years"}`;
}

function getEditFormFromRecord(records: EmployeeRecord[], employeeId: string): EditForm {
  const match = (records || []).find((r) => String(r._id || "") === String(employeeId));
  if (!match) {
    return {
      jobTitle: "Not Assigned",
      seniorityLevel: "JUNIOR",
      experienceYears: 0,
    };
  }

  return {
    jobTitle: String(match.jobTitle || "Not Assigned"),
    seniorityLevel: normalizeSeniority(match.seniorityLevel),
    experienceYears: Number(match.experienceYears || 0),
  };
}

function getBasePath(): string {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(u?.role || "").toUpperCase();
    if (role === "SUPER_MANAGER") return "/super-manager";
    if (role === "MANAGER") return "/manager";
    return "/hr";
  } catch {
    return "/hr";
  }
}

export default function HrEmployees() {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [viewing, setViewing] = useState<Emp | null>(null);
  const [editing, setEditing] = useState<Emp | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    jobTitle: "",
    seniorityLevel: "JUNIOR",
    experienceYears: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [employeesData, departmentsData] = await Promise.all([getAllEmployees(), getAllDepartments()]);
        setRecords(employeesData || []);
        setDepartments(departmentsData || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d?._id && d?.name) map.set(String(d._id), String(d.name));
    });
    return map;
  }, [departments]);

  const employees = useMemo(() => {
    const mapped = (records || []).map((r) => {
      const user = typeof r.user_id === "object" ? r.user_id : null;
      const depId = getDepartmentId(user?.departement_id);

      return {
        id: String(r._id || ""),
        name: String(user?.name || "-"),
        role: String(r.jobTitle || "Not Assigned"),
        departmentId: depId,
        department: departmentNameById.get(depId) || "No dept",
        email: String(user?.email || "-"),
        matricule: String(user?.matricule || "-"),
        seniority: normalizeSeniority(r.seniorityLevel),
        experienceYears: Number(r.experienceYears || 0),
      } as Emp;
    });

    return mapped.filter((e) => {
      const search = q.trim().toLowerCase();
      const matchesSearch =
        !search ||
        [e.name, e.role, e.department, e.email, e.matricule].some((v) =>
          v.toLowerCase().includes(search)
        );
      const matchesDepartment = !filterDepartment || e.departmentId === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [records, departmentNameById, q, filterDepartment]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(employees.length / pageSize)), [employees.length]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return employees.slice(start, start + pageSize);
  }, [employees, page]);

  useEffect(() => {
    setPage(1);
  }, [q, filterDepartment]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const departmentOptions = useMemo(() => {
    return departments
      .map((d) => ({ id: String(d._id), name: String(d.name || "") }))
      .filter((d) => d.id && d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const openEdit = (e: Emp) => {
    setEditing(e);
  };

  useEffect(() => {
    if (!editing?.id) return;
    setEditForm(getEditFormFromRecord(records, editing.id));
  }, [editing?.id, records]);

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const years = Number(editForm.experienceYears);
    if (!Number.isFinite(years) || years < 0) {
      setError("Experience years must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await patchEmployeeById(editing.id, {
        jobTitle: editForm.jobTitle.trim() || "Not Assigned",
        experienceYears: years,
        seniorityLevel: editForm.seniorityLevel,
      });

      setRecords((prev) => prev.map((r) => (String(r._id) === String(editing.id) ? updated : r)));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (employee: Emp) => {
    const ok = window.confirm(`Delete employee record for ${employee.name}?`);
    if (!ok) return;

    setDeletingId(employee.id);
    setError("");
    try {
      await deleteEmployeeById(employee.id);
      setRecords((prev) => prev.filter((r) => String(r._id) !== String(employee.id)));
    } catch (e: any) {
      setError(e?.message || "Failed to delete employee");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page">
          <div className="container">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 44, margin: 0 }}>Employees</h1>
          <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
            Browse employees, filter by department/skills, and take actions.
          </div>
        </div>

        <button style={btnGreen} onClick={() => window.location.assign('/hr/users')}>Manage Users</button>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 10 }}>
          <input style={input} placeholder="Search name / role / email / matricule..." value={q} onChange={(e) => setQ(e.target.value)} />

          <select style={select} value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
            <option value="">Department: All</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, marginTop: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, fontWeight: 900 }}>All Employees</div>

        {error && (
          <div style={{ margin: "0 16px 12px", padding: 12, borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#b91c1c", fontWeight: 800 }}>
            {error}
          </div>
        )}

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 14, color: "#64748b" }}>Employee</th>
                <th style={{ padding: 14, color: "#64748b" }}>Job Title</th>
                <th style={{ padding: 14, color: "#64748b" }}>Department</th>
                <th style={{ padding: 14, color: "#64748b" }}>Seniority</th>
                <th style={{ padding: 14, color: "#64748b", width: 160 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && employees.length === 0 && (
                <tr style={{ borderTop: "1px solid #eef2f7" }}>
                  <td colSpan={5} style={{ padding: 14, color: "#64748b", fontWeight: 700 }}>No employees found.</td>
                </tr>
              )}

              {loading && (
                <tr style={{ borderTop: "1px solid #eef2f7" }}>
                  <td colSpan={5} style={{ padding: 14, color: "#64748b", fontWeight: 700 }}>Loading employees...</td>
                </tr>
              )}

              {paginatedEmployees.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td
  style={{ padding: 14, fontWeight: 900, cursor: "pointer", color: "#1f7a5a", textDecoration: "underline" }}
onClick={() => navigate(`${getBasePath()}/employees/${e.id}`)}
  title={`Voir le profil de ${e.name}`}
>
  {e.name}
</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.role}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.department}</td>
                  <td style={{ padding: 14 }}><span style={badge("#e0f2fe", "#0369a1")}>{e.seniority}</span></td>
                  <td style={{ padding: 14 }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        type="button"
                        style={actionBtn}
                        title="View more"
                        onClick={() => setViewing(e)}
                      >
                        <IconEye />
                      </button>
                      <button
                        type="button"
                        style={actionBtnPrimary}
                        title="Edit"
                        onClick={() => openEdit(e)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        style={actionBtnDanger}
                        title="Delete"
                        onClick={() => onDelete(e)}
                        disabled={deletingId === e.id}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && employees.length > 0 && (
          <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: "#64748b", fontWeight: 700, flexWrap: "wrap" }}>
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, employees.length)} of {employees.length} employees
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                style={btn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                title="Previous page"
              >
                &lt;
              </button>
              <span style={{ padding: "6px 10px", border: "1px solid #eaecef", borderRadius: 10, color: "#0f172a", background: "#fff" }}>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                style={btn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                title="Next page"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <div
          onClick={() => setViewing(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: "min(620px, 96vw)",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 26px 60px rgba(2,6,23,0.22)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a" }}>Employee Details</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{viewing.name}</div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div>
                <div style={fieldLabel}>Name</div>
                <div style={fieldValue}>{viewing.name}</div>
              </div>
              <div>
                <div style={fieldLabel}>Job Title</div>
                <div style={fieldValue}>{viewing.role}</div>
              </div>
              <div>
                <div style={fieldLabel}>Department</div>
                <div style={fieldValue}>{viewing.department}</div>
              </div>
              <div>
                <div style={fieldLabel}>Seniority</div>
                <div style={fieldValue}>{viewing.seniority}</div>
              </div>
              <div>
                <div style={fieldLabel}>Experience</div>
                <div style={fieldValue}>{formatYears(viewing.experienceYears)}</div>
              </div>
              <div>
                <div style={fieldLabel}>Email</div>
                <div style={fieldValue}>{viewing.email}</div>
              </div>
              <div>
                <div style={fieldLabel}>Matricule</div>
                <div style={fieldValue}>{viewing.matricule}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" style={btn} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 26px 60px rgba(2,6,23,0.22)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a" }}>Edit Employee</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{editing.name}</div>

           <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
  {/* Name */}
  <div>
    <div style={fieldLabel}>Name</div>
    <input
      style={input}
      placeholder="Name"
      value={editing.name}
      onChange={(e) => setEditing((prev) => prev && { ...prev, name: e.target.value })}
    />
  </div>

  {/* Email */}
  <div>
    <div style={fieldLabel}>Email</div>
    <input
      style={input}
      type="email"
      placeholder="Email"
      value={editing.email}
      onChange={(e) => setEditing((prev) => prev && { ...prev, email: e.target.value })}
    />
  </div>

  {/* Matricule */}
  <div>
    <div style={fieldLabel}>Matricule</div>
    <input
      style={input}
      placeholder="Matricule"
      value={editing.matricule}
      onChange={(e) => setEditing((prev) => prev && { ...prev, matricule: e.target.value })}
    />
  </div>

  {/* Department */}
  <div>
    <div style={fieldLabel}>Department</div>
    <select
      style={select}
      value={editing.departmentId}
      onChange={(e) => setEditing((prev) => prev && { ...prev, departmentId: e.target.value })}
    >
      <option value="">Select department</option>
      {departmentOptions.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  </div>

  {/* Job Title */}
  <div>
    <div style={fieldLabel}>Job Title</div>
    <input
      style={input}
      placeholder="Job Title"
      value={editForm.jobTitle}
      onChange={(e) => setEditForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
    />
  </div>

  {/* Seniority */}
  <div>
    <div style={fieldLabel}>Seniority</div>
    <select
      style={select}
      value={editForm.seniorityLevel}
      onChange={(e) =>
        setEditForm((prev) => ({ ...prev, seniorityLevel: e.target.value as "JUNIOR" | "MID" | "SENIOR" }))
      }
    >
      <option value="JUNIOR">Junior</option>
      <option value="MID">Mid</option>
      <option value="SENIOR">Senior</option>
    </select>
  </div>

  {/* Experience Years */}
  <div>
    <div style={fieldLabel}>Experience</div>
    <input
      style={input}
      type="number"
      min={0}
      value={editForm.experienceYears}
      onChange={(e) =>
        setEditForm((prev) => ({ ...prev, experienceYears: Number(e.target.value || 0) }))
      }
      placeholder="Experience years"
    />
  </div>
</div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" style={btn} onClick={closeEdit} disabled={saving}>
                Cancel
              </button>
              <button type="button" style={btnGreen} onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
         </div>
    </div>



  );
}