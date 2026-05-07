// src/pages/hr/users/UsersManagementPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  createUser,
  deleteUser,
  getCurrentUser,
  getUsers,
  updateUserRole,
  updateUser,
  type User,
} from "../../services/users.service";
import {
  getAllDepartments,
  type Department,
} from "../../services/departments.service";
import { ImportUsersModal } from "./components/ImportUsersModal";

/** Normalize DB roles like "HR" -> "HR" */
function normalizeRole(r: any): User["role"] {
  const x = String(r || "").toUpperCase();
  if (
    x === "SUPER MANGER" ||
    x === "SUPER MANAGER" ||
    x === "SUPER_MANAGER"
  ) {
    return "SUPER_MANAGER";
  }
  if (x === "HR") return "HR";
  if (x === "MANAGER") return "MANAGER";
  return "EMPLOYEE";
}

function getRoleFromSession(): User["role"] | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ? normalizeRole(parsed.role) : null;
  } catch {
    return null;
  }
}

function getUserDepartmentValue(u: any): string {
  if (typeof u?.department === "string" && u.department.trim()) {
    return u.department;
  }
  if (typeof u?.departement_id === "string" && u.departement_id.trim()) {
    return u.departement_id;
  }
  if (u?.departement_id && typeof u.departement_id === "object") {
    const id = u.departement_id._id;
    if (typeof id === "string" && id.trim()) return id;
  }
  return "";
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString();
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function toIsoDateForApi(raw?: string) {
  const value = String(raw || "").trim();
  if (!value) return undefined;

  // Convert yyyy-mm-dd from date input to a full ISO date-time string.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function toExportDate(raw?: string | Date | null): string {
  if (!raw) return "";
  const dt = typeof raw === "string" ? new Date(raw) : raw;
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =======================
   Small UI helpers
   ======================= */

type Tone = "neutral" | "success" | "danger";
type BtnVariant = "primary" | "outline" | "danger";

const PILL_TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  neutral: {
    bg: "rgba(100,116,139,0.12)",
    bd: "rgba(100,116,139,0.20)",
    fg: "#334155",
  },
  success: {
    bg: "var(--primary-weak)",
    bd: "var(--primary-border)",
    fg: "var(--primary-soft-text)",
  },
  danger: {
    bg: "rgba(239,68,68,0.10)",
    bd: "rgba(239,68,68,0.20)",
    fg: "#b91c1c",
  },
};

const BTN_BASE: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  textDecoration: "none",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  outline: BTN_BASE,
  primary: {
    ...BTN_BASE,
    border: "1px solid var(--primary-border)",
    background: "var(--primary-weak)",
    color: "var(--primary-soft-text)",
  },
  danger: {
    ...BTN_BASE,
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
  },
};

function Pill({
  text,
  tone = "neutral",
  strong = false,
}: {
  text: string;
  tone?: Tone;
  strong?: boolean;
}) {
  const map = PILL_TONES[tone];

  return (
    <span
      style={{
        padding: strong ? "10px 14px" : "8px 12px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: strong ? 16 : 14,
        lineHeight: 1,
        letterSpacing: strong ? 0.2 : 0,
        whiteSpace: "nowrap",
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
      }}
    >
      {text}
    </span>
  );
}

const IconPencil = () => (
  <svg
    width="16"
    height="16"
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
    width="16"
    height="16"
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

function UserAvatar({
  name,
  email,
  avatarUrl,
  size = 36,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hue =
    ((email || "")
      .split("")
      .reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0) +
      200) %
    360;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `hsl(${hue}, 65%, 92%)`,
        color: "var(--text)",
        fontWeight: 900,
        fontSize: size * 0.4,
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--border)",
      }}
    >
      {initials}
    </div>
  );
}

function Button({
  children,
  variant = "outline",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BTN_STYLES[variant],
        opacity: disabled ? 0.65 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {children}
    </button>
  );
}

