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

function UserAvatar({ name, email, avatarUrl, size = 36 }: { name: string; email: string; avatarUrl?: string; size?: number }) {
  const initials = (name || "U").trim().split(/\s+/).map((s) => s[0]).join("").toUpperCase().slice(0, 2);
  const hue = ((email || "").split("").reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0) + 200) % 360;
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
          border: "1px solid rgba(15,23,42,0.08)",
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
        color: "#0f172a",
        fontWeight: 900,
        fontSize: size * 0.4,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(15,23,42,0.08)",
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

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
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
  }, [deleteTarget, selected?._id, form?._id]);

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

  const onlineCount = useMemo(() => users.filter((u: any) => u.en_ligne).length, [users]);

  return (
    <div style={S.pageCard}>
      {/* Stats — nombre à gauche, libellé à droite */}
      <div style={S.statsRow}>
        <div style={{ ...S.statCard, borderLeftColor: "rgba(59,130,246,0.5)" }}>
          <div style={S.statCardInner}>
            <span style={S.statValue}>{users.length}</span>
            <span style={S.statLabel}>Total utilisateurs</span>
          </div>
        </div>
        <div style={{ ...S.statCard, borderLeftColor: "rgba(22,163,74,0.5)" }}>
          <div style={S.statCardInner}>
            <span style={{ ...S.statValue, color: "#16a34a" }}>{onlineCount}</span>
            <span style={S.statLabel}>En ligne</span>
          </div>
        </div>
        <div style={{ ...S.statCard, borderLeftColor: "rgba(100,116,139,0.4)" }}>
          <div style={S.statCardInner}>
            <span style={{ ...S.statValue, color: "#64748b" }}>{users.length - onlineCount}</span>
            <span style={S.statLabel}>Hors ligne</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={S.headerRow}>
        <div>
          <div style={S.pageTitle}>User Management</div>
          <div style={S.pageSubtitle}>Manage accounts, roles, and access.</div>
        </div>

        <div style={S.headerActions}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              className="input"
              placeholder="Nom, email, matricule…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={S.searchInput}
            />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading} style={S.refreshBtn}>
            {loading ? "Chargement…" : "Actualiser"}
          </button>
        </div>
      </div>

      {err && (
        <div style={S.errorBox}>
          <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
        </div>
      )}

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={S.th}>Nom</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Matricule</th>
              <th style={S.th}>Téléphone</th>
              <th style={S.th}>Embauche</th>
              <th style={S.th}>Rôle</th>
              <th style={S.th}>Statut</th>
              <th style={S.th}>Dernière connexion</th>
              <th style={{ ...S.th, width: 160, minWidth: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any, i) => (
              <tr key={u._id} style={{ ...S.tr, background: i % 2 === 1 ? "rgba(248,250,252,0.8)" : "#fff" }}>
                <td style={S.td}>
                  <UserAvatar name={u.name} email={u.email} avatarUrl={u.avatarUrl} size={40} />
                </td>
                <td style={{ ...S.td, fontWeight: 800, color: "#0f172a" }}>{u.name}</td>
                <td style={{ ...S.td, color: "#64748b", fontSize: 13 }}>{u.email}</td>
                <td style={S.td}>{u.matricule || "—"}</td>
                <td style={S.td}>{u.telephone || "—"}</td>
                <td style={S.td}>{fmtDate(u.date_embauche)}</td>
                <td style={S.td}>
                  <select
                    className="select"
                    value={normalizeRole(u.role)}
                    onChange={(e) => onChangeRole(u._id, normalizeRole(e.target.value))}
                    style={S.roleSelect}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                  </select>
                </td>
                <td style={S.td}>
                  <Pill text={u.en_ligne ? "En ligne" : "Hors ligne"} tone={u.en_ligne ? "success" : "neutral"} />
                </td>
                <td style={{ ...S.td, color: "#64748b", fontSize: 13 }}>{fmtDateTime(u.lastLogin) === "-" ? "—" : fmtDateTime(u.lastLogin)}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                  <div style={S.actionsGroup}>
                    <button type="button" onClick={() => openView(u)} style={S.actionBtn} title="Voir">
                      <IconEye />
                    </button>
                    <button type="button" onClick={() => openEdit(u)} style={{ ...S.actionBtn, ...S.actionBtnPrimary }} title="Modifier">
                      <IconPencil />
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(u)} style={{ ...S.actionBtn, ...S.actionBtnDanger }} title="Supprimer">
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={S.emptyCell}>
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={S.modalBackdrop} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={S.deleteModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Supprimer l'utilisateur ?</div>
              <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>
                <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) sera supprimé définitivement.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => !deleting && setDeleteTarget(null)} disabled={deleting}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirmDelete}
                disabled={deleting}
                style={{ background: "#dc2626", color: "#fff", border: "none" }}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

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
      </Modal>
    </div>
  );
}

/* =======================
   Extracted components
   ======================= */

function UserDetailsGrid({ user }: { user: any }) {
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
          <Pill text={`En ligne : ${user.en_ligne ? "Oui" : "Non"}`} tone={user.en_ligne ? "success" : "neutral"} />
          <Pill text={`Actif : ${user.isActive ? "Oui" : "Non"}`} />
          <Pill text={`Email vérifié : ${user.emailVerified ? "Oui" : "Non"}`} />
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
  pageCard: {
    padding: 20,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
  },
  statsRow: {
    display: "flex",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  statCard: {
    flex: "1 1 140px",
    minWidth: 140,
    padding: "16px 18px",
    borderRadius: 12,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderLeft: "4px solid rgba(15,23,42,0.15)",
  },
  statCardInner: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  statValue: { fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 13, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" },

  pageTitle: { fontSize: 22, fontWeight: 900, color: "#0f172a" },
  pageSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  headerActions: { display: "flex", alignItems: "center", gap: 10 },
  searchWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
  },
  searchIcon: { position: "absolute", left: 12, fontSize: 14, opacity: 0.6 },
  searchInput: { minWidth: 260, paddingLeft: 36, borderRadius: 12, border: "1px solid rgba(15,23,42,0.12)" },
  refreshBtn: { borderRadius: 12, fontWeight: 800 },

  errorBox: {
    marginTop: 12,
    padding: 12,
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 12,
    background: "rgba(239,68,68,0.06)",
  },

  tableWrap: { overflowX: "auto", marginTop: 18, borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "14px 12px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 900,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "rgba(248,250,252,0.9)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },
  tr: { borderBottom: "1px solid rgba(15,23,42,0.06)" },
  td: { padding: "12px" },
  roleSelect: { padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", fontWeight: 800, fontSize: 13 },
  actionsGroup: {
    display: "inline-flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 0,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.1)",
    background: "rgba(248,250,252,0.6)",
  },
  actionBtn: {
    width: 38,
    height: 38,
    border: "none",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: { color: "#166534", borderRight: "1px solid rgba(15,23,42,0.08)" },
  actionBtnDanger: { color: "#b91c1c", borderRight: "none" },
  emptyCell: { padding: 32, textAlign: "center", color: "#64748b", fontWeight: 800 },

  deleteModalCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
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
    padding: 20,
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    background: "#fff",
  },
  modalHead: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },

  blockTitle: { fontWeight: 900, marginBottom: 10, color: "#0f172a" },
  blockValue: { fontWeight: 800, marginBottom: 10, color: "#334155" },
};