import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getAllEmployees, type EmployeeRecord } from "../../../services/employee.service";
import { getAllDepartments, type Department } from "../../../services/departments.service";
import { useLocation, useNavigate } from "react-router-dom";

type EmployeeRow = {
  employeeId: string;
  userId: string;
  name: string;
  email: string;
  departmentName: string;
  experienceYears: number;
  segmentsCount: number;
};

function getDepartmentId(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const maybe = raw as { _id?: string; id?: string };
    return String(maybe._id || maybe.id || "");
  }
  return "";
}

function toEmployeeRows(records: EmployeeRecord[], departments: Department[]): EmployeeRow[] {
  const depNameById = new Map(
    departments
      .map((dep) => [String(dep._id || ""), String(dep.name || "").trim()] as const)
      .filter(([id, name]) => id && name),
  );

  return records.map((record) => {
    const user = typeof record.user_id === "object" ? record.user_id : null;
    const depId = getDepartmentId(user?.departement_id);
    const embeddedDepName =
      typeof user?.departement_id === "object" && user.departement_id
        ? String(user.departement_id.name || "").trim()
        : "";
    const departmentName = embeddedDepName || depNameById.get(depId) || "No department";

    return {
      employeeId: String(record._id || ""),
      userId: String(user?._id || ""),
      name: String(user?.name || "Unknown employee"),
      email: String(user?.email || ""),
      departmentName,
      experienceYears: Math.max(0, Number(record.experienceYears || 0)),
      segmentsCount: Array.isArray(record.experienceSegments) ? record.experienceSegments.length : 0,
    };
  });
}

export default function AssignExperienceTablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [employeeRecords, departments] = await Promise.all([
          getAllEmployees(),
          getAllDepartments(),
        ]);
        setEmployees(toEmployeeRows(employeeRecords || [], departments || []));
      } catch {
        setError("Failed to load employees.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((row) => {
      if (row.departmentName) set.add(row.departmentName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((row) => {
      const matchesDepartment = !departmentFilter || row.departmentName === departmentFilter;
      if (!row.userId) return false;
      if (!matchesDepartment) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.departmentName.toLowerCase().includes(q)
      );
    });
  }, [employees, search, departmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEmployees.length / pageSize)),
    [filteredEmployees.length],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page]);

  return (
    <div style={{ padding: "24px", width: "100%", minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          marginBottom: "16px",
          padding: "18px 20px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "linear-gradient(145deg, var(--card) 0%, var(--surface-2) 100%)",
          boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
        }}
      >
        <h1 className="page-title" style={{ marginBottom: "6px", fontSize: "38px", fontWeight: 900 }}>
          Assign Experience
        </h1>
        <p className="page-subtitle" style={{ marginTop: 0, fontSize: "18px", color: "var(--muted)" }}>
          Search employees, filter by department, and assign experience from one table.
        </p>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
          alignItems: "center",
          padding: "14px",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          background: "var(--card)",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee, email, department..."
          style={{
            flex: "1 1 320px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid var(--input-border)",
            padding: "0 12px",
            fontSize: "16px",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 700,
          }}
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            minWidth: "220px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid var(--input-border)",
            padding: "0 12px",
            fontSize: "16px",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 700,
          }}
        >
          <option value="">All departments</option>
          {departmentOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div
          style={{
            height: "44px",
            borderRadius: "12px",
            border: "1px solid var(--primary-border)",
            background: "var(--primary-weak)",
            color: "var(--primary-soft-text)",
            padding: "0 14px",
            display: "inline-flex",
            alignItems: "center",
            fontSize: "15px",
            fontWeight: 800,
          }}
        >
          Employees: {filteredEmployees.length}
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--card)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Experience</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={emptyCellStyle} colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td style={emptyCellStyle} colSpan={4}>
                    No employees found.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((row) => {
                  const hasExperience = row.experienceYears > 0 || row.segmentsCount > 0;
                  return (
                    <tr
                      key={row.employeeId}
                      style={{ borderTop: "1px solid var(--border)", transition: "background-color 0.2s ease" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "color-mix(in srgb, var(--surface) 84%, var(--surface-2))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, fontSize: "17px" }}>{row.name}</div>
                        <div style={{ fontSize: "14px", color: "var(--muted)" }}>{row.email || "-"}</div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-2)",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          {row.departmentName}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {!hasExperience ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              border: "1px solid #d1d5db",
                              background: "#f9fafb",
                              color: "#6b7280",
                              fontSize: "14px",
                              fontWeight: 700,
                            }}
                          >
                            No experience assigned
                          </span>
                        ) : (
                          <span
                            title={`${row.experienceYears} year(s), ${row.segmentsCount} segment(s)`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              border: "1px solid var(--primary-border)",
                              background: "var(--primary-weak)",
                              color: "var(--primary-soft-text)",
                              fontSize: "14px",
                              fontWeight: 800,
                            }}
                          >
                            {row.experienceYears} {row.experienceYears === 1 ? "year" : "years"} - {row.segmentsCount}{" "}
                            {row.segmentsCount === 1 ? "segment" : "segments"}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => {
                            const nextPath = location.pathname.replace(/\/assign-table$/, "/assign");
                            navigate(`${nextPath}?employeeId=${encodeURIComponent(row.employeeId)}`);
                          }}
                          style={actionPrimaryButtonStyle}
                        >
                          Add experience
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {filteredEmployees.length > 0 ? (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: "15px" }}>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length} employees
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={actionButtonStyle}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                style={p === page ? actionPrimaryButtonStyle : actionButtonStyle}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={actionButtonStyle}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px",
  fontSize: "14px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 800,
};

const tdStyle: CSSProperties = {
  padding: "14px",
  verticalAlign: "top",
  fontSize: "16px",
};

const emptyCellStyle: CSSProperties = {
  padding: "22px",
  textAlign: "center",
  color: "var(--muted)",
  fontWeight: 700,
};

const actionButtonStyle: CSSProperties = {
  height: "40px",
  borderRadius: "9px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

const actionPrimaryButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  border: "1px solid var(--primary)",
  background: "var(--primary)",
  color: "var(--primary-on)",
};

