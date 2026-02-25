import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteUser,
  getUsers,
  updateUserRole,updateUser,
  type User,
} from "../../services/users.service";

/** Normalize DB roles like "HR" -> "hr" */
function normalizeRole(r: any): User["role"] {
  const x = String(r || "").toUpperCase();
  if (x === "HR") return "HR";
  if (x === "MANAGER") return "MANAGER";
  return "EMPLOYEE";
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

/* =======================
   Small UI helpers
   ======================= */

type Tone = "neutral" | "success" | "danger";
type BtnVariant = "primary" | "outline" | "danger";

const PILL_TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  neutral: { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.20)", fg: "#334155" },
  success: { bg: "rgba(22,163,74,0.12)", bd: "rgba(22,163,74,0.20)", fg: "#166534" },
  danger: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#b91c1c" },
};

const BTN_BASE: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  border: "1px solid var(--border)",
  background: "#fff",
  color: "var(--heading)",
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
    border: "1px solid rgba(31,122,90,0.20)",
    background: "rgba(31,122,90,0.10)",
    color: "#145a41",
  },
  danger: {
    ...BTN_BASE,
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
  },
};

function Pill({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  const map = PILL_TONES[tone];
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {right}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* =======================
   Types for editing
   ======================= */

type EditableUser = Pick<
  User,
  "_id" | "name" | "email" | "telephone" | "matricule" | "department" | "date_embauche" | "role"
> & {
  // some backends use these names; we keep them optional
  departement_id?: string;
  manager_id?: string;
  status?: string;
  isActive?: boolean;
  emailVerified?: boolean;
};

function toEditable(u: any): EditableUser {
  return {
    _id: u._id,
    name: u.name ?? "",
    email: u.email ?? "",
    telephone: u.telephone ?? "",
    matricule: u.matricule ?? "",
    department: u.department ?? u.departement_id ?? "",
    date_embauche: u.date_embauche ?? "",
    role: normalizeRole(u.role),
    departement_id: u.departement_id,
    manager_id: u.manager_id,
    status: u.status,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
  };
}

/* =======================
   MAIN PAGE
   ======================= */

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // view modal
  const [selected, setSelected] = useState<User | null>(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState<EditableUser | null>(null);

  // search
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await getUsers();

      const normalized = (data as any[]).map((u) => ({
        ...u,
        role: normalizeRole(u.role),
      }));

      setUsers(normalized as User[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;

    return (users as any[]).filter((u) => {
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const dep = String(u.department || (u as any).departement_id || "").toLowerCase();
      const mat = String((u as any).matricule || "").toLowerCase();
      return name.includes(s) || email.includes(s) || dep.includes(s) || mat.includes(s);
    });
  }, [users, q]);

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

  const onDelete = useCallback(
    async (userId: string) => {
      if (!confirm("Delete this user?")) return;
      setErr("");

      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        if (selected?._id === userId) setSelected(null);
        if (form?._id === userId) {
          setEditOpen(false);
          setForm(null);
        }
      } catch (e: any) {
        setErr(e?.message || "Delete failed");
      }
    },
    [selected?._id, form?._id]
  );

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

  // ✅ IMPORTANT:
  // This function assumes you ALREADY have a backend endpoint to update user fields.
  // You can connect it to your service like: updateUser(userId, payload)
  // For now, we keep it as a safe placeholder so the file compiles.
  const saveEdit = useCallback(async () => {
    if (!form) return;

    setEditErr("");

    // basic client validation
    if (!form.name.trim()) return setEditErr("Name is required.");
    if (!form.email.trim()) return setEditErr("Email is required.");

    setEditSaving(true);

    // optimistic snapshot
    const snapshot = [...users];

    // optimistic UI update
    setUsers((prev) =>
      prev.map((u: any) =>
        u._id === form._id
          ? {
              ...u,
              name: form.name,
              email: form.email,
              telephone: form.telephone,
              matricule: form.matricule,
              department: form.department,
              date_embauche: form.date_embauche,
              role: normalizeRole(form.role),
            }
          : u
      )
    );

    try {
      // TODO: replace this with your real API call
      // await updateUser(form._id, {
      //   name: form.name,
      //   email: form.email,
      //   telephone: form.telephone,
      //   matricule: form.matricule,
      //   department: form.department,
      //   date_embauche: form.date_embauche,
      //   role: normalizeRole(form.role),
      // });

      // If you DON'T have updateUser yet, do not silently succeed.
      // We throw to remind you to connect the service properly.
     await updateUser(form._id, {
  name: form.name,
  email: form.email,
  telephone: form.telephone,
  matricule: form.matricule,
  department: form.department,
  date_embauche: form.date_embauche,
  role: normalizeRole(form.role),
});

setEditOpen(false);
setForm(null);
    } catch (e: any) {
      // rollback
      setUsers(snapshot);
      setEditErr(e?.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  }, [form, users]);

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header */}
      <div style={S.headerRow}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>User Management</div>
          <div className="muted">Manage accounts, roles, and access.</div>
        </div>

        <div style={S.headerActions}>
          <input
            className="input"
            placeholder="Search name, email, matricule…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />

          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div style={S.errorBox}>
          <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Email</th>
              <th style={{ padding: 10 }}>Matricule</th>
              <th style={{ padding: 10 }}>Telephone</th>
              <th style={{ padding: 10 }}>Hired</th>
              <th style={{ padding: 10 }}>Role</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Last login</th>
              <th style={{ padding: 10, width: 240 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u: any) => (
              <tr key={u._id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 10, fontWeight: 800 }}>{u.name}</td>
                <td style={{ padding: 10 }} className="muted">
                  {u.email}
                </td>
                <td style={{ padding: 10 }}>{u.matricule || "-"}</td>
                <td style={{ padding: 10 }}>{u.telephone || "-"}</td>
                <td style={{ padding: 10 }}>{fmtDate(u.date_embauche)}</td>

                <td style={{ padding: 10 }}>
<select
  className="select"
  value={normalizeRole(u.role)}
  onChange={(e) =>
    onChangeRole(u._id, normalizeRole(e.target.value))
  }
>
  <option value="EMPLOYEE">Employee</option>
  <option value="MANAGER">Manager</option>
  <option value="HR">HR</option>
</select>
                </td>

                <td style={{ padding: 10 }}>
                  <span
                    className="badge"
                    style={{
                      background: u.en_ligne ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.10)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {u.en_ligne ? "Online" : "Offline"}
                  </span>
                </td>

                <td style={{ padding: 10 }} className="muted">
                  {fmtDateTime(u.lastLogin)}
                </td>

                <td style={{ padding: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button variant="outline" onClick={() => openView(u)}>
                      View
                    </Button>

                    <Button variant="primary" onClick={() => openEdit(u)}>
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => onDelete(u._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 14 }} className="muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      <Modal
        open={!!selected}
        title={selected ? `${selected.name} — Details` : "User Details"}
        subtitle="Full user details"
        onClose={closeView}
        right={
          selected ? (
            <Button variant="primary" onClick={() => { closeView(); openEdit(selected); }}>
              Edit
            </Button>
          ) : null
        }
      >
        {selected && <UserDetailsGrid user={selected as any} />}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        title={form ? `Edit — ${form.name || "User"}` : "Edit User"}
        subtitle="HR can update any user account"
        onClose={closeEdit}
        right={
          <Button variant="primary" onClick={saveEdit} disabled={editSaving || !form}>
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
            onChangeRole={(role) => setForm((p) => (p ? { ...p, role } : p))}
          />
        )}

        <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5 }}>
          Note: connect <b>saveEdit()</b> to a real backend endpoint (updateUser) to persist edits.
        </div>
      </Modal>
    </div>
  );
}

/* =======================
   Extracted components
   ======================= */

function UserDetailsGrid({ user }: { user: any }) {
  return (
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
        <div style={S.blockValue}>
          {user.status || (user.isActive ? "active" : "inactive") || "-"}
        </div>
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
          <Pill text={`Online: ${user.en_ligne ? "Yes" : "No"}`} tone={user.en_ligne ? "success" : "neutral"} />
          <Pill text={`isActive: ${user.isActive ? "Yes" : "No"}`} />
          <Pill text={`emailVerified: ${user.emailVerified ? "Yes" : "No"}`} />
        </div>
      </div>
    </div>
  );
}

function EditForm({
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
        <input
          className="input"
          value={value.name}
          onChange={(e) => onChange((p) => (p ? { ...p, name: e.target.value } : p))}
        />

        <div style={{ height: 10 }} />

        <Label text="Email" />
        <input
          className="input"
          value={value.email}
          onChange={(e) => onChange((p) => (p ? { ...p, email: e.target.value } : p))}
        />

        <div style={{ height: 10 }} />

        <Label text="Role" />
      <select
  className="select"
  value={normalizeRole(value.role)}
  onChange={(e) => onChangeRole(normalizeRole(e.target.value))}
>
  <option value="EMPLOYEE">Employee</option>
  <option value="MANAGER">Manager</option>
  <option value="HR">HR</option>
</select>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={S.blockTitle}>Work</div>

        <Label text="Department" />
        <input
          className="input"
          value={value.department || ""}
          onChange={(e) => onChange((p) => (p ? { ...p, department: e.target.value } : p))}
        />

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
        <input
          className="input"
          value={value.matricule || ""}
          onChange={(e) => onChange((p) => (p ? { ...p, matricule: e.target.value } : p))}
        />

        <div style={{ height: 10 }} />

        <Label text="Telephone" />
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

/* =======================
   Styles
   ======================= */

const S: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  headerActions: { display: "flex", alignItems: "center", gap: 10 },

  errorBox: {
    marginTop: 12,
    padding: 10,
    border: "1px solid #ef4444",
    borderRadius: 10,
    background: "rgba(239,68,68,0.06)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: 16,
  },
  modalCard: {
    width: "min(860px, 96vw)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
  },
  modalHead: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 900 },

  blockTitle: { fontWeight: 900, marginBottom: 10 },
  blockValue: { fontWeight: 800, marginBottom: 10 },
};