/** small modal (no deps) */
function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  right,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = old;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={S.modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={S.modalCard}>
        <div style={S.modalHead}>
          <div>
            <div style={S.modalTitle}>{title}</div>
            {subtitle && (
              <div className="muted" style={{ marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {right}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div style={S.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* =======================
   Types for editing
   ======================= */

type EditableUser = Pick<
  User,
  | "_id"
  | "name"
  | "email"
  | "telephone"
  | "matricule"
  | "department"
  | "date_embauche"
  | "role"
> & {
  departement_id?: string;
  manager_id?: string;
  status?: string;
  isActive?: boolean;
};

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  telephone: string;
  matricule: string;
  date_embauche: string;
  role: User["role"];
  department: string;
};

function toEditable(u: any): EditableUser {
  return {
    _id: u._id,
    name: u.name ?? "",
    email: u.email ?? "",
    telephone: u.telephone ?? "",
    matricule: u.matricule ?? "",
    department: getUserDepartmentValue(u),
    date_embauche: u.date_embauche ?? "",
    role: normalizeRole(u.role),
    departement_id: u.departement_id,
    manager_id: u.manager_id,
    status: u.status,
    isActive: u.isActive,
  };
}

/* =======================
   MAIN PAGE
   ======================= */

const INITIAL_NEW_USER: NewUserForm = {
  name: "",
  email: "",
  password: "",
  telephone: "",
  matricule: "",
  date_embauche: "",
  role: "EMPLOYEE",
  department: "",
};

export default function UsersManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<User["role"] | null>(
    () => getRoleFromSession()
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState<User | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState<EditableUser | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [addForm, setAddForm] = useState<NewUserForm>(INITIAL_NEW_USER);

  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement | null>(null);

  const openAdd = useCallback(() => {
    setAddErr("");
    setAddSaving(false);
    setAddForm(INITIAL_NEW_USER);
    setAddOpen(true);
  }, []);

  useEffect(() => {
    const state = location.state as { openAdd?: boolean } | null;
    if (state?.openAdd) {
      openAdd();
      navigate("/hr/users", { replace: true, state: {} });
    }
  }, [location.state, navigate, openAdd]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    try {
      const [data, depts, me] = await Promise.all([
        getUsers(),
        getAllDepartments(),
        getCurrentUser().catch(() => null),
      ]);

      const normalized = (data as any[]).map((u) => ({
        ...u,
        role: normalizeRole(u.role),
      }));

      setUsers(normalized as User[]);
      setDepartments(depts || []);
      setCurrentUserRole(me?.role ? normalizeRole(me.role) : getRoleFromSession());
    } catch (e: any) {
      setCurrentUserRole(getRoleFromSession());
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d?._id && d?.name) map.set(String(d._id), String(d.name));
    });
    return map;
  }, [departments]);

  const getDepartmentLabel = useCallback(
    (rawValue: string) => {
      const value = String(rawValue || "").trim();
      return departmentNameById.get(value) || value;
    },
    [departmentNameById]
  );

  const filtered = useMemo(() => {
    let result = users;

    const s = q.trim().toLowerCase();
    if (s) {
      result = result.filter((u: any) => {
        const name = String(u.name || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const dep = getDepartmentLabel(getUserDepartmentValue(u)).toLowerCase();
        const mat = String(u.matricule || "").toLowerCase();
        return (
          name.includes(s) ||
          email.includes(s) ||
          dep.includes(s) ||
          mat.includes(s)
        );
      });
    }

    if (filterRole) {
      result = result.filter((u: any) => normalizeRole(u.role) === filterRole);
    }

    if (filterStatus) {
      result = result.filter(
        (u: any) => (u.en_ligne ? "online" : "offline") === filterStatus
      );
    }

    if (filterDepartment) {
      result = result.filter(
        (u: any) => getUserDepartmentValue(u) === filterDepartment
      );
    }

    return result;
  }, [users, q, filterRole, filterStatus, filterDepartment, getDepartmentLabel]);

  const departmentOptions = useMemo(() => {
    const options = new Map<string, string>();

    departments.forEach((d) => {
      const value = String(d?._id || "").trim();
      const label = String(d?.name || "").trim();
      if (value && label) options.set(value, label);
    });

    (users as any[]).forEach((u) => {
      const value = getUserDepartmentValue(u);
      if (!value) return;
      if (!options.has(value)) options.set(value, getDepartmentLabel(value));
    });

    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, departments, getDepartmentLabel]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length]
  );

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [q, filterRole, filterStatus, filterDepartment]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const userListStartItem =
    filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const userListEndItem = Math.min(page * pageSize, filtered.length);

  const onChangeRole = useCallback(
    async (userId: string, role: User["role"]) => {
      setErr("");
      const fixedRole = normalizeRole(role);
      const old = [...users];

      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: fixedRole } : u))
      );

      try {
        await updateUserRole(userId, fixedRole);
      } catch (e: any) {
        setUsers(old);
        setErr(e?.message || "Role update failed");
      }
    },
    [users]
  );

  const onChangeDepartment = useCallback(
    async (userId: string, department: string) => {
      setErr("");
      const old = [...users];

      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, department } : u))
      );

      try {
        await updateUser(userId, { department });
      } catch (e: any) {
        setUsers(old);
        setErr(e?.message || "Department update failed");
      }
    },
    [users]
  );

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const targetRole = normalizeRole(deleteTarget.role);
    if (currentUserRole === "HR" && targetRole === "HR") {
      setErr("Only super manager can delete HR accounts.");
      setDeleteTarget(null);
      return;
    }

    const userId = deleteTarget._id;
    setDeleting(true);
    setErr("");

    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));

      if (selected?._id === userId) setSelected(null);
      if (form?._id === userId) {
        setEditOpen(false);
        setForm(null);
      }

      setDeleteTarget(null);
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selected?._id, form?._id, currentUserRole]);

  const openView = useCallback((u: User) => setSelected(u), []);
  const closeView = useCallback(() => setSelected(null), []);

  const openEdit = useCallback((u: User) => {
    setEditErr("");
    setForm(toEditable(u));
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditErr("");
    setEditSaving(false);
    setForm(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!form) return;

    setEditErr("");

    let validationErr = "";
    if (!form.name.trim()) validationErr = "Name is required.";
    else if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      validationErr = "Valid email is required.";
    } else if (!(form.department || "").trim()) {
      validationErr = "Department is required.";
    } else if (!form.date_embauche) {
      validationErr = "Hire date is required.";
    } else if (!toIsoDateForApi(form.date_embauche)) {
      validationErr = "Hire date must be valid.";
    } else if (!(form.matricule || "").trim()) {
      validationErr = "Matricule is required.";
    } else if (
      !(form.telephone || "").trim() ||
      !/^[+0-9\s-]+$/.test(form.telephone || "")
    ) {
      validationErr = "Valid phone number is required.";
    }

    if (validationErr) {
      setEditErr(validationErr);
      return;
    }

    setEditSaving(true);
    const snapshot = [...users];
    const hireDateIso = toIsoDateForApi(form.date_embauche);

    setUsers((prev) =>
      prev.map((u: any) =>
        u._id === form._id
          ? {
              ...u,
              name: form.name,
              email: form.email,
              telephone: form.telephone || "",
              matricule: form.matricule || "",
              department: form.department || "",
              date_embauche: hireDateIso || "",
              role: normalizeRole(form.role),
            }
          : u
      )
    );

    try {
      await updateUser(form._id, {
        name: form.name,
        email: form.email,
        telephone: form.telephone || undefined,
        matricule: form.matricule || undefined,
        department: form.department || undefined,
        date_embauche: hireDateIso,
        role: normalizeRole(form.role),
      });

      setEditOpen(false);
      setForm(null);
    } catch (e: any) {
      setUsers(snapshot);
      setEditErr(e?.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  }, [form, users]);

  const onlineCount = useMemo(
    () => users.filter((u: any) => u.en_ligne).length,
    [users]
  );

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    setAddErr("");
    setAddSaving(false);
    setAddForm(INITIAL_NEW_USER);
  }, []);

  const saveCreate = useCallback(async () => {
    setAddErr("");

    let validationErr = "";
    if (!addForm.name.trim()) validationErr = "Name is required.";
    else if (
      !addForm.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)
    ) {
      validationErr = "Valid email is required.";
    } else if (!addForm.password.trim()) {
      validationErr = "Password is required.";
    } else if (addForm.password.length < 8) {
      validationErr = "Password must contain at least 8 characters.";
    } else if (!/\d/.test(addForm.password)) {
      validationErr = "Password must contain at least one number.";
    } else if (!addForm.date_embauche) {
      validationErr = "Hire date is required.";
    } else if (!toIsoDateForApi(addForm.date_embauche)) {
      validationErr = "Hire date must be valid.";
    } else if (!addForm.matricule.trim()) {
      validationErr = "Matricule is required.";
    } else if (
      !addForm.telephone.trim() ||
      !/^[+0-9\s-]+$/.test(addForm.telephone)
    ) {
      validationErr = "Valid phone number is required.";
    }

    if (validationErr) {
      setAddErr(validationErr);
      return;
    }

    setAddSaving(true);

    try {
      const hireDateIso = toIsoDateForApi(addForm.date_embauche);
      const payload: any = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password.trim(),
        role: normalizeRole(addForm.role),
        department: addForm.department || undefined,
        telephone: addForm.telephone || undefined,
        matricule: addForm.matricule || undefined,
        date_embauche: hireDateIso,
      };

      const created = await createUser(payload);
      setUsers((prev) => [
        ...prev,
        { ...created, role: normalizeRole((created as any).role) } as User,
      ]);
      closeAdd();
    } catch (e: any) {
      setAddErr(e?.message || "Failed to create user");
    } finally {
      setAddSaving(false);
    }
  }, [addForm, closeAdd]);

  const exportUsers = useCallback(() => {
    const rows = filtered.map((u: any) => {
      const departmentId = getUserDepartmentValue(u);
      return {
        name: String(u.name || ""),
        email: String(u.email || ""),
        role: normalizeRole(u.role),
        department: getDepartmentLabel(departmentId),
        matricule: String(u.matricule || ""),
        telephone: String(u.telephone || ""),
        date_embauche: toExportDate(u.date_embauche),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "name",
        "email",
        "role",
        "department",
        "matricule",
        "telephone",
        "date_embauche",
      ],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "users");
    XLSX.writeFile(wb, "users_export.xlsx");
  }, [filtered, getDepartmentLabel]);

  useEffect(() => {
    if (!excelMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!excelMenuRef.current) return;
      if (!excelMenuRef.current.contains(event.target as Node)) {
        setExcelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [excelMenuOpen]);

  return (
    <div style={S.pageContainer}>
      <div style={S.statsRow}>
        <div style={{ ...S.statCard, borderLeftColor: "rgba(59,130,246,0.5)" }}>
          <div style={S.statCardInner}>
            <span style={S.statValue}>{users.length}</span>
            <span style={S.statLabel}>Total Users</span>
          </div>
        </div>

        <div style={{ ...S.statCard, borderLeftColor: "var(--primary-border)" }}>
          <div style={S.statCardInner}>
            <span style={{ ...S.statValue, color: "var(--primary-soft-text)" }}>{onlineCount}</span>
            <span style={S.statLabel}>Online</span>
          </div>
        </div>

        <div style={{ ...S.statCard, borderLeftColor: "rgba(100,116,139,0.4)" }}>
          <div style={S.statCardInner}>
            <span style={{ ...S.statValue, color: "var(--muted)" }}>
              {users.length - onlineCount}
            </span>
            <span style={S.statLabel}>Offline</span>
          </div>
        </div>
      </div>

      <div style={S.headerTop}>
        <div style={S.pageTitle}>User Management</div>
        <div style={S.pageSubtitle}>Manage accounts, roles, and access.</div>
      </div>

      <div style={S.searchCard}>
        <div style={S.headerRow}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              className="input"
              placeholder="Name, email, matricule…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={S.searchInput}
            />
          </div>
        </div>

        <div style={S.filtersRow}>
          <div style={S.filtersGroup}>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={S.roleSelect}
              aria-label="Filter users by role"
            >
              <option value="">All Roles</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="SUPER_MANAGER">SUPER MANGER</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={S.roleSelect}
              aria-label="Filter users by status"
            >
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={S.roleSelect}
              aria-label="Filter users by department"
            >
              <option value="">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          <div style={S.headerActions}>
            <div style={{ position: "relative" }} ref={excelMenuRef}>
              <button
                className="btn"
                onClick={() => setExcelMenuOpen((prev) => !prev)}
                disabled={loading}
                style={S.simpleBtn}
              >
                Excel Options ▾
              </button>
              {excelMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    minWidth: 180,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    background: "var(--surface)",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                    overflow: "hidden",
                    zIndex: 20,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "var(--text)",
                    }}
                    onClick={() => {
                      setExcelMenuOpen(false);
                      setImportOpen(true);
                    }}
                  >
                    Import Excel
                  </button>
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      border: "none",
                      borderTop: "1px solid var(--border)",
                      background: "transparent",
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "var(--text)",
                    }}
                    onClick={() => {
                      setExcelMenuOpen(false);
                      exportUsers();
                    }}
                    disabled={loading || filtered.length === 0}
                  >
                    Export Excel
                  </button>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={openAdd}
              disabled={loading}
              style={S.addBtn}
            >
              + Add
            </button>
          </div>
        </div>

        <ImportUsersModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={load}
        />

        {err && (
          <div style={S.errorBox}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
          </div>
        )}
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.thAvatar}></th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Department</th>
              <th style={S.th}>Status</th>
              <th style={S.thActions}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.map((u: any, i) => (
              <tr
                key={u._id}
                style={{
                  ...S.tr,
                  background: i % 2 === 1 ? "var(--surface-2)" : "var(--surface)",
                }}
              >
                <td style={S.tdAvatar}>
                  <UserAvatar
                    name={u.name}
                    email={u.email}
                    avatarUrl={u.avatarUrl}
                    size={60}
                  />
                </td>

                <td style={S.tdName}>
                  <button
                    type="button"
                    onClick={() => openView(u)}
                    style={S.nameLinkBtn}
                    title="View details"
                  >
                    {u.name}
                  </button>
                </td>

                <td style={S.td}>
                  <select
                    className="select"
                    value={normalizeRole(u.role)}
                    onChange={(e) =>
                      onChangeRole(u._id, normalizeRole(e.target.value))
                    }
                    style={S.tableSelect}
                    aria-label={`Role for ${u.name}`}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="SUPER_MANAGER">SUPER MANGER</option>
                  </select>
                </td>

                <td style={S.td}>
                  <select
                    className="select"
                    value={getUserDepartmentValue(u)}
                    onChange={(e) => onChangeDepartment(u._id, e.target.value)}
                    style={S.tableSelect}
                    aria-label={`Department for ${u.name}`}
                  >
                    <option value="">No dept</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={S.td}>
                  <Pill
                    text={u.en_ligne ? "Online" : "Offline"}
                    tone={u.en_ligne ? "success" : "neutral"}
                    strong
                  />
                </td>

                <td style={S.tdActions}>
                  <div style={S.actionsGroup}>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      style={{ ...S.actionBtn, ...S.actionBtnPrimary }}
                      title="Edit"
                    >
                      <IconPencil />
                    </button>

                    {!(currentUserRole === "HR" && normalizeRole(u.role) === "HR") ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        style={{ ...S.actionBtn, ...S.actionBtnDanger }}
                        title="Delete"
                      >
                        <IconTrash />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={S.emptyCell}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <div style={S.listFooter}>
            <span style={S.listFooterText}>
              Showing {userListStartItem} to {userListEndItem} of {filtered.length}{" "}
              users
            </span>

            <div style={S.listPagination}>
              <button
                type="button"
                style={S.listPageBtn}
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
                      ? { ...S.listPageBtn, ...S.listPageBtnActive }
                      : S.listPageBtn
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                style={S.listPageBtn}
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          style={S.modalBackdrop}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div style={S.deleteModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>
                Delete user?
              </div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 14 }}>
                <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) will be
                permanently deleted.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirmDelete}
                disabled={deleting}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        title={selected ? `${selected.name} — Details` : "User Details"}
        subtitle="Full user details"
        onClose={closeView}
        right={
          selected ? (
            <Button
              variant="primary"
              onClick={() => {
                closeView();
                openEdit(selected);
              }}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {selected && <UserDetailsGrid user={selected as any} getDepartmentLabel={getDepartmentLabel} />}
      </Modal>

      <Modal
        open={editOpen}
        title={form ? `Edit — ${form.name || "User"}` : "Edit User"}
        subtitle="HR can update any user account"
        onClose={closeEdit}
        right={
          <Button
            variant="primary"
            onClick={saveEdit}
            disabled={editSaving || !form}
          >
            {editSaving ? "Saving..." : "Save changes"}
          </Button>
        }
      >
        {editErr && (
          <div style={S.errorBox}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{editErr}</span>
          </div>
        )}

        {form && (
          <EditForm
            value={form}
            onChange={setForm}
            onChangeRole={(role) =>
              setForm((p) => (p ? { ...p, role } : p))
            }
            departmentOptions={departmentOptions}
          />
        )}
      </Modal>

      <Modal
        open={addOpen}
        title="Add Employee"
        subtitle="Create a new user account"
        onClose={closeAdd}
        right={
          <Button variant="primary" onClick={saveCreate} disabled={addSaving}>
            {addSaving ? "Creating…" : "Create"}
          </Button>
        }
      >
        {addErr && (
          <div style={S.errorBox}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{addErr}</span>
          </div>
        )}

        <AddUserForm
          value={addForm}
          onChange={setAddForm}
          departmentOptions={departmentOptions}
        />
      </Modal>
    </div>
  );
}

