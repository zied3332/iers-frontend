// src/pages/hr/users/UsersManagementPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { deleteUser, getUsers, updateUserRole, updateUser, type User } from "../../services/users.service";
import { normalizeRole } from "./utils/normalizeRole";
import { fmtDate, fmtDateTime } from "./utils/formatters";
import { toEditable } from "./utils/mappers";
import type { EditableUser } from "./utils/types";
import { S } from "./styles/users.styles";

import { Modal } from "./components/Modal";
import { Button } from "./components/Button";
import { Pill } from "./components/Pill";
import { UserAvatar } from "./components/UserAvatar";
import { UserDetailsGrid } from "./components/UserDetailsGrid";
import { EditForm } from "./components/EditForm";
import { IconEye, IconPencil, IconTrash } from "./components/Icons";
import { ImportUsersModal } from "./components/ImportUsersModal";
export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState<User | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState<EditableUser | null>(null);

  const [q, setQ] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
const [importOpen, setImportOpen] = useState(false);


  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await getUsers();
      const normalized = (data as any[]).map((u) => ({ ...u, role: normalizeRole(u.role) }));
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
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: fixedRole } : u)));

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

  const saveEdit = useCallback(async () => {
    if (!form) return;

    setEditErr("");
    if (!form.name.trim()) return setEditErr("Name is required.");
    if (!form.email.trim()) return setEditErr("Email is required.");

    setEditSaving(true);

    const snapshot = [...users];

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
      setUsers(snapshot);
      setEditErr(e?.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  }, [form, users]);

  const onlineCount = useMemo(() => users.filter((u: any) => u.en_ligne).length, [users]);

  return (
    <div style={S.pageCard}>
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

      <div style={S.headerRow}>
        <div>
          <div style={S.pageTitle}>User Management</div>
          <div style={S.pageSubtitle}>Manage accounts, roles, and access.</div>
        </div>

        <div style={S.headerActions}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input className="input" placeholder="Nom, email, matricule…" value={q} onChange={(e) => setQ(e.target.value)} style={S.searchInput} />
          </div>

          <button className="btn btn-primary" onClick={load} disabled={loading} style={S.refreshBtn}>
            {loading ? "Chargement…" : "Actualiser"}
          </button>

          <button
  className="btn"
  onClick={() => setImportOpen(true)}
  disabled={loading}
  style={{ ...S.refreshBtn, background: "#0ea5e9", border: "none", color: "#fff" }}
>
  Import Excel
</button>
<ImportUsersModal
  open={importOpen}
  onClose={() => setImportOpen(false)}
  onImported={load}
/>

        </div>
      </div>

      {err && (
        <div style={S.errorBox}>
          <span style={{ color: "#ef4444", fontWeight: 800 }}>{err}</span>
        </div>
      )}

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
                  <select className="select" value={normalizeRole(u.role)} onChange={(e) => onChangeRole(u._id, normalizeRole(e.target.value))} style={S.roleSelect}>
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
              <button type="button" className="btn btn-danger" onClick={onConfirmDelete} disabled={deleting} style={{ background: "#dc2626", color: "#fff", border: "none" }}>
                {deleting ? "Suppression…" : "Supprimer"}
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
            <Button variant="primary" onClick={() => { closeView(); openEdit(selected); }}>
              Edit
            </Button>
          ) : null
        }
      >
        {selected && <UserDetailsGrid user={selected as any} />}
      </Modal>

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

        {form && <EditForm value={form} onChange={setForm} onChangeRole={(role) => setForm((p) => (p ? { ...p, role } : p))} />}
      </Modal>
    </div>
  );
}