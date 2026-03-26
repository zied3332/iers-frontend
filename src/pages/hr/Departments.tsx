import React, { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  updateDepartment,
  type Department,
} from "../../services/departments.service";
import { getUsers, type User } from "../../services/users.service";

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

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 8px",
  borderBottom: "2px solid #eaecef",
  fontWeight: 900,
  fontSize: 12,
  color: "#64748b",
  background: "#f8fafc",
};

const td: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid #eaecef",
  fontWeight: 700,
  color: "#0f172a",
};

const tdGray: React.CSSProperties = {
  ...td,
  color: "#64748b",
  fontWeight: 600,
};

const paginationRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 12,
  flexWrap: "wrap",
};

const paginationInfo: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const paginationControls: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const pageBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #eaecef",
  background: "white",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 13,
};

export default function HrDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager_id: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [departmentsData, usersData] = await Promise.all([getAllDepartments(), getUsers()]);
        setDepartments(departmentsData || []);
        setUsers(usersData || []);
        setError(null);
      } catch (err) {
        setError("Failed to load departments");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const managers = useMemo(() => users.filter((user) => user.role === "MANAGER"), [users]);

  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (dept) =>
          dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (dept.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [departments, searchTerm]
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredDepartments.length / pageSize)), [filteredDepartments.length]);

  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const managerNameById = useMemo(() => {
    const map = new Map<string, string>();
    managers.forEach((manager) => map.set(manager._id, manager.name));
    return map;
  }, [managers]);

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingDepartmentId(null);
    setFormError(null);
    setFormData({ name: "", code: "", description: "", manager_id: "" });
  };

  const openCreateModal = () => {
    setEditingDepartmentId(null);
    setFormError(null);
    setFormData({ name: "", code: "", description: "", manager_id: "" });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartmentId(dept._id);
    setFormError(null);
    setFormData({
      name: dept.name || "",
      code: dept.code || "",
      description: dept.description || "",
      manager_id: dept.manager_id || "",
    });
    setShowModal(true);
  };

  const onDelete = async (dept: Department) => {
    const ok = window.confirm(`Delete department "${dept.name}"?`);
    if (!ok) return;

    try {
      setDeletingId(dept._id);
      await deleteDepartment(dept._id);
      setDepartments((prev) => prev.filter((item) => item._id !== dept._id));
    } catch (err) {
      window.alert((err as Error)?.message || "Failed to delete department.");
    } finally {
      setDeletingId(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const code = formData.code.trim();

    if (!name || !code) {
      setFormError("Department name and code are required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (editingDepartmentId) {
        const updated = await updateDepartment(editingDepartmentId, {
          name,
          code,
          description: formData.description.trim() || undefined,
          manager_id: formData.manager_id || undefined,
        });
        setDepartments((prev) => prev.map((dept) => (dept._id === editingDepartmentId ? updated : dept)));
      } else {
        const created = await createDepartment({
          name,
          code,
          description: formData.description.trim() || undefined,
          manager_id: formData.manager_id || undefined,
        });
        setDepartments((prev) => [created, ...prev]);
      }

      closeModal();
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to save department.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 44, margin: 0 }}>Departments</h1>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
              Manage organization departments and their details.
            </div>
          </div>

          <button style={btnGreen} onClick={openCreateModal}>
            + Add Department
          </button>
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          <input
            style={input}
            placeholder="Search by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", borderRadius: 12, border: "1px solid #86efac" }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "#15803d" }}>Total departments: {filteredDepartments.length}</div>
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#64748b" }}>Loading departments...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 24, color: "#dc2626" }}>{error}</div>
          ) : filteredDepartments.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#64748b" }}>No departments found</div>
          ) : (
            <>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Department Name</th>
                    <th style={th}>Code</th>
                    <th style={th}>Manager</th>
                    <th style={th}>Description</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDepartments.map((dept) => (
                    <tr key={dept._id}>
                      <td style={td}>
                        <span style={{ fontWeight: 900, color: "#1f7a5a" }}>{dept.name}</span>
                      </td>
                      <td style={td}>
                        <span style={badge("#e0f2fe", "#0369a1")}>{dept.code}</span>
                      </td>
                      <td style={tdGray}>{dept.manager_id ? managerNameById.get(dept.manager_id) || "—" : "—"}</td>
                      <td style={tdGray}>{dept.description || "—"}</td>
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          style={{ ...btn, padding: "8px 10px", marginRight: 8 }}
                          title="Edit department"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(dept)}
                          disabled={deletingId === dept._id}
                          style={{
                            ...btn,
                            padding: "8px 10px",
                            color: "#dc2626",
                            borderColor: "#fecaca",
                            opacity: deletingId === dept._id ? 0.7 : 1,
                            cursor: deletingId === dept._id ? "not-allowed" : "pointer",
                          }}
                          title="Delete department"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={paginationRow}>
                <div style={paginationInfo}>
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredDepartments.length)} of {filteredDepartments.length} departments
                </div>
                <div style={paginationControls}>
                  <button
                    style={btn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    &lt;
                  </button>
                  <span style={pageBadge}>Page {page} / {totalPages}</span>
                  <button
                    style={btn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    title="Next page"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 24,
              maxWidth: 520,
              width: "92%",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", color: "#0f172a" }}>
              {editingDepartmentId ? "Edit Department" : "Add New Department"}
            </h2>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 18 }}>
              Choose a manager from existing manager accounts.
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                  Department Name *
                </label>
                <input
                  style={input}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Engineering"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                  Department Code *
                </label>
                <input
                  style={input}
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="ENG"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                  Manager
                </label>
                <select
                  style={input}
                  value={formData.manager_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manager_id: e.target.value }))}
                >
                  <option value="">No manager</option>
                  {managers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  style={{ ...input, minHeight: 84, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              {formError && (
                <div style={{ padding: 10, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 700 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ ...btnGreen, flex: 1, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Saving..." : editingDepartmentId ? "Save Changes" : "Create Department"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  style={{ ...btn, flex: 1, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
