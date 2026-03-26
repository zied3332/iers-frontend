import React, { useEffect, useMemo, useState } from "react";
import { getAllEmployees, type EmployeeRecord } from "../../services/employee.service";
import { getAllDepartments, type Department } from "../../services/departments.service";
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

function getDepartmentId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return "";
}

export default function HrEmployees() {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

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
        seniority: String(r.seniorityLevel || "JUNIOR"),
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

  const departmentOptions = useMemo(() => {
    return departments
      .map((d) => ({ id: String(d._id), name: String(d.name || "") }))
      .filter((d) => d.id && d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

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
                <th style={{ padding: 14, color: "#64748b" }}>Email</th>
                <th style={{ padding: 14, color: "#64748b" }}>Matricule</th>
                <th style={{ padding: 14, color: "#64748b" }}>Seniority</th>
                <th style={{ padding: 14, color: "#64748b" }}>Experience</th>
              </tr>
            </thead>

            <tbody>
              {!loading && employees.length === 0 && (
                <tr style={{ borderTop: "1px solid #eef2f7" }}>
                  <td colSpan={7} style={{ padding: 14, color: "#64748b", fontWeight: 700 }}>No employees found.</td>
                </tr>
              )}

              {loading && (
                <tr style={{ borderTop: "1px solid #eef2f7" }}>
                  <td colSpan={7} style={{ padding: 14, color: "#64748b", fontWeight: 700 }}>Loading employees...</td>
                </tr>
              )}

              {employees.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td style={{ padding: 14, fontWeight: 900 }}>{e.name}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.role}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.department}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.email}</td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.matricule}</td>
                  <td style={{ padding: 14 }}><span style={badge("#e0f2fe", "#0369a1")}>{e.seniority}</span></td>
                  <td style={{ padding: 14, fontWeight: 700, color: "#0f172a" }}>{e.experienceYears}y</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", color: "#64748b", fontWeight: 700 }}>
          <div>Showing {employees.length} employees</div>
          <div>All departments included</div>
        </div>
      </div>
         </div>
    </div>
  );
}