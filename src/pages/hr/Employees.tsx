import React, { useEffect, useMemo, useState } from "react";
import {
  deleteEmployeeById,
  getAllEmployees,
  patchEmployeeById,
  type EmployeeRecord,
} from "../../services/employee.service";
import {
  getAllDepartments,
  type Department,
} from "../../services/departments.service";
import { getAllDomains, type Domain } from "../../services/domains.service";
import { getAllSkills } from "../../services/skills.service";
import type { ExperienceSegmentInput } from "../../utils/experienceSegments";
import {
  ExperienceSegmentsEditor,
  mapApiSegmentsToInput,
  mapApiSkillsToOptions,
  validateExperienceSegmentsForSave,
  type SkillOption,
} from "../../components/ExperienceSegmentsEditor";

const pageCard: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  width: "100%",
};

const statCard = (accent: string): React.CSSProperties => ({
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  minHeight: 92,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.03)",
  position: "relative",
  overflow: "hidden",
  borderLeft: `4px solid ${accent}`,
  width: "100%",
});

const baseButton: React.CSSProperties = {
  height: 46,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid var(--input-border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  ...baseButton,
  background: "var(--primary-weak)",
  color: "var(--primary-soft-text)",
  border: "1px solid var(--primary-border)",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: 14,
  border: "1px solid var(--input-border)",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  padding: "0 16px 0 42px",
  fontSize: 15,
  fontWeight: 700,
};

const filterSelect: React.CSSProperties = {
  height: 46,
  borderRadius: 14,
  border: "1px solid var(--input-border)",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  padding: "0 14px",
  fontSize: 15,
  fontWeight: 800,
};

const fieldLabel: React.CSSProperties = {
  color: "var(--muted)",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const fieldValue: React.CSSProperties = {
  marginTop: 4,
  fontWeight: 800,
  color: "var(--text)",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 23, 0.45)",
  zIndex: 110,
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const modalCard: React.CSSProperties = {
  width: "min(760px, 96vw)",
  background: "var(--surface)",
  borderRadius: 20,
  border: "1px solid var(--border)",
  boxShadow: "0 26px 60px rgba(2,6,23,0.22)",
  padding: 20,
};

/** Edit employee: wide layout + capped height with internal scroll */
const editEmployeeModalCard: React.CSSProperties = {
  width: "min(1080px, 97vw)",
  maxHeight: "min(88vh, 920px)",
  background: "var(--surface)",
  borderRadius: 20,
  border: "1px solid var(--border)",
  boxShadow: "0 26px 60px rgba(2,6,23,0.22)",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const actionsGroup: React.CSSProperties = {
  display: "inline-flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 0,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
};

const actionBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  borderRight: "1px solid var(--border)",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const actionBtnPrimary: React.CSSProperties = {
  ...actionBtn,
  color: "var(--primary-soft-text)",
};

const actionBtnDanger: React.CSSProperties = {
  ...actionBtn,
  color: "#dc2626",
  borderRight: "none",
};

const listFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  padding: 16,
  borderTop: "1px solid var(--border)",
  background: "var(--surface)",
};

const listFooterText: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: 14,
  fontWeight: 600,
};

const listPagination: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const listPageBtn: React.CSSProperties = {
  minWidth: 40,
  height: 40,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};

const listPageBtnActive: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--primary-on)",
  border: "1px solid var(--primary)",
};

type Emp = {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  department: string;
  email: string;
  matricule: string;
  seniority: "JUNIOR" | "MID" | "SENIOR";
  experienceYears: number;
  experienceSegments: ExperienceSegmentInput[];
  avatarUrl?: string;
  isOnline: boolean;
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

function getEditFormFromRecord(
  records: EmployeeRecord[],
  employeeId: string
): EditForm {
  const match = (records || []).find(
    (r) => String(r._id || "") === String(employeeId)
  );

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

function getInitials(name: string) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getStatusBadge(isOnline: boolean): React.CSSProperties {
  if (isOnline) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 82,
      padding: "9px 14px",
      borderRadius: 999,
      background: "var(--primary-weak)",
      color: "var(--primary-soft-text)",
      border: "1px solid var(--primary-border)",
      fontWeight: 800,
      fontSize: 13,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 82,
    padding: "9px 14px",
    borderRadius: 999,
    background: "rgba(148, 163, 184, 0.12)",
    color: "#334155",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    fontWeight: 800,
    fontSize: 13,
  };
}

function getSeniorityBadge(seniority: string): React.CSSProperties {
  if (seniority === "SENIOR") {
    return {
      display: "inline-flex",
      padding: "6px 10px",
      borderRadius: 999,
      background: "var(--primary-weak)",
      color: "var(--primary-soft-text)",
      fontWeight: 900,
      fontSize: 12,
    };
  }

  if (seniority === "MID") {
    return {
      display: "inline-flex",
      padding: "6px 10px",
      borderRadius: 999,
      background: "rgba(245, 158, 11, 0.12)",
      color: "#92400e",
      fontWeight: 900,
      fontSize: 12,
    };
  }

  return {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(59, 130, 246, 0.12)",
    color: "#1d4ed8",
    fontWeight: 900,
    fontSize: 12,
  };
}

function inferOnlineStatus(user: any) {
  const raw = String(
    user?.status ?? user?.presence ?? user?.connectionStatus ?? user?.isOnline ?? ""
  )
    .trim()
    .toLowerCase();

  if (typeof user?.isOnline === "boolean") return user.isOnline;
  if (raw === "online" || raw === "active" || raw === "true") return true;
  return false;
}

const IconPencil = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrash = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconSearch = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block" }}
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function HrEmployees() {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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
  const [editExperienceSegments, setEditExperienceSegments] = useState<ExperienceSegmentInput[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [employeesData, departmentsData, domainsData, skillsData] = await Promise.all([
        getAllEmployees(),
        getAllDepartments(),
        getAllDomains().catch(() => []),
        getAllSkills().catch(() => []),
      ]);
      setRecords(employeesData || []);
      setDepartments(departmentsData || []);
      setDomains(Array.isArray(domainsData) ? domainsData : []);
      setSkillOptions(mapApiSkillsToOptions(skillsData));
    } catch (e: any) {
      setError(e?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d?._id && d?.name) {
        map.set(String(d._id), String(d.name));
      }
    });
    return map;
  }, [departments]);

  const domainLabelById = useMemo(() => {
    const m = new Map<string, string>();
    domains.forEach((d) => m.set(String(d._id), String(d.name || "")));
    return m;
  }, [domains]);

  const skillLabelById = useMemo(() => {
    const m = new Map<string, string>();
    skillOptions.forEach((s) => m.set(String(s._id), String(s.name || "")));
    return m;
  }, [skillOptions]);

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
        experienceSegments: mapApiSegmentsToInput(r.experienceSegments),
        avatarUrl: String(user?.avatar || user?.profilePicture || user?.image || ""),
        isOnline: inferOnlineStatus(user),
      } as Emp;
    });

    return mapped.filter((employee) => {
      const search = q.trim().toLowerCase();
      const matchesSearch =
        !search ||
        [
          employee.name,
          employee.role,
          employee.department,
          employee.email,
          employee.matricule,
        ].some((v) => v.toLowerCase().includes(search));

      const matchesRole = !filterRole || employee.role === filterRole;
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "online" && employee.isOnline) ||
        (filterStatus === "offline" && !employee.isOnline);
      const matchesDepartment =
        !filterDepartment || employee.departmentId === filterDepartment;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [records, departmentNameById, q, filterRole, filterStatus, filterDepartment]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(employees.length / pageSize)),
    [employees.length]
  );

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return employees.slice(start, start + pageSize);
  }, [employees, page]);

  useEffect(() => {
    setPage(1);
  }, [q, filterRole, filterStatus, filterDepartment]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const employeeListStartItem =
    employees.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const employeeListEndItem = Math.min(page * pageSize, employees.length);

  const departmentOptions = useMemo(() => {
    return departments
      .map((d) => ({ id: String(d._id), name: String(d.name || "") }))
      .filter((d) => d.id && d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const roleOptions = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((e) => String(e.role || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const totalUsers = employees.length;
  const onlineUsers = employees.filter((e) => e.isOnline).length;
  const offlineUsers = employees.filter((e) => !e.isOnline).length;

  const openEdit = (employee: Emp) => {
    setEditing(employee);
  };

  useEffect(() => {
    if (!editing?.id) return;
    setEditForm(getEditFormFromRecord(records, editing.id));
    const match = (records || []).find((r) => String(r._id || "") === String(editing.id));
    setEditExperienceSegments(mapApiSegmentsToInput(match?.experienceSegments));
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

    const segErr = validateExperienceSegmentsForSave(years, editExperienceSegments);
    if (segErr) {
      setError(segErr);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await patchEmployeeById(editing.id, {
        jobTitle: editForm.jobTitle.trim() || "Not Assigned",
        experienceYears: years,
        seniorityLevel: editForm.seniorityLevel,
        experienceSegments: years > 0 ? editExperienceSegments : [],
      });

      setRecords((prev) =>
        prev.map((r) => (String(r._id) === String(editing.id) ? updated : r))
      );
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
      setRecords((prev) =>
        prev.filter((r) => String(r._id) !== String(employee.id))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to delete employee");
    } finally {
      setDeletingId(null);
    }
  };

  const renderAvatar = (employee: Emp) => {
    if (employee.avatarUrl) {
      return (
        <img
          src={employee.avatarUrl}
          alt={employee.name}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #f5e6db, #efd3c1)",
          color: "#0f172a",
          fontWeight: 900,
          fontSize: 18,
          border: "1px solid var(--border)",
        }}
      >
        {getInitials(employee.name)}
      </div>
    );
  };

  return (
    <div className="page" style={{ width: "padding: 20px; border-radius: 0px; background: transparent;" }}>

    
      <div
        style={{
          display: "grid",
          gap: 18,
          width: "100%",
          maxWidth: "none",
          margin: 0,
          padding: "0 20px 20px 20px",
          justifyItems: "stretch",
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
            width: "100%",
          }}
        >
          <div style={statCard("#60a5fa")}>
            <div>
              <div
                style={{
                  fontSize: 42,
                  lineHeight: 1,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {loading ? "..." : totalUsers}
              </div>
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Total Users
            </div>
          </div>

          <div style={statCard("var(--primary)")}>
            <div>
              <div
                style={{
                  fontSize: 42,
                  lineHeight: 1,
                  fontWeight: 900,
                  color: "var(--primary-soft-text)",
                }}
              >
                {loading ? "..." : onlineUsers}
              </div>
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Online
            </div>
          </div>

          <div style={statCard("#94a3b8")}>
            <div>
              <div
                style={{
                  fontSize: 42,
                  lineHeight: 1,
                  fontWeight: 900,
                  color: "#64748b",
                }}
              >
                {loading ? "..." : offlineUsers}
              </div>
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Offline
            </div>
          </div>
        </section>

        <section style={{ width: "100%" }}>
          <h1
            className="page-title"
            style={{ marginBottom: 8, fontSize: 38, fontWeight: 900 }}
          >
            Employees Management
          </h1>
          <p
            className="page-subtitle"
            style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}
          >
            Manage accounts, roles, and access.
          </p>
        </section>

        <section style={{ ...pageCard, padding: 16 }}>
          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.30)",
                background: "rgba(239,68,68,0.06)",
                color: "#b91c1c",
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                minWidth: 220,
                flex: "1 1 280px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  pointerEvents: "none",
                }}
              >
                <IconSearch />
              </div>
              <input
                style={searchInput}
                placeholder="Name, email, matricule..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                flex: "1 1 420px",
              }}
            >
              <select
                style={{ ...filterSelect, minWidth: 180 }}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              <select
                style={{ ...filterSelect, minWidth: 120 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>

              <select
                style={{ ...filterSelect, minWidth: 236 }}
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section
          style={{
            ...pageCard,
            padding: 0,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 980,
                borderCollapse: "collapse",
                tableLayout: "auto",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-2)",
                    textAlign: "left",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th
                    style={{
                      padding: "18px 16px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    NAME
                  </th>
                  <th
                    style={{
                      padding: "18px 16px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    ROLE
                  </th>
                  <th
                    style={{
                      padding: "18px 16px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    DEPARTMENT
                  </th>
                  <th
                    style={{
                      padding: "18px 16px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: "18px 16px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 18,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      Loading employees...
                    </td>
                  </tr>
                )}

                {!loading && paginatedEmployees.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 18,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      No employees found.
                    </td>
                  </tr>
                )}

                {paginatedEmployees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    style={{
                      borderTop: "1px solid var(--border)",
                      background:
                        index % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                    }}
                  >
                    <td style={{ padding: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          minWidth: 0,
                        }}
                      >
                        {renderAvatar(employee)}

                        <button
                          type="button"
                          onClick={() => setViewing(employee)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            textAlign: "left",
                            cursor: "pointer",
                            minWidth: 0,
                          }}
                          title={`Open details for ${employee.name}`}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 16,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {employee.name}
                          </div>
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: 16 }}>
                      <select
                        style={{ ...filterSelect, minWidth: 160, width: "100%", maxWidth: 220 }}
                        value={employee.role}
                        onChange={() => {}}
                      >
                        <option>{employee.role}</option>
                      </select>
                    </td>

                    <td style={{ padding: 16 }}>
                      <select
                        style={{ ...filterSelect, minWidth: 180, width: "100%", maxWidth: 260 }}
                        value={employee.department}
                        onChange={() => {}}
                      >
                        <option>{employee.department}</option>
                      </select>
                    </td>

                    <td style={{ padding: 16 }}>
                      <span style={getStatusBadge(employee.isOnline)}>
                        {employee.isOnline ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td style={{ padding: 16 }}>
                      <div style={actionsGroup}>
                        <button
                          type="button"
                          style={actionBtnPrimary}
                          title="Edit"
                          onClick={() => openEdit(employee)}
                        >
                          <IconPencil />
                        </button>

                        <button
                          type="button"
                          style={actionBtnDanger}
                          title="Delete"
                          onClick={() => onDelete(employee)}
                          disabled={deletingId === employee.id}
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
            <div style={listFooter}>
              <span style={listFooterText}>
                Showing {employeeListStartItem} to {employeeListEndItem} of{" "}
                {employees.length} employees
              </span>

              <div style={listPagination}>
                <button
                  type="button"
                  style={listPageBtn}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    style={
                      page === p
                        ? { ...listPageBtn, ...listPageBtnActive }
                        : listPageBtn
                    }
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  style={listPageBtn}
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {viewing && (
          <div onClick={() => setViewing(null)} style={modalOverlay}>
            <div onClick={(ev) => ev.stopPropagation()} style={modalCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {renderAvatar(viewing)}

                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 24,
                        color: "var(--text)",
                      }}
                    >
                      {viewing.name}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      {viewing.role} • {viewing.department}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={baseButton}
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <div style={fieldLabel}>Name</div>
                  <div style={fieldValue}>{viewing.name}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Email</div>
                  <div style={fieldValue}>{viewing.email}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Matricule</div>
                  <div style={fieldValue}>{viewing.matricule}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Job title</div>
                  <div style={fieldValue}>{viewing.role}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Department</div>
                  <div style={fieldValue}>{viewing.department}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Seniority</div>
                  <div style={{ ...fieldValue, marginTop: 8 }}>
                    <span style={getSeniorityBadge(viewing.seniority)}>
                      {viewing.seniority}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={fieldLabel}>Total experience</div>
                  <div style={fieldValue}>{formatYears(viewing.experienceYears)}</div>
                </div>

                <div>
                  <div style={fieldLabel}>Status</div>
                  <div style={{ ...fieldValue, marginTop: 8 }}>
                    <span style={getStatusBadge(viewing.isOnline)}>
                      {viewing.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 18,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ ...fieldLabel, marginBottom: 10 }}>Experience details</div>
                {viewing.experienceYears <= 0 &&
                viewing.experienceSegments.length === 0 ? (
                  <div
                    style={{
                      color: "var(--muted)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    None recorded.
                  </div>
                ) : viewing.experienceSegments.length === 0 ? (
                  <div style={{ ...fieldValue, fontSize: 14 }}>
                    {formatYears(viewing.experienceYears)} — no segments recorded.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      maxHeight: "min(320px, 45vh)",
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {viewing.experienceSegments.map((seg, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          padding: "12px 14px",
                          background: "var(--surface-2, var(--surface))",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 14,
                            color: "var(--text)",
                            marginBottom: 8,
                          }}
                        >
                          {seg.fromYear}–{seg.toYear}
                        </div>
                        {seg.company?.trim() ? (
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#475569",
                              marginBottom: 8,
                            }}
                          >
                            {seg.company.trim()}
                          </div>
                        ) : null}
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text)",
                            lineHeight: 1.45,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                            Domains:{" "}
                          </span>
                          {seg.domainIds.length
                            ? seg.domainIds
                                .map((id) => domainLabelById.get(id) || id)
                                .join(", ")
                            : "—"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>
                          <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                            Skills:{" "}
                          </span>
                          {seg.skillIds.length
                            ? seg.skillIds
                                .map((id) => skillLabelById.get(id) || id)
                                .join(", ")
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div onClick={closeEdit} style={modalOverlay}>
            <div
              onClick={(ev) => ev.stopPropagation()}
              style={editEmployeeModalCard}
            >
              <div
                style={{
                  flexShrink: 0,
                  padding: "18px 20px 0",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 22,
                    color: "var(--text)",
                  }}
                >
                  Edit Employee
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  {editing.name}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "16px 20px 8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 12,
                    alignContent: "start",
                  }}
                >
                <div>
                  <div style={fieldLabel}>Name</div>
                  <input
                    style={{
                      ...searchInput,
                      paddingLeft: 14,
                      marginTop: 6,
                    }}
                    placeholder="Name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div>
                  <div style={fieldLabel}>Email</div>
                  <input
                    style={{
                      ...searchInput,
                      paddingLeft: 14,
                      marginTop: 6,
                    }}
                    type="email"
                    placeholder="Email"
                    value={editing.email}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div>
                  <div style={fieldLabel}>Matricule</div>
                  <input
                    style={{
                      ...searchInput,
                      paddingLeft: 14,
                      marginTop: 6,
                    }}
                    placeholder="Matricule"
                    value={editing.matricule}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, matricule: e.target.value } : prev
                      )
                    }
                  />
                </div>

                <div>
                  <div style={fieldLabel}>Department</div>
                  <select
                    style={{ ...filterSelect, width: "100%", marginTop: 6 }}
                    value={editing.departmentId}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, departmentId: e.target.value } : prev
                      )
                    }
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={fieldLabel}>Job Title</div>
                  <input
                    style={{
                      ...searchInput,
                      paddingLeft: 14,
                      marginTop: 6,
                    }}
                    placeholder="Job Title"
                    value={editForm.jobTitle}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        jobTitle: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <div style={fieldLabel}>Seniority</div>
                  <select
                    style={{ ...filterSelect, width: "100%", marginTop: 6 }}
                    value={editForm.seniorityLevel}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        seniorityLevel: e.target.value as "JUNIOR" | "MID" | "SENIOR",
                      }))
                    }
                  >
                    <option value="JUNIOR">Junior</option>
                    <option value="MID">Mid</option>
                    <option value="SENIOR">Senior</option>
                  </select>
                </div>

                <div>
                  <div style={fieldLabel}>Experience Years</div>
                  <input
                    style={{
                      ...searchInput,
                      paddingLeft: 14,
                      marginTop: 6,
                    }}
                    type="number"
                    min={0}
                    value={editForm.experienceYears}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        experienceYears: Number(e.target.value || 0),
                      }))
                    }
                    placeholder="Experience years"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <ExperienceSegmentsEditor
                    experienceYears={Math.max(0, Number(editForm.experienceYears || 0))}
                    segments={editExperienceSegments}
                    onChange={setEditExperienceSegments}
                    domains={domains}
                    skills={skillOptions}
                    disabled={saving}
                  />
                </div>
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: "14px 20px 18px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                  background: "var(--surface)",
                }}
              >
                <button
                  type="button"
                  style={baseButton}
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  style={primaryButton}
                  onClick={saveEdit}
                  disabled={saving}
                >
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