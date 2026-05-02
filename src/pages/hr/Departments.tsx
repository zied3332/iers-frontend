import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import * as XLSX from "xlsx";
import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  updateDepartment,
  type Department,
} from "../../services/departments.service";
import { getUsers, type User } from "../../services/users.service";

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
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
  border: "1px solid var(--input-border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};

const btnGreen: React.CSSProperties = {
  ...btn,
  border: "1px solid var(--primary)",
  background: "var(--primary)",
  color: "var(--primary-on)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--input-border)",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  fontWeight: 700,
  fontSize: 16,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 8px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 900,
  fontSize: 16,
  color: "var(--muted)",
  background: "var(--surface-2)",
};

const td: React.CSSProperties = {
  padding: "14px 8px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--text)",
};

const tdGray: React.CSSProperties = {
  ...td,
  color: "var(--muted)",
  fontWeight: 600,
  fontSize: 15,
};

const listFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginTop: 12,
  padding: "12px 16px 16px",
  borderTop: "1px solid var(--border)",
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
  width: 38,
  height: 38,
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
  color: "#145a41",
};

const actionBtnDanger: React.CSSProperties = {
  ...actionBtn,
  color: "#dc2626",
  borderRight: "none",
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
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);
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

  const deptListStartItem =
    filteredDepartments.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const deptListEndItem = Math.min(page * pageSize, filteredDepartments.length);

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

  const closeDetailsModal = () => setSelectedDepartment(null);

  const normalizeText = (value: unknown) => String(value ?? "").trim();

  const normalizeManagerKey = (value: unknown) => normalizeText(value).toLowerCase();

  const parseExcelFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  };

  const exportDepartmentsExcel = async () => {
    try {
      setExportingExcel(true);
      const rows = departments.map((dept) => {
        const manager = managers.find((m) => m._id === dept.manager_id);
        return {
          Department_Name: dept.name || "",
          Department_Code: dept.code || "",
          Description: dept.description || "",
          Manager_Email: manager?.email || "",
          Manager_Name: manager?.name || "",
        };
      });

      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Departments");
      XLSX.writeFile(workbook, "departments.xlsx");
    } catch (err) {
      window.alert((err as Error)?.message || "Failed to export departments.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleImportClick = () => importFileRef.current?.click();

  const importDepartmentsExcel = async (file: File) => {
    try {
      setImportingExcel(true);
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        window.alert("Excel file is empty.");
        return;
      }

      const latestDepartments = await getAllDepartments();
      const deptByCode = new Map(
        latestDepartments.map((d) => [normalizeText(d.code).toLowerCase(), d])
      );

      const managerByKey = new Map<string, string>();
      managers.forEach((m) => {
        managerByKey.set(normalizeManagerKey(m._id), m._id);
        managerByKey.set(normalizeManagerKey(m.email), m._id);
        managerByKey.set(normalizeManagerKey(m.name), m._id);
      });

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const name = normalizeText(row.Department_Name ?? row.department_name ?? row.name);
        const code = normalizeText(row.Department_Code ?? row.department_code ?? row.code);
        const description = normalizeText(row.Description ?? row.description);
        const managerRaw = normalizeText(
          row.Manager_Email ?? row.manager_email ?? row.Manager ?? row.manager
        );
        const managerId = managerByKey.get(normalizeManagerKey(managerRaw));

        if (!name || !code) {
          skippedCount += 1;
          continue;
        }

        const existing = deptByCode.get(code.toLowerCase());
        if (existing) {
          await updateDepartment(existing._id, {
            name,
            code,
            description: description || undefined,
            manager_id: managerId || undefined,
          });
          updatedCount += 1;
        } else {
          const created = await createDepartment({
            name,
            code,
            description: description || undefined,
            manager_id: managerId || undefined,
          });
          deptByCode.set(code.toLowerCase(), created);
          createdCount += 1;
        }
      }

      const refreshedDepartments = await getAllDepartments();
      setDepartments(refreshedDepartments || []);
      window.alert(
        `Departments import completed.\nCreated: ${createdCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}`
      );
    } catch (err) {
      window.alert((err as Error)?.message || "Failed to import departments.");
    } finally {
      setImportingExcel(false);
      if (importFileRef.current) importFileRef.current.value = "";
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
        <div className="page-header" style={{ alignItems: "start" }}>
          <div>
            <h1 className="page-title">Departments Management</h1>
            <p className="page-subtitle">Manage organization departments and their details.</p>
          </div>

          <button style={btnGreen} onClick={openCreateModal}>
            + Add Department
          </button>
        </div>

        <div
          style={{
            ...card,
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "0 1 360px", minWidth: 260 }}>
            <input
              style={input}
              placeholder="Search by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              style={{ ...btn, opacity: importingExcel ? 0.7 : 1 }}
              onClick={handleImportClick}
              disabled={importingExcel}
            >
              {importingExcel ? "Importing..." : "Import Excel"}
            </button>
            <button
              type="button"
              style={{ ...btn, opacity: exportingExcel ? 0.7 : 1 }}
              onClick={exportDepartmentsExcel}
              disabled={exportingExcel}
            >
              {exportingExcel ? "Exporting..." : "Export Excel"}
            </button>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void importDepartmentsExcel(file);
            }}
          />
        </div>

        <div style={{ marginTop: 12, padding: 12, background: "color-mix(in srgb, var(--primary) 12%, var(--surface))", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--primary) 35%, var(--border))" }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "var(--primary-soft-text)" }}>Total departments: {filteredDepartments.length}</div>
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 18, fontWeight: 700 }}>Loading departments...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 24, color: "#dc2626", fontSize: 18, fontWeight: 700 }}>{error}</div>
          ) : filteredDepartments.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 18, fontWeight: 700 }}>No departments found</div>
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
                  {paginatedDepartments.map((dept, i) => (
                    <tr key={dept._id} style={{ background: i % 2 === 1 ? "var(--surface-2)" : "var(--surface)" }}>
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => setSelectedDepartment(dept)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            margin: 0,
                            fontWeight: 900,
                            color: "#1f7a5a",
                            cursor: "pointer",
                            fontSize: 16,
                          }}
                          title={`Open ${dept.name} details`}
                        >
                          {dept.name}
                        </button>
                      </td>
                      <td style={td}>
                        <span style={badge("#e0f2fe", "#0369a1")}>{dept.code}</span>
                      </td>
                      <td style={tdGray}>{dept.manager_id ? managerNameById.get(dept.manager_id) || "—" : "—"}</td>
                      <td style={tdGray}>{dept.description || "—"}</td>
                      <td style={td}>
                        <div style={actionsGroup}>
                          <button
                            type="button"
                            onClick={() => openEditModal(dept)}
                            style={actionBtnPrimary}
                            title="Edit department"
                            aria-label="Edit department"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(dept)}
                            disabled={deletingId === dept._id}
                            style={{ ...actionBtnDanger, opacity: deletingId === dept._id ? 0.7 : 1, cursor: deletingId === dept._id ? "not-allowed" : "pointer" }}
                            title="Delete department"
                            aria-label="Delete department"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={listFooter}>
                <span style={listFooterText}>
                  Showing {deptListStartItem} to {deptListEndItem} of{" "}
                  {filteredDepartments.length} departments
                </span>
                <div style={listPagination}>
                  <button
                    type="button"
                    style={listPageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
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
              background: "var(--surface)",
              borderRadius: 18,
              padding: 24,
              maxWidth: 520,
              width: "92%",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", color: "var(--text)" }}>
              {editingDepartmentId ? "Edit Department" : "Add New Department"}
            </h2>
            <div style={{ fontSize: 15, color: "var(--muted)", fontWeight: 700, marginBottom: 18 }}>
              Choose a manager from existing manager accounts.
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "var(--muted)", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "var(--muted)", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "var(--muted)", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "var(--muted)", marginBottom: 6 }}>
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

      {selectedDepartment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
          onClick={closeDetailsModal}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 18,
              padding: 32,
              maxWidth: 980,
              width: "97%",
              minHeight: 350,
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "var(--text)" }}>
                  {selectedDepartment.name}
                </h2>
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontWeight: 700 }}>
                  Department details
                </p>
              </div>
              <button type="button" style={btn} onClick={closeDetailsModal}>
                Close
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 4 }}>Name</div>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>{selectedDepartment.name || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 4 }}>Code</div>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>{selectedDepartment.code || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 4 }}>Manager</div>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>
                  {selectedDepartment.manager_id
                    ? managerNameById.get(selectedDepartment.manager_id) || "—"
                    : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)", marginBottom: 4 }}>Description</div>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>{selectedDepartment.description || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
