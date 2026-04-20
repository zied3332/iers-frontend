import React, { useEffect, useMemo, useState } from "react";
import "../../index.css";
import { getCurrentUser } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import { getEmployeesByDepartment } from "../../services/employee.service";
import { assignSkill, deleteEmployeeSkill, getAllSkills, getEmployeeSkills } from "../../services/skills.service";
import { getUsers } from "../../services/users.service";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  matricule: string;
  telephone: string;
  dateEmbauche: string;
  department: string;
  jobTitle: string;
  experienceYears: number;
  seniorityLevel: "JUNIOR" | "MID" | "SENIOR" | "-";
  status: "Online" | "Offline";
};

type SkillItem = {
  id: string;
  name: string;
  category: string;
  level: string;
  dynamicScore?: number;
};

type PendingSkillDelete = {
  id: string;
  name: string;
};

type SkillOption = {
  id: string;
  name: string;
  category: string;
};

function statusBadge(status: TeamMember["status"]) {
  if (status === "Online") return "badge-high";
  return "badge-medium";
}

function getDepartmentId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return "";
}

export default function ManagerTeam() {
  const ITEMS_PER_PAGE = 8;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [departmentName, setDepartmentName] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedMemberSkills, setSelectedMemberSkills] = useState<SkillItem[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [allSkillsLoading, setAllSkillsLoading] = useState(false);
  const [showAddSkillForm, setShowAddSkillForm] = useState(false);
  const [skillToAssign, setSkillToAssign] = useState("");
  const [skillLevelToAssign, setSkillLevelToAssign] = useState<"LOW" | "MEDIUM" | "HIGH" | "EXPERT">("MEDIUM");
  const [assigningSkill, setAssigningSkill] = useState(false);
  const [assignSkillError, setAssignSkillError] = useState("");
  const [removingSkillId, setRemovingSkillId] = useState("");
  const [pendingSkillDelete, setPendingSkillDelete] = useState<PendingSkillDelete | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const formatDate = (value: string) => {
    if (!value || value === "-") return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  };

  const loadTeam = async () => {
    setLoading(true);
    setError("");

    try {
      const [me, users, departments] = await Promise.all([getCurrentUser(), getUsers(), getAllDepartments()]);

      const managedDepartment = departments.find((d) => d.manager_id === me._id);
      const managedDepartmentId = managedDepartment?._id || getDepartmentId((me as any).departement_id);

      setDepartmentName(managedDepartment?.name || "");

      if (!managedDepartmentId) {
        setMembers([]);
        return;
      }

      const employees = await getEmployeesByDepartment(managedDepartmentId).catch(() => [] as any[]);
      const employeeByUserId = new Map<string, any>();
      for (const employee of employees as any[]) {
        const userRef = employee?.user_id;
        const userId = typeof userRef === "string" ? userRef : String(userRef?._id || "");
        if (userId) employeeByUserId.set(userId, employee);
      }

      const departmentById = new Map<string, string>();
      for (const dept of departments as any[]) {
        if (dept?._id) {
          departmentById.set(String(dept._id), String(dept.name || dept.code || "-"));
        }
      }

      const resolveDepartmentName = (user: any) => {
        const dep = user?.departement_id;
        if (!dep) return managedDepartment?.name || "-";
        if (typeof dep === "object") {
          if (dep.name) return String(dep.name);
          if (dep._id && departmentById.has(String(dep._id))) return String(departmentById.get(String(dep._id)));
        }
        if (typeof dep === "string") {
          return departmentById.get(dep) || managedDepartment?.name || "-";
        }
        return managedDepartment?.name || "-";
      };

      const team = (users as any[])
        .filter((u) => String(u.role || "").toUpperCase() === "EMPLOYEE")
        .filter((u) => getDepartmentId(u.departement_id) === managedDepartmentId)
        .map((u) => {
          const userId = String(u._id || "");
          const employee = employeeByUserId.get(userId);

          return {
            id: userId,
            name: String(u.name || "-"),
            role: String(u.role || "EMPLOYEE"),
            email: String(u.email || "-"),
            matricule: String(u.matricule || "-"),
            telephone: String(u.telephone || "-"),
            dateEmbauche: String(u.date_embauche || "-"),
            department: resolveDepartmentName(u),
            jobTitle: String(employee?.jobTitle || "Not Assigned"),
            experienceYears: Number(employee?.experienceYears ?? 0),
            seniorityLevel: (employee?.seniorityLevel || "-") as TeamMember["seniorityLevel"],
            status: u.en_ligne ? "Online" : "Offline",
          } as TeamMember;
        });

      setMembers(team);
    } catch (e: any) {
      setError(e?.message || "Failed to load team");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (!selectedMember) {
      setSelectedMemberSkills([]);
      setSkillsLoading(false);
      setShowAddSkillForm(false);
      setSkillToAssign("");
      setAssignSkillError("");
      setRemovingSkillId("");
      setPendingSkillDelete(null);
      return;
    }

    let active = true;

    const loadMemberSkills = async () => {
      setSkillsLoading(true);
      try {
        const rows = await getEmployeeSkills(selectedMember.id);
        if (!active) return;
        const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: String(row?._id || ""),
          name: String(row?.skill?.name || "Unknown skill"),
          category: String(row?.skill?.category || "-"),
          level: String(row?.level || "-"),
          dynamicScore: typeof row?.dynamicScore === "number" ? row.dynamicScore : undefined,
        }));
        setSelectedMemberSkills(mapped);
      } catch {
        if (!active) return;
        setSelectedMemberSkills([]);
      } finally {
        if (!active) return;
        setSkillsLoading(false);
      }
    };

    const loadAllSkills = async () => {
      setAllSkillsLoading(true);
      try {
        const rows = await getAllSkills();
        if (!active) return;
        const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: String(row?._id || ""),
          name: String(row?.name || "Unnamed skill"),
          category: String(row?.category || "-"),
        }));
        setAllSkills(mapped);
      } catch {
        if (!active) return;
        setAllSkills([]);
      } finally {
        if (!active) return;
        setAllSkillsLoading(false);
      }
    };

    void Promise.all([loadMemberSkills(), loadAllSkills()]);

    return () => {
      active = false;
    };
  }, [selectedMember]);

  const assignSkillToSelectedMember = async () => {
    if (!selectedMember || !skillToAssign) {
      setAssignSkillError("Please choose a skill.");
      return;
    }

    setAssigningSkill(true);
    setAssignSkillError("");

    try {
      await assignSkill({
        employeeId: selectedMember.id,
        skillId: skillToAssign,
        level: skillLevelToAssign,
      });

      const rows = await getEmployeeSkills(selectedMember.id);
      const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
        id: String(row?._id || ""),
        name: String(row?.skill?.name || "Unknown skill"),
        category: String(row?.skill?.category || "-"),
        level: String(row?.level || "-"),
        dynamicScore: typeof row?.dynamicScore === "number" ? row.dynamicScore : undefined,
      }));
      setSelectedMemberSkills(mapped);
      setShowAddSkillForm(false);
      setSkillToAssign("");
      setSkillLevelToAssign("MEDIUM");
    } catch (e: any) {
      const message = String(e?.response?.data?.message || e?.message || "Failed to assign skill");
      setAssignSkillError(message);
    } finally {
      setAssigningSkill(false);
    }
  };

  const availableSkillsForAssign = useMemo(() => {
    const assignedNames = new Set(selectedMemberSkills.map((skill) => skill.name.trim().toLowerCase()));
    return allSkills.filter((skill) => !assignedNames.has(skill.name.trim().toLowerCase()));
  }, [allSkills, selectedMemberSkills]);

  const removeSkillFromSelectedMember = async () => {
    if (!selectedMember || !pendingSkillDelete?.id) return;

    setRemovingSkillId(pendingSkillDelete.id);
    setAssignSkillError("");

    try {
      await deleteEmployeeSkill(pendingSkillDelete.id);
      const rows = await getEmployeeSkills(selectedMember.id);
      const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
        id: String(row?._id || ""),
        name: String(row?.skill?.name || "Unknown skill"),
        category: String(row?.skill?.category || "-"),
        level: String(row?.level || "-"),
        dynamicScore: typeof row?.dynamicScore === "number" ? row.dynamicScore : undefined,
      }));
      setSelectedMemberSkills(mapped);
      setPendingSkillDelete(null);
    } catch (e: any) {
      const message = String(e?.response?.data?.message || e?.message || "Failed to delete skill");
      setAssignSkillError(message);
    } finally {
      setRemovingSkillId("");
    }
  };

  const filteredMembers = useMemo(() => {
    let result = members;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((m) =>
        [m.name, m.email, m.role, m.matricule].some((v) => v.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((m) => m.status.toLowerCase() === statusFilter);
    }

    return result;
  }, [members, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const paginatedMembers = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage, totalPages]);
  const startItem = filteredMembers.length === 0 ? 0 : (Math.min(currentPage, totalPages) - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(Math.min(currentPage, totalPages) * ITEMS_PER_PAGE, filteredMembers.length);

  return (
    <div className="container">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="page-title">My Team</h1>
          <p className="page-subtitle">
            {departmentName
              ? `Employees assigned to your department: ${departmentName}.`
              : "Employees assigned to your department."}
          </p>
        </div>
      </div>

      <div className="card section-card">
        <div className="section-head">
          <div className="section-title">Team List</div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              placeholder="Search name, role, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "online" | "offline")}
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <button className="btn btn-primary" onClick={loadTeam}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 12, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
            <span style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</span>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Matricule</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading && filteredMembers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#64748b", fontWeight: 700 }}>
                  No employees found for your department.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={6} style={{ color: "#64748b", fontWeight: 700 }}>
                  Loading team members...
                </td>
              </tr>
            )}

            {paginatedMembers.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 900 }}>{m.name}</td>

                <td>{m.role}</td>
                <td>{m.email}</td>

                <td>
                  <span className={`badge ${statusBadge(m.status)}`}>{m.status}</span>
                </td>
                <td>{m.matricule}</td>
                <td>
                  <button
                    type="button"
                    className="manager-view-all-icon-btn"
                    onClick={() => setSelectedMember(m)}
                    aria-label={`View all details for ${m.name}`}
                    title="View all details"
                  >
                    <span aria-hidden="true">👁</span>
                    <span>View all</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredMembers.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>
              Showing {startItem} to {endItem} of {filteredMembers.length}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={page === currentPage ? "btn btn-primary btn-small" : "btn btn-ghost btn-small"}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)} role="presentation">
          <div className="modal-card manager-team-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Employee Details</h2>
                <p>Full information for {selectedMember.name}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedMember(null)}
                aria-label="Close employee details"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="manager-team-details-grid">
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Name</span>
                  <strong>{selectedMember.name}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Role</span>
                  <strong>{selectedMember.role}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Email</span>
                  <strong>{selectedMember.email}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Phone</span>
                  <strong>{selectedMember.telephone}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Matricule</span>
                  <strong>{selectedMember.matricule}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Department</span>
                  <strong>{selectedMember.department}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Job title</span>
                  <strong>{selectedMember.jobTitle}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Hire date</span>
                  <strong>{formatDate(selectedMember.dateEmbauche)}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Seniority level</span>
                  <strong>{selectedMember.seniorityLevel}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Experience years</span>
                  <strong>{selectedMember.experienceYears}</strong>
                </div>
                <div className="manager-team-detail-item">
                  <span className="manager-team-detail-label">Status</span>
                  <strong>{selectedMember.status}</strong>
                </div>
              </div>

              <div className="manager-team-skills-card">
                <div className="manager-team-skills-header">
                  <div className="manager-team-skills-title">Skills</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={() => {
                      setShowAddSkillForm((prev) => !prev);
                      setAssignSkillError("");
                    }}
                  >
                    {showAddSkillForm ? "Cancel" : "Add skill"}
                  </button>
                </div>

                {showAddSkillForm && (
                  <div className="manager-team-add-skill-form">
                    <select
                      className="select"
                      value={skillToAssign}
                      onChange={(e) => setSkillToAssign(e.target.value)}
                      disabled={allSkillsLoading || assigningSkill}
                    >
                      <option value="">Select a skill</option>
                      {availableSkillsForAssign.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} ({skill.category})
                        </option>
                      ))}
                    </select>

                    <select
                      className="select"
                      value={skillLevelToAssign}
                      onChange={(e) => setSkillLevelToAssign(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "EXPERT")}
                      disabled={assigningSkill}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="EXPERT">EXPERT</option>
                    </select>

                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={assignSkillToSelectedMember}
                      disabled={assigningSkill || !skillToAssign}
                    >
                      {assigningSkill ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}

                {assignSkillError && (
                  <div className="manager-team-add-skill-error">{assignSkillError}</div>
                )}

                {showAddSkillForm && !allSkillsLoading && availableSkillsForAssign.length === 0 && (
                  <div className="muted" style={{ marginBottom: 8 }}>All available skills are already assigned.</div>
                )}

                {skillsLoading ? (
                  <div className="muted">Loading skills...</div>
                ) : selectedMemberSkills.length === 0 ? (
                  <div className="muted">No skills assigned yet.</div>
                ) : (
                  <div className="manager-team-skills-list">
                    {selectedMemberSkills.map((skill) => (
                      <div key={skill.id} className="manager-team-skill-chip">
                        <div className="manager-team-skill-top">
                          <div className="manager-team-skill-name">{skill.name}</div>
                          <button
                            type="button"
                            className="manager-team-skill-delete-btn"
                            onClick={() => setPendingSkillDelete({ id: skill.id, name: skill.name })}
                            disabled={removingSkillId === skill.id}
                          >
                            {removingSkillId === skill.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                        <div className="manager-team-skill-meta">
                          <span>{skill.category}</span>
                          <span>{skill.level}</span>
                          {typeof skill.dynamicScore === "number" ? <span>Score {skill.dynamicScore}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setSelectedMember(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMember && pendingSkillDelete && (
        <div className="modal-overlay" role="presentation" onClick={() => !removingSkillId && setPendingSkillDelete(null)}>
          <div className="modal-card manager-delete-warning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Delete assigned skill?</h2>
                <p>
                  You are about to remove <strong>{pendingSkillDelete.name}</strong> from <strong>{selectedMember.name}</strong>.
                </p>
              </div>
            </div>

            <div className="modal-body">
              <div className="manager-delete-warning-box">
                This action will remove the skill from the employee profile and cannot be undone.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={Boolean(removingSkillId)}
                onClick={() => setPendingSkillDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={Boolean(removingSkillId)}
                onClick={removeSkillFromSelectedMember}
              >
                {removingSkillId ? "Deleting..." : "Delete skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}