/* =======================
   Extracted components
   ======================= */

function UserDetailsGrid({
  user,
  getDepartmentLabel,
}: {
  user: any;
  getDepartmentLabel: (rawValue: string) => string;
}) {
  const resolvedDepartment = getDepartmentLabel(getUserDepartmentValue(user)) || "-";
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={S.detailsHeader}>
        <UserAvatar
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          size={56}
        />

        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>
            {user.name}
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{user.email}</div>
          <div style={{ marginTop: 8 }}>
            <Pill
              text={normalizeRole(user.role)}
              tone={
                ["HR", "SUPER_MANAGER"].includes(normalizeRole(user.role))
                  ? "success"
                  : "neutral"
              }
            />
          </div>
        </div>
      </div>

      <div style={S.detailsGrid}>
        <div className="card" style={S.infoCard}>
          <div style={S.blockTitle}>Identity</div>

          <div className="muted">Matricule</div>
          <div style={S.blockValue}>{user.matricule || "-"}</div>

          <div className="muted">Phone</div>
          <div style={S.blockValue}>{user.telephone || "-"}</div>
        </div>

        <div className="card" style={S.infoCard}>
          <div style={S.blockTitle}>Account</div>

          <div className="muted">Email</div>
          <div style={S.blockValue}>{user.email}</div>

          <div className="muted">Role</div>
          <div style={S.blockValue}>{normalizeRole(user.role)}</div>

          <div className="muted">Status</div>
          <div style={S.blockValue}>
            {user.status || (user.isActive ? "active" : "inactive") || "-"}
          </div>
        </div>

        <div className="card" style={S.infoCard}>
          <div style={S.blockTitle}>Work</div>

          <div className="muted">Department</div>
          <div style={S.blockValue}>{resolvedDepartment}</div>

          <div className="muted">Manager ID</div>
          <div style={S.blockValue}>{user.manager_id || "-"}</div>
        </div>

        <div className="card" style={S.infoCard}>
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

        <div className="card" style={{ ...S.infoCard, gridColumn: "1 / -1" }}>
          <div style={S.blockTitle}>Flags</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill text={`Online: ${user.en_ligne ? "Yes" : "No"}`} tone={user.en_ligne ? "success" : "neutral"} />
            <Pill text={`Active: ${user.isActive ? "Yes" : "No"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditForm({
  value,
  onChange,
  onChangeRole,
  departmentOptions,
}: {
  value: EditableUser;
  onChange: React.Dispatch<React.SetStateAction<EditableUser | null>>;
  onChangeRole: (role: User["role"]) => void;
  departmentOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <div style={S.formGrid}>
      <div className="card" style={S.infoCard}>
        <div style={S.blockTitle}>Basic</div>

        <Label text="Name *" />
        <input
          className="input"
          value={value.name}
          onChange={(e) => onChange((p) => (p ? { ...p, name: e.target.value } : p))}
        />

        <div style={S.spacerSm} />

        <Label text="Email *" />
        <input
          className="input"
          value={value.email}
          onChange={(e) => onChange((p) => (p ? { ...p, email: e.target.value } : p))}
        />

        <div style={S.spacerSm} />

        <Label text="Role" />
        <select
          className="select"
          value={normalizeRole(value.role)}
          onChange={(e) => onChangeRole(normalizeRole(e.target.value))}
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
          <option value="SUPER_MANAGER">SUPER MANGER</option>
        </select>
      </div>

      <div className="card" style={S.infoCard}>
        <div style={S.blockTitle}>Work</div>

        <Label text="Department *" />
        <select
          className="select"
          value={value.department || ""}
          onChange={(e) => onChange((p) => (p ? { ...p, department: e.target.value } : p))}
        >
          <option value="">Select department</option>
          {departmentOptions.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>

        <div style={S.spacerSm} />

        <Label text="Hire date *" />
        <input
          className="input"
          type="date"
          value={value.date_embauche ? String(value.date_embauche).slice(0, 10) : ""}
          onChange={(e) => onChange((p) => (p ? { ...p, date_embauche: e.target.value } : p))}
        />

        <div style={S.spacerSm} />

        <Label text="Matricule *" />
        <input
          className="input"
          value={value.matricule || ""}
          onChange={(e) => onChange((p) => (p ? { ...p, matricule: e.target.value } : p))}
        />

        <div style={S.spacerSm} />

        <Label text="Telephone *" />
        <input
          className="input"
          value={value.telephone || ""}
          onChange={(e) => onChange((p) => (p ? { ...p, telephone: e.target.value } : p))}
        />
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
      {text}
    </div>
  );
}

function AddUserForm({
  value,
  onChange,
  departmentOptions,
}: {
  value: NewUserForm;
  onChange: React.Dispatch<React.SetStateAction<NewUserForm>>;
  departmentOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <div style={S.formGrid}>
      <div className="card" style={S.infoCard}>
        <div style={S.blockTitle}>Basic Information</div>

        <Label text="Name *" />
        <input
          className="input"
          placeholder="Full name"
          autoComplete="off"
          value={value.name}
          onChange={(e) => onChange((p) => ({ ...p, name: e.target.value }))}
        />

        <div style={S.spacerSm} />

        <Label text="Email *" />
        <input
          className="input"
          type="email"
          placeholder="email@company.com"
          autoComplete="off"
          value={value.email}
          onChange={(e) => onChange((p) => ({ ...p, email: e.target.value }))}
        />

        <div style={S.spacerSm} />

        <Label text="Password *" />
        <input
          className="input"
          type="password"
          placeholder="Min. 8 characters, at least 1 number"
          autoComplete="new-password"
          value={value.password}
          onChange={(e) => onChange((p) => ({ ...p, password: e.target.value }))}
        />

        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          Minimum 8 characters and 1 number required
        </div>

        <div style={S.spacerSm} />

        <Label text="Role" />
        <select
          className="select"
          value={value.role}
          onChange={(e) => onChange((p) => ({ ...p, role: normalizeRole(e.target.value) }))}
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
          <option value="SUPER_MANAGER">SUPER MANGER</option>
        </select>
      </div>

      <div className="card" style={S.infoCard}>
        <div style={S.blockTitle}>Professional Information</div>

        <Label text="Department" />
        <select
          className="select"
          value={value.department}
          onChange={(e) => onChange((p) => ({ ...p, department: e.target.value }))}
        >
          <option value="">Select department</option>
          {departmentOptions.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>

        <div style={S.spacerSm} />

        <Label text="Hire Date *" />
        <input
          className="input"
          type="date"
          value={value.date_embauche}
          onChange={(e) => onChange((p) => ({ ...p, date_embauche: e.target.value }))}
        />

        <div style={S.spacerSm} />

        <Label text="Matricule *" />
        <input
          className="input"
          placeholder="E.g: EMP-001"
          value={value.matricule}
          onChange={(e) => onChange((p) => ({ ...p, matricule: e.target.value }))}
        />

        <div style={S.spacerSm} />

        <Label text="Phone *" />
        <input
          className="input"
          placeholder="E.g: +216 12 345 678"
          value={value.telephone}
          onChange={(e) => onChange((p) => ({ ...p, telephone: e.target.value }))}
        />
      </div>
    </div>
  );
}

/* =======================
   Styles
   ======================= */

const S: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: 20,
    borderRadius: 0,
    background: "transparent",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 24,
  },

  statCard: {
    padding: "18px 20px",
    borderRadius: 16,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderLeft: "4px solid rgba(15,23,42,0.12)",
  },

  statCardInner: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },

  statValue: {
    fontSize: 34,
    fontWeight: 900,
    color: "var(--text)",
    lineHeight: 1,
  },

  statLabel: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--muted)",
    whiteSpace: "nowrap",
  },

  pageTitle: {
    fontSize: 40,
    fontWeight: 900,
    color: "var(--text)",
    lineHeight: 1.1,
  },

  pageSubtitle: {
    fontSize: 21,
    fontWeight: 700,
    color: "#334155",
    marginTop: 8,
    lineHeight: 1.3,
  },

  headerTop: {
    marginBottom: 16,
  },

  searchCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  simpleBtn: {
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 16,
    padding: "12px 16px",
    border: "1px solid var(--input-border)",
    background: "var(--surface)",
    color: "var(--text)",
  },

  addBtn: {
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 16,
    padding: "12px 16px",
    background: "#065f46",
    border: "1px solid #065f46",
    color: "#ffffff",
  },

  searchWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    minWidth: 280,
    flex: "1 1 320px",
    maxWidth: 420,
  },

  searchIcon: {
    position: "absolute",
    left: 12,
    fontSize: 16,
    opacity: 0.6,
  },

  searchInput: {
    width: "100%",
    fontSize: 16,
    paddingLeft: 40,
    borderRadius: 12,
    border: "1px solid var(--input-border)",
  },

  filtersRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },

  filtersGroup: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    flex: "1 1 520px",
  },

  roleSelect: {
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid var(--input-border)",
    fontWeight: 800,
    fontSize: 16,
    minWidth: 170,
  },

  tableSelect: {
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid var(--input-border)",
    fontWeight: 800,
    fontSize: 16,
    width: "100%",
    minWidth: 150,
  },

  errorBox: {
    marginTop: 12,
    padding: 12,
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 12,
    background: "rgba(239,68,68,0.06)",
  },

  tableWrap: {
    overflowX: "auto",
    marginTop: 0,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
  },

  thAvatar: {
    width: 86,
    padding: "14px 6px",
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border)",
  },

  th: {
    padding: "14px 6px",
    textAlign: "left",
    fontSize: 18,
    fontWeight: 900,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border)",
  },

  thActions: {
    width: 120,
    minWidth: 120,
    padding: "14px 6px",
    textAlign: "left",
    fontSize: 18,
    fontWeight: 900,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border)",
  },

  tr: {
    borderBottom: "1px solid var(--border)",
  },

  tdAvatar: {
    padding: "14px 6px",
    fontSize: 18,
    fontWeight: 600,
  },

  td: {
    padding: "14px 6px",
    fontSize: 18,
    fontWeight: 600,
  },

  tdName: {
    padding: "14px 6px",
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text)",
  },

  nameLinkBtn: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: "var(--text)",
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    textAlign: "left",
    textDecoration: "none",
  },

  tdActions: {
    padding: "14px 6px",
    fontSize: 18,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  actionsGroup: {
    display: "inline-flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 0,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
  },

  actionBtn: {
    width: 38,
    height: 38,
    border: "none",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    background: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  actionBtnPrimary: {
    color: "#166534",
    borderRight: "1px solid var(--border)",
  },

  actionBtnDanger: {
    color: "#b91c1c",
    borderRight: "none",
  },

  emptyCell: {
    padding: 32,
    textAlign: "center",
    color: "var(--muted)",
    fontWeight: 800,
    fontSize: 18,
  },

  listFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    padding: "12px 14px",
    borderTop: "1px solid rgba(15,23,42,0.08)",
  },

  listFooterText: {
    color: "var(--muted)",
    fontSize: 14,
    fontWeight: 600,
  },

  listPagination: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  listPageBtn: {
    minWidth: 40,
    height: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    cursor: "pointer",
  },

  listPageBtnActive: {
    background: "var(--primary)",
    color: "var(--primary-on)",
    border: "1px solid var(--primary)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.5)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: 16,
  },

  modalCard: {
    width: "min(860px, 96vw)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    background: "var(--surface)",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
  },

  modalBody: {
    marginTop: 12,
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: 4,
  },

  modalHead: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: 900,
    color: "var(--text)",
  },

  deleteModalCard: {
    background: "var(--surface)",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
  },

  detailsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
    flexWrap: "wrap",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  infoCard: {
    padding: 10,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
  },

  blockTitle: {
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 10,
    color: "var(--text)",
  },

  blockValue: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 10,
    color: "var(--text)",
  },

  spacerSm: {
    height: 10,
  },
};