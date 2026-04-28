import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getAllSkills,
  getEmployeeSkills,
} from "../../../services/skills.service";
import { getAllEmployees, type EmployeeRecord } from "../../../services/employee.service";
import { getAllDepartments, type Department } from "../../../services/departments.service";
import { useLocation, useNavigate } from "react-router-dom";

type SkillCategory = "KNOWLEDGE" | "KNOW_HOW" | "SOFT";

type Skill = {
  _id: string;
  name: string;
  category?: SkillCategory;
};

type AssignedSkill = {
  id: string;
  name: string;
  level: string;
};

type EmployeeRow = {
  employeeId: string;
  userId: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName: string;
};

type EmployeeSkillFallbackMap = Record<string, AssignedSkill[]>;

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
      departmentId: depId,
      departmentName,
    };
  });
}

function levelLabel(level: string) {
  const map: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    EXPERT: "Expert",
  };
  return map[String(level).toUpperCase()] || level || "-";
}

export default function AssignSkillTablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [fallbackSkillsByEmployeeId, setFallbackSkillsByEmployeeId] =
    useState<EmployeeSkillFallbackMap>({});
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loadingSkillByEmployeeId, setLoadingSkillByEmployeeId] = useState<Record<string, boolean>>(
    {},
  );
  const [employeeSkillsById, setEmployeeSkillsById] = useState<Record<string, AssignedSkill[]>>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const buildFallbackSkillsByEmployee = (
      employeeRecords: EmployeeRecord[],
      allSkills: Skill[],
    ): EmployeeSkillFallbackMap => {
      const skillNameById = new Map<string, string>();
      allSkills.forEach((s) => {
        const id = String(s._id || "").trim();
        if (id) skillNameById.set(id, String(s.name || "Unknown skill"));
      });

      const result: EmployeeSkillFallbackMap = {};

      employeeRecords.forEach((record) => {
        const employeeId = String(record._id || "");
        const segments = Array.isArray(record.experienceSegments) ? record.experienceSegments : [];
        const unique = new Map<string, AssignedSkill>();

        segments.forEach((seg) => {
          const skillIds = Array.isArray(seg.skillIds) ? seg.skillIds : [];
          skillIds.forEach((rawId) => {
            const id = String(rawId || "").trim();
            if (!id || unique.has(id)) return;
            unique.set(id, {
              id,
              name: skillNameById.get(id) || "Unknown skill",
              level: "",
            });
          });
        });

        result[employeeId] = Array.from(unique.values());
      });

      return result;
    };

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [employeeRecords, departments, allSkills] = await Promise.all([
          getAllEmployees(),
          getAllDepartments(),
          getAllSkills(),
        ]);
        const safeEmployees = employeeRecords || [];
        const safeSkills = Array.isArray(allSkills) ? allSkills : [];
        setEmployees(toEmployeeRows(safeEmployees, departments || []));
        setSkills(safeSkills);
        setFallbackSkillsByEmployeeId(buildFallbackSkillsByEmployee(safeEmployees, safeSkills));
      } catch (e) {
        setError("Failed to load employees and skills.");
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

  const loadEmployeeSkillsFor = async (employeeId: string, fromAction = false) => {
    const employeeRow = employees.find((row) => row.employeeId === employeeId);
    const skillOwnerId = String(employeeRow?.userId || "");
    if (!skillOwnerId) return;

    try {
      setLoadingSkillByEmployeeId((prev) => ({ ...prev, [employeeId]: true }));
      const rows = await getEmployeeSkills(skillOwnerId);
      const mappedFromEndpoint: AssignedSkill[] = (Array.isArray(rows) ? rows : []).map((row: any) => ({
        id: String(row?.skill?._id || ""),
        name: String(row?.skill?.name || "Unknown skill"),
        level: String(row?.level || ""),
      }));
      const fallback = fallbackSkillsByEmployeeId[employeeId] || [];
      const mergedById = new Map<string, AssignedSkill>();
      fallback.forEach((item) => {
        if (item.id) mergedById.set(item.id, item);
      });
      mappedFromEndpoint.forEach((item) => {
        if (item.id) mergedById.set(item.id, item);
      });
      setEmployeeSkillsById((prev) => ({ ...prev, [employeeId]: Array.from(mergedById.values()) }));
    } catch {
      setEmployeeSkillsById((prev) => ({
        ...prev,
        [employeeId]: fallbackSkillsByEmployeeId[employeeId] || [],
      }));
      if (fromAction) {
        setError("Failed to load employee skills.");
      }
    } finally {
      setLoadingSkillByEmployeeId((prev) => ({ ...prev, [employeeId]: false }));
    }
  };

  useEffect(() => {
    const missingEmployees = paginatedEmployees.filter(
      (row) =>
        !(row.employeeId in employeeSkillsById) && !loadingSkillByEmployeeId[row.employeeId],
    );
    if (missingEmployees.length === 0) return;

    missingEmployees.forEach((row) => {
      void loadEmployeeSkillsFor(row.employeeId, false);
    });
  }, [paginatedEmployees, employeeSkillsById, loadingSkillByEmployeeId, fallbackSkillsByEmployeeId]);

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
          Assign Skills
        </h1>
        <p className="page-subtitle" style={{ marginTop: 0, fontSize: "18px", color: "var(--muted)" }}>
          Search employees, filter by department, and assign skills from one table.
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
                <th style={thStyle}>Skills</th>
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
                  const rowSkills = employeeSkillsById[row.employeeId] || [];
                  const rowSkillLoading = !!loadingSkillByEmployeeId[row.employeeId];
                  const skillsCount = rowSkills.length;
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
                        {rowSkillLoading ? (
                          <span style={{ color: "var(--muted)" }}>Loading skills...</span>
                        ) : skillsCount === 0 ? (
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
                            No skills assigned
                          </span>
                        ) : (
                          <span
                            title={rowSkills.map((s) => `${s.name} (${levelLabel(s.level)})`).join(", ")}
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
                            {skillsCount} {skillsCount === 1 ? "skill" : "skills"}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => {
                            const nextPath = location.pathname.replace(/\/assign-table$/, "/assign");
                            navigate(`${nextPath}?employeeId=${encodeURIComponent(row.userId)}`);
                          }}
                          style={actionPrimaryButtonStyle}
                        >
                          Add skill
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

