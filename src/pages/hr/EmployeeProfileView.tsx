// src/pages/hr/EmployeeProfileView.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAllEmployees, type EmployeeRecord } from "../../services/employee.service";
import { getUsers, type User } from "../../services/users.service";
import { getAllDepartments, type Department } from "../../services/departments.service";

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

function normalizeSeniority(v: any): "JUNIOR" | "MID" | "SENIOR" {
  const s = String(v || "").toUpperCase();
  if (s === "MID") return "MID";
  if (s === "SENIOR") return "SENIOR";
  return "JUNIOR";
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("fr-FR");
}

function formatYears(y: number | undefined) {
  if (y == null) return "—";
  return `${y} ${y === 1 ? "an" : "ans"}`;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((s) => s[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const S = {
  page: { padding: "24px 20px", maxWidth: 860, margin: "0 auto" } as React.CSSProperties,
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 10, border: "1px solid #eaecef",
    background: "#fff", fontWeight: 800, cursor: "pointer", color: "#334155", marginBottom: 20,
  } as React.CSSProperties,
  hero: {
    background: "#fff", border: "1px solid #eaecef", borderRadius: 18,
    padding: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
  } as React.CSSProperties,
  avatar: (hue: number): React.CSSProperties => ({
    width: 80, height: 80, borderRadius: 999,
    background: `hsl(${hue}, 65%, 92%)`, color: "#0f172a",
    fontWeight: 900, fontSize: 28, display: "grid", placeItems: "center",
    border: "1px solid rgba(15,23,42,0.08)", flexShrink: 0,
  }),
  heroInfo: { flex: 1, minWidth: 200 } as React.CSSProperties,
  heroName: { fontSize: 28, fontWeight: 950, color: "#0f172a", lineHeight: 1.1 } as React.CSSProperties,
  heroRole: { fontSize: 15, fontWeight: 700, color: "#64748b", marginTop: 4 } as React.CSSProperties,
  badge: (bg: string, color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", padding: "4px 10px",
    borderRadius: 999, background: bg, color, fontWeight: 900, fontSize: 12, marginTop: 8,
  }),
  grid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", 
    gap: 14, 
    marginTop: 14 
  } as React.CSSProperties,
  card: { 
    background: "#fff", border: "1px solid #eaecef", borderRadius: 16, padding: 18 
  } as React.CSSProperties,
  cardTitle: {
    fontWeight: 900, fontSize: 13, color: "#64748b",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14,
  } as React.CSSProperties,
  fieldRow: { marginBottom: 12 } as React.CSSProperties,
  fieldLabel: { fontSize: 12, fontWeight: 700, color: "#94a3b8" } as React.CSSProperties,
  fieldValue: { fontWeight: 800, color: "#0f172a", marginTop: 2 } as React.CSSProperties,
  errorBox: {
    padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)",
    background: "rgba(239,68,68,0.06)", color: "#b91c1c", fontWeight: 800,
  } as React.CSSProperties,
  loading: { 
    color: "#64748b", fontWeight: 700, padding: 32, textAlign: "center" 
  } as React.CSSProperties,
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={S.fieldRow}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={S.fieldValue}>{value ?? "—"}</div>
    </div>
  );
}

export default function EmployeeProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [users, employees, depts] = await Promise.all([
          getUsers(),
          getAllEmployees(),
          getAllDepartments(),
        ]);
        if (cancelled) return;

        const foundEmployee =
          employees.find((e) => String(e._id) === id) ??
          employees.find((e) => {
            if (typeof e.user_id === "object" && e.user_id !== null) {
              return String(e.user_id._id) === id;
            }
            return false;
          }) ??
          null;

        let foundUser = users.find((u) => u._id === id) ?? null;

        if (!foundUser && foundEmployee) {
          const userIdFromEmployee =
            typeof foundEmployee.user_id === "object" && foundEmployee.user_id !== null
              ? String(foundEmployee.user_id._id)
              : typeof foundEmployee.user_id === "string"
              ? foundEmployee.user_id
              : null;

          if (userIdFromEmployee) {
            foundUser = users.find((u) => u._id === userIdFromEmployee) ?? null;
          }
        }

        setUser(foundUser);
        setEmployee(foundEmployee);
        setDepartments(depts || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d?._id && d?.name) map.set(String(d._id), String(d.name));
    });
    return map;
  }, [departments]);

  const departmentName = useMemo(() => {
    const u = user as any;
    const depRaw = u?.department || u?.departement_id;
    if (!depRaw) return "—";
    if (typeof depRaw === "object" && depRaw.name) return depRaw.name;
    return departmentNameById.get(String(depRaw)) || String(depRaw);
  }, [user, departmentNameById]);

  const hue = useMemo(() => {
    return (user?.email || "").split("").reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0);
  }, [user?.email]);

  const seniority = normalizeSeniority(employee?.seniorityLevel);
  const sc = {
    JUNIOR: { bg: "#e0f2fe", fg: "#0369a1" },
    MID: { bg: "#fef9c3", fg: "#854d0e" },
    SENIOR: { bg: "#dcfce7", fg: "#166534" },
  }[seniority];

  if (loading) return <div style={S.loading}>Loading profile…</div>;

  if (error) return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
      <div style={S.errorBox}>{error}</div>
    </div>
  );

  if (!user && !employee) return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={() => navigate(-1)}>← Back</button>
      <div style={S.errorBox}>Employee not found.</div>
    </div>
  );

  const name = user?.name ||
    (typeof employee?.user_id === "object" && employee?.user_id !== null
      ? employee.user_id.name
      : null) || "Unknown";

  const email = user?.email ||
    (typeof employee?.user_id === "object" && employee?.user_id !== null
      ? employee.user_id.email
      : null) || "—";

  const role = user?.role ||
    (typeof employee?.user_id === "object" && employee?.user_id !== null
      ? employee.user_id.role
      : null) || "EMPLOYEE";

  return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={() => navigate(`${getBasePath()}/employees`)}>
        ← Back to Employees
      </button>

      <div style={S.hero}>
        <div style={S.avatar(hue)}>{getInitials(name)}</div>
        <div style={S.heroInfo}>
          <div style={S.heroName}>{name}</div>
          <div style={S.heroRole}>{employee?.jobTitle || "No job title"} · {departmentName}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span style={S.badge("#e0f2fe", "#0369a1")}>{String(role).toUpperCase()}</span>
            <span style={S.badge(sc.bg, sc.fg)}>{seniority}</span>
            {employee?.experienceYears != null && (
              <span style={S.badge("#f1f5f9", "#475569")}>{formatYears(Number(employee.experienceYears))}</span>
            )}
          </div>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardTitle}>Identity</div>
          <Field label="Full name" value={name} />
          <Field label="Email" value={email} />
          <Field label="Phone" value={user?.telephone} />
          <Field label="Matricule" value={user?.matricule} />
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Work</div>
          <Field label="Job Title" value={employee?.jobTitle || "Not assigned"} />
          <Field label="Department" value={departmentName} />
          <Field label="Seniority" value={seniority} />
          <Field label="Experience" value={formatYears(employee?.experienceYears)} />
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Account</div>
          <Field label="Role" value={String(role).toUpperCase()} />
          <Field label="Hire date" value={fmtDate(user?.date_embauche)} />
          <Field label="Last login" value={fmtDate((user as any)?.lastLogin)} />
          <Field label="Status" value={(user as any)?.en_ligne ? "🟢 Online" : "⚫ Offline"} />
        </div>

      </div>
    </div>
  );
}