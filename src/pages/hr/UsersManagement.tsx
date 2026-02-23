import React, { useEffect, useMemo, useState } from "react";
import {
  deleteUser,
  getUsers,
  updateUserRole,
  type User,
} from "../../services/users.service";

/** Normalize DB roles like "HR" -> "hr" */
function normalizeRole(r: any): User["role"] {
  const x = String(r || "").toLowerCase();
  if (x === "hr") return "hr";
  if (x === "manager") return "manager";
  return "employee";
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

/** small modal (no deps) */
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // close on ESC + lock body scroll
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
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(820px, 96vw)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
            <div className="muted" style={{ marginTop: 2 }}>
              Full user details
            </div>
          </div>

          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // modal state
  const [selected, setSelected] = useState<User | null>(null);

  // search
  const [q, setQ] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await getUsers();

      // normalize role from DB ("HR"/"Manager"/etc.)
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
  }

  useEffect(() => {
    load();
  }, []);

  async function onChangeRole(userId: string, role: User["role"]) {
    setErr("");

    // snapshot (don’t keep reference)
    const old = [...users];

    // optimistic UI
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));

    try {
      await updateUserRole(userId, role);
    } catch (e: any) {
      setUsers(old);
      setErr(e?.message || "Role update failed");
    }
  }

  async function onDelete(userId: string) {
    if (!confirm("Delete this user?")) return;
    setErr("");
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      if (selected?._id === userId) setSelected(null);
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;

    return (users as any[]).filter((u) => {
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const dep = String(u.department || u.departement_id || "").toLowerCase();
      const mat = String(u.matricule || "").toLowerCase();
      return name.includes(s) || email.includes(s) || dep.includes(s) || mat.includes(s);
    });
  }, [users, q]);

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>User Management</div>
          <div className="muted">Manage accounts, roles, and access.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #ef4444",
            borderRadius: 10,
            background: "rgba(239,68,68,0.06)",
          }}
        >
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
              <th style={{ padding: 10, width: 220 }}>Actions</th>
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
                    onChange={(e) => onChangeRole(u._id, e.target.value as any)}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                  </select>
                </td>

                <td style={{ padding: 10 }}>
                  <span
                    className="badge"
                    style={{
                      background: u.en_ligne
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(100,116,139,0.10)",
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
                    <button className="btn" type="button" onClick={() => setSelected(u)}>
                      View
                    </button>

                    <button
                      className="btn"
                      onClick={() => onDelete(u._id)}
                      style={{
                        color: "#ef4444",
                        borderColor: "rgba(239,68,68,0.35)",
                        background: "rgba(239,68,68,0.06)",
                        fontWeight: 800,
                      }}
                    >
                      Delete
                    </button>
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

      {/* Details Modal */}
      <Modal
        open={!!selected}
        title={selected ? `${selected.name} — Details` : "User Details"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Identity</div>
              <div className="muted">ID</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>{(selected as any)._id}</div>

              <div className="muted">Matricule</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {(selected as any).matricule || "-"}
              </div>

              <div className="muted">Telephone</div>
              <div style={{ fontWeight: 800 }}>{(selected as any).telephone || "-"}</div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Account</div>

              <div className="muted">Email</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>{(selected as any).email}</div>

              <div className="muted">Role</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {normalizeRole((selected as any).role)}
              </div>

              <div className="muted">Status</div>
              <div style={{ fontWeight: 800 }}>
                {(selected as any).status ||
                  ((selected as any).isActive ? "active" : "inactive") ||
                  "-"}
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Work</div>

              <div className="muted">Department</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {(selected as any).department || (selected as any).departement_id || "-"}
              </div>

              <div className="muted">Manager ID</div>
              <div style={{ fontWeight: 800 }}>{(selected as any).manager_id || "-"}</div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Timeline</div>

              <div className="muted">Date d’embauche</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {fmtDate((selected as any).date_embauche)}
              </div>

              <div className="muted">Created</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {fmtDateTime((selected as any).createdAt)}
              </div>

              <div className="muted">Updated</div>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                {fmtDateTime((selected as any).updatedAt)}
              </div>

              <div className="muted">Last login</div>
              <div style={{ fontWeight: 800 }}>{fmtDateTime((selected as any).lastLogin)}</div>
            </div>

            <div className="card" style={{ padding: 12, gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Flags</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={{ border: "1px solid var(--border)" }}>
                  Online: {(selected as any).en_ligne ? "Yes" : "No"}
                </span>
                <span className="badge" style={{ border: "1px solid var(--border)" }}>
                  isActive: {(selected as any).isActive ? "Yes" : "No"}
                </span>
                <span className="badge" style={{ border: "1px solid var(--border)" }}>
                  emailVerified: {(selected as any).emailVerified ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}