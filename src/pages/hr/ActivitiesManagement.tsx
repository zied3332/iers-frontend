import React, { useEffect, useMemo, useState } from "react";
import {
  updateActivityById,
  createActivity,
  listActivities,
  deleteActivityById,
  addSkillToActivity,
  removeSkillFromActivity,
  getActivitySkills,
  listSkills,
  type ActivityStatus,
  type ActivityRecord,
  type ActivityType,
  type CreateActivityInput,
  type DesiredLevel,
  type PriorityContext,
  type ActivitySkillRecord,
  type Skill,
} from "../../services/activities.service";
import { getUsers, type User } from "../../services/users.service";
import { getAllDepartments, type Department } from "../../services/departments.service";

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #eaecef",
  borderRadius: 18,
  padding: 16,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #eaecef",
  outline: "none",
  fontWeight: 700,
  background: "#fff",
};

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

const activityTypeOptions: ActivityType[] = ["TRAINING", "CERTIFICATION", "PROJECT", "MISSION", "AUDIT"];
const levelOptions: DesiredLevel[] = ["LOW", "MEDIUM", "HIGH"];
const contextOptions: PriorityContext[] = ["UPSKILLING", "EXPERTISE", "DEVELOPMENT"];
const statusOptions: ActivityStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const skillLevelOptions: ("LOW" | "MEDIUM" | "HIGH" | "EXPERT")[] = ["LOW", "MEDIUM", "HIGH", "EXPERT"];

type FormState = {
  title: string;
  type: ActivityType;
  availableSlots: number;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: ActivityStatus;
  responsibleManagerId: string;
  departmentId: string;
  priorityContext: PriorityContext;
  targetLevel: DesiredLevel;
};

type SkillSelectionState = {
  skillId: string;
  requiredLevel: "LOW" | "MEDIUM" | "HIGH" | "EXPERT";
  weight: number;
};

type AssignFormState = {
  status: ActivityStatus;
  responsibleManagerId: string;
  departmentId: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  type: "TRAINING",
  availableSlots: 1,
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  duration: "",
  status: "PLANNED",
  responsibleManagerId: "",
  departmentId: "",
  priorityContext: "UPSKILLING",
  targetLevel: "MEDIUM",
};

function formatActivityType(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

function formatLevel(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

function formatStatus(v: ActivityStatus) {
  return v.replaceAll("_", " ");
}

export default function ActivitiesManagement() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activitySkills, setActivitySkills] = useState<ActivitySkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<"status" | "department">(() => {
    try {
      const saved = localStorage.getItem("activityGroupBy");
      if (saved === "department" || saved === "status") return saved;
    } catch {
      // ignore
    }
    return "status";
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<SkillSelectionState[]>([]);
  const [assignForm, setAssignForm] = useState<AssignFormState>({
    status: "PLANNED",
    responsibleManagerId: "",
    departmentId: "",
  });

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Persist groupBy preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("activityGroupBy", groupBy);
    } catch {
      // ignore
    }
  }, [groupBy]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [activitiesRes, usersRes, departmentsRes, skillsRes] = await Promise.allSettled([
          listActivities(),
          getUsers(),
          getAllDepartments(),
          listSkills(),
        ]);

        if (activitiesRes.status === "fulfilled") {
          setActivities(activitiesRes.value || []);
        } else {
          throw activitiesRes.reason;
        }

        if (usersRes.status === "fulfilled") {
          setUsers(usersRes.value || []);
        } else {
          setUsers([]);
        }

        if (departmentsRes.status === "fulfilled") {
          setDepartments(departmentsRes.value || []);
        } else {
          setDepartments([]);
        }

        if (skillsRes.status === "fulfilled") {
          setSkills(skillsRes.value || []);
        } else {
          setSkills([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const managers = useMemo(
    () => (users || []).filter((u) => String(u.role || "").toUpperCase() === "MANAGER"),
    [users]
  );

  const managerNameById = useMemo(() => {
    const map = new Map<string, string>();
    managers.forEach((m) => map.set(String(m._id), String(m.name || "-")));
    return map;
  }, [managers]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(String(d._id), String(d.name || "-")));
    return map;
  }, [departments]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return activities;

    return activities.filter((a) => {
      const blob = [
        a.title,
        a.type,
        a.location,
        a.duration,
        a.startDate,
        a.endDate,
        a.status,
        managerNameById.get(a.responsibleManagerId || "") || "",
        departmentNameById.get(a.departmentId || "") || "",
        a.description,
        a.priorityContext,
        a.targetLevel,
        ...a.requiredSkills.map((s) => `${s.name} ${s.type} ${s.desiredLevel}`),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(search);
    });
  }, [activities, q, managerNameById, departmentNameById]);

  const groupedBoard = useMemo(() => {
    const sections: Array<{ key: string; title: string; items: ActivityRecord[] }> = [];

    if (groupBy === "status") {
      statusOptions.forEach((status) => {
        sections.push({
          key: status,
          title: formatStatus(status),
          items: filtered.filter((a) => (a.status || "PLANNED") === status),
        });
      });
      return sections;
    }

    const byDepartment = new Map<string, ActivityRecord[]>();
    filtered.forEach((a) => {
      const key = a.departmentId || "__unassigned__";
      const arr = byDepartment.get(key) || [];
      arr.push(a);
      byDepartment.set(key, arr);
    });

    const orderedDepartments = [...departments].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );

    orderedDepartments.forEach((d) => {
      const key = String(d._id);
      sections.push({ key, title: String(d.name || "Unnamed Department"), items: byDepartment.get(key) || [] });
    });

    if (byDepartment.has("__unassigned__")) {
      sections.push({
        key: "__unassigned__",
        title: "Unassigned Department",
        items: byDepartment.get("__unassigned__") || [],
      });
    }

    return sections;
  }, [filtered, groupBy, departments]);

  const addSelectedSkill = () => {
    setSelectedSkills((prev) => [
      ...prev,
      { skillId: "", requiredLevel: "MEDIUM", weight: 1 },
    ]);
  };

  const removeSelectedSkill = (index: number) => {
    setSelectedSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSelectedSkill = (index: number, patch: Partial<SkillSelectionState>) => {
    setSelectedSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const validate = (): string => {
    if (!form.title.trim()) return "Activity title is required.";
    if (!form.description.trim()) return "Detailed description is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!form.startDate) return "Start date is required.";
    if (!form.endDate) return "End date is required.";
    if (form.startDate && form.endDate && new Date(form.endDate).getTime() < new Date(form.startDate).getTime()) {
      return "End date must be after start date.";
    }
    if (!form.duration.trim()) return "Duration is required (example: 4 weeks, 6 days, 40 min).";
    if (!Number.isFinite(form.availableSlots) || form.availableSlots <= 0) return "Seats or roles must be greater than 0.";

    return "";
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    const payload: CreateActivityInput = {
      title: form.title.trim(),
      type: form.type,
      requiredSkills: [],
      availableSlots: Number(form.availableSlots),
      description: form.description.trim(),
      location: form.location.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      duration: form.duration.trim(),
      status: form.status,
      responsibleManagerId: form.responsibleManagerId || undefined,
      departmentId: form.departmentId || undefined,
      priorityContext: form.priorityContext,
      targetLevel: form.targetLevel,
    };

    setSaving(true);
    try {
      let activity: ActivityRecord;
      if (selectedActivity) {
        // Edit mode
        activity = await updateActivityById(selectedActivity._id, payload);
        setActivities((prev) => prev.map((a) => (a._id === activity._id ? activity : a)));
        setSuccess("Activity updated successfully.");
        setSelectedActivity(null);
      } else {
        // Create mode
        activity = await createActivity(payload);
        setActivities((prev) => [activity, ...prev]);
        setSuccess("Activity created successfully.");
      }

      // Now handle skills - first remove old ones (if editing), then add new ones
      if (selectedActivity) {
        // Delete old skills for edit mode
        for (const oldSkill of activitySkills) {
          await removeSkillFromActivity(selectedActivity._id, oldSkill.skill_id._id);
        }
      }

      // Add new selected skills
      for (const skillSel of selectedSkills) {
        if (skillSel.skillId) {
          await addSkillToActivity(activity._id, skillSel.skillId, skillSel.requiredLevel, skillSel.weight);
        }
      }

      setForm(INITIAL_FORM);
      setSelectedSkills([]);
      setActivitySkills([]);
      setCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save activity.");
    } finally {
      setSaving(false);
    }
  };

  const openViewMore = async (a: ActivityRecord) => {
    setSelectedActivity(a);
    try {
      const skills = await getActivitySkills(a._id);
      setActivitySkills(skills);
    } catch (e: any) {
      console.error("Failed to load skills:", e);
      setActivitySkills([]);
    }
    setViewMoreOpen(true);
  };

  const openEdit = async (a: ActivityRecord) => {
    setSelectedActivity(a);
    setForm({
      title: a.title,
      type: a.type,
      availableSlots: a.availableSlots,
      description: a.description,
      location: a.location,
      startDate: a.startDate,
      endDate: a.endDate,
      duration: a.duration,
      status: a.status,
      responsibleManagerId: a.responsibleManagerId || "",
      departmentId: a.departmentId || "",
      priorityContext: a.priorityContext,
      targetLevel: a.targetLevel,
    });

    // Load activity's current skills
    try {
      const actSkills = await getActivitySkills(a._id);
      setActivitySkills(actSkills);
      const selections: SkillSelectionState[] = actSkills.map((as) => ({
        skillId: as.skill_id._id,
        requiredLevel: as.required_level,
        weight: as.weight,
      }));
      setSelectedSkills(selections);
    } catch (e: any) {
      console.error("Failed to load skills:", e);
      setActivitySkills([]);
      setSelectedSkills([]);
    }

    setCreateOpen(true);
  };

  const onDelete = async (activityId: string) => {
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await deleteActivityById(activityId);
      setActivities((prev) => prev.filter((x) => x._id !== activityId));
      setDeleteConfirm(null);
      setSuccess("Activity deleted successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to delete activity.");
    } finally {
      setDeleting(false);
    }
  };

  const saveAssign = async () => {
    if (!selectedActivity) return;
    setAssignSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateActivityById(selectedActivity._id, {
        status: assignForm.status,
        responsibleManagerId: assignForm.responsibleManagerId || undefined,
        departmentId: assignForm.departmentId || undefined,
      });
      setActivities((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setAssignOpen(false);
      setSelectedActivity(null);
      setSuccess("Activity assignment updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update activity assignment.");
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 44, margin: 0 }}>Activity Management</h1>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
              Create and prioritize training, certification, project, mission, and audit activities.
            </div>
          </div>

          <button
            type="button"
            style={btnGreen}
            onClick={() => {
              setError("");
              setSuccess("");
              setForm(INITIAL_FORM);
              setCreateOpen(true);
            }}
          >
            + Create New Activity
          </button>
        </div>

     
        <div style={{ ...card, marginTop: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eef2f7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>Created Activities</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  style={{ ...input, width: 210 }}
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as "status" | "department")}
                >
                  <option value="status">Group by Status</option>
                  <option value="department">Group by Department</option>
                </select>
                <input
                  style={{ ...input, width: 320 }}
                  placeholder="Search title, type, skill, context..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16, color: "#64748b", fontWeight: 700 }}>Loading activities...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, color: "#64748b", fontWeight: 700 }}>No activities created yet.</div>
          ) : (
            <div style={{ padding: 16 }}>
              {groupedBoard.map((section) => {
                const items = section.items || [];
                return (
                  <div key={section.key} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>{section.title}</div>
                      <span style={badge("#ecfeff", "#0e7490")}>{items.length}</span>
                    </div>

                    {items.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontWeight: 700, padding: 16, background: "#fbfcfe", borderRadius: 12 }}>
                        No activities
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                        {items.map((a) => (
                          <div
                            key={a._id}
                            style={{
                              background: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: 14,
                              padding: 14,
                              minWidth: 360,
                              flexShrink: 0,
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 12,
                              alignItems: "start",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.3, fontSize: 14 }} title={a.title}>
                                  {a.title.length > 46 ? a.title.substring(0, 46) + "..." : a.title}
                                </div>
                                <span style={badge("#eef2ff", "#3730a3")}>{formatStatus(a.status || "PLANNED")}</span>
                                <span style={badge("#e0f2fe", "#0369a1")}>{a.priorityContext}</span>
                              </div>


                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>TYPE</div>
                                  <div style={{ color: "#475569", fontSize: 12 }}>{formatActivityType(a.type)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>PRIORITY</div>
                                  <div style={{ color: "#475569", fontSize: 12 }}>{formatLevel(a.targetLevel)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>START DATE</div>
                                  <div style={{ color: "#475569", fontSize: 12 }}>{new Date(a.startDate).toLocaleDateString()}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>SEATS LEFT</div>
                                  <div style={{ color: "#475569", fontSize: 12 }}>{a.availableSlots}</div>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 6, flexDirection: "column", minWidth: 110 }}>
                              <button type="button" style={{ ...btn, fontSize: 12, padding: "8px 10px" }} onClick={() => openViewMore(a)}>
                                View More
                              </button>
                              <button type="button" style={{ ...btn, fontSize: 12, padding: "8px 10px", background: "#f0f4f8" }} onClick={() => openEdit(a)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                style={{ ...btn, fontSize: 12, padding: "8px 10px", color: "#dc2626", border: "1px solid #fecaca" }}
                                onClick={() => setDeleteConfirm(a._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {createOpen && (
          <div
            onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.45)",
              zIndex: 110,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <form
              onSubmit={onCreate}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(1100px, 96vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                ...card,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                  {selectedActivity ? "Edit Activity" : "Create Activity"}
                </div>
                <button type="button" style={btn} onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}>
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
                <input
                  style={input}
                  placeholder="Activity title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
      {(error || success) && (
          <div style={{ ...card, marginTop: 12, borderColor: error ? "rgba(239,68,68,0.25)" : "rgba(22,163,74,0.25)", background: error ? "rgba(239,68,68,0.06)" : "rgba(22,163,74,0.08)" }}>
            <span style={{ color: error ? "#b91c1c" : "#166534", fontWeight: 800 }}>{error || success}</span>
          </div>
        )}

                <select
                  style={input}
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ActivityType }))}
                >
                  {activityTypeOptions.map((x) => (
                    <option key={x} value={x}>
                      {formatActivityType(x)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Required Skills</div>

                {skills.length === 0 ? (
                  <div style={{ color: "#a3a3a3", fontSize: 13, marginBottom: 8 }}>
                    No skills available in the system.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedSkills.map((skillSel, index) => (
                      <div key={index} style={{ display: "grid", gap: 6, paddingBottom: 12, borderBottom: "1px solid #eaecef" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Skill</div>
                            <select
                              style={input}
                              value={skillSel.skillId}
                              onChange={(e) => updateSelectedSkill(index, { skillId: e.target.value })}
                            >
                              <option value="">-- Select a skill --</option>
                              {skills.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Required Level</div>
                            <select
                              style={input}
                              value={skillSel.requiredLevel}
                              onChange={(e) =>
                                updateSelectedSkill(index, { requiredLevel: e.target.value as "LOW" | "MEDIUM" | "HIGH" | "EXPERT" })
                              }
                            >
                              {skillLevelOptions.map((x) => (
                                <option key={x} value={x}>
                                  {formatLevel(x)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Importance Weight</div>
                            <input
                              style={input}
                              type="number"
                              min="0"
                              max="100"
                              step="5"
                              placeholder="0-100"
                              title="Importance score for recommendation ranking (0-100%)"
                              value={(skillSel.weight * 100).toFixed(0)}
                              onChange={(e) => {
                                const percentage = Math.max(0, Math.min(100, Number(e.target.value)));
                                updateSelectedSkill(index, { weight: percentage / 100 });
                              }}
                            />
                          </div>

                          <button type="button" style={btn} onClick={() => removeSelectedSkill(index)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {skills.length > 0 && (
                  <button type="button" style={{ ...btn, marginTop: 8 }} onClick={addSelectedSkill}>
                    + Add skill requirement
                  </button>
                )}
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ marginBottom: 6, color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                    Number of Seats
                  </div>
                  <input
                    style={input}
                    type="number"
                    min={1}
                    placeholder="Example: 20"
                    value={form.availableSlots}
                    onChange={(e) => setForm((prev) => ({ ...prev, availableSlots: Number(e.target.value || 0) }))}
                  />
                </div>

                <input
                  style={input}
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                />

                <input
                  style={input}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />

                <input
                  style={input}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ marginBottom: 6, color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                    Duration
                  </div>
                  <input
                    style={input}
                    type="text"
                    placeholder="Examples: 4 weeks, 6 days, 40 min"
                    value={form.duration}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                  />
                </div>

                <select
                  style={input}
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ActivityStatus }))}
                >
                  {statusOptions.map((x) => (
                    <option key={x} value={x}>
                      {formatStatus(x)}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={form.responsibleManagerId}
                  onChange={(e) => setForm((prev) => ({ ...prev, responsibleManagerId: e.target.value }))}
                >
                  <option value="">Responsible Manager (optional)</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={form.departmentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                >
                  <option value="">Department (optional)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select
                  style={input}
                  value={form.priorityContext}
                  onChange={(e) => setForm((prev) => ({ ...prev, priorityContext: e.target.value as PriorityContext }))}
                >
                  {contextOptions.map((x) => (
                    <option key={x} value={x}>
                      {formatActivityType(x)}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={form.targetLevel}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetLevel: e.target.value as DesiredLevel }))}
                >
                  {levelOptions.map((x) => (
                    <option key={x} value={x}>
                      {formatLevel(x)}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                style={{ ...input, marginTop: 10, minHeight: 100, resize: "vertical" }}
                placeholder="Detailed description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ color: "#64748b", fontWeight: 700 }}>
                  Prioritization uses context and target level (low/medium/high).
                </div>
                <button type="submit" style={btnGreen} disabled={saving}>
                  {saving ? (selectedActivity ? "Updating..." : "Creating...") : (selectedActivity ? "Update Activity" : "Create Activity")}
                </button>
              </div>
            </form>
          </div>
        )}

        {assignOpen && selectedActivity && (
          <div
            onClick={() => !assignSaving && setAssignOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.45)",
              zIndex: 110,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(560px, 96vw)", ...card }}
            >
              <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>Assign Activity</div>
              <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{selectedActivity.title}</div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <select
                  style={input}
                  value={assignForm.status}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, status: e.target.value as ActivityStatus }))}
                >
                  {statusOptions.map((x) => (
                    <option key={x} value={x}>
                      {formatStatus(x)}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={assignForm.responsibleManagerId}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, responsibleManagerId: e.target.value }))}
                >
                  <option value="">Responsible Manager (optional)</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={assignForm.departmentId}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                >
                  <option value="">Department (optional)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" style={btn} onClick={() => !assignSaving && setAssignOpen(false)}>
                  Cancel
                </button>
                <button type="button" style={btnGreen} disabled={assignSaving} onClick={saveAssign}>
                  {assignSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMoreOpen && selectedActivity && (
          <div
            onClick={() => setViewMoreOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.45)",
              zIndex: 110,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(640px, 96vw)", maxHeight: "85vh", overflowY: "auto", ...card }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>{selectedActivity.title}</div>
                  <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{selectedActivity.type}</div>
                </div>
                <button type="button" style={btn} onClick={() => setViewMoreOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Description</div>
                  <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>{selectedActivity.description}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Location</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.location}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Duration</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.duration}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Start Date</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.startDate}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>End Date</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.endDate}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Seats</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.availableSlots}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Status</div>
                    <div><span style={badge("#eef2ff", "#3730a3")}>{formatStatus(selectedActivity.status)}</span></div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Context</div>
                    <div><span style={badge("#e0f2fe", "#0369a1")}>{selectedActivity.priorityContext}</span></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Level</div>
                    <div style={{ color: "#475569" }}>{selectedActivity.targetLevel}</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Manager</div>
                  <div style={{ color: "#475569" }}>{managerNameById.get(selectedActivity.responsibleManagerId || "") || "Unassigned"}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Department</div>
                  <div style={{ color: "#475569" }}>{departmentNameById.get(selectedActivity.departmentId || "") || "Unassigned"}</div>
                </div>

                {activitySkills.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Required Skills</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {activitySkills.map((as, idx) => (
                        <div key={idx} style={{ borderLeft: "3px solid #e0f2fe", paddingLeft: 12, color: "#475569", fontSize: 13 }}>
                          <div style={{ fontWeight: 700 }}>{as.skill_id.name}</div>
                          <div style={{ fontSize: 11, color: "#a3a3a3", marginTop: 2 }}>
                            Level: <span style={{ fontWeight: 700 }}>{as.required_level}</span> | Weight: <span style={{ fontWeight: 700 }}>{(as.weight * 100).toFixed(0)}%</span>
                          </div>
                          {as.skill_id.description && (
                            <div style={{ fontSize: 11, marginTop: 4, color: "#64748b" }}>
                              {as.skill_id.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" style={btn} onClick={() => setViewMoreOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div
            onClick={() => !deleting && setDeleteConfirm(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.45)",
              zIndex: 120,
              display: "grid",
              placeItems: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(420px, 96vw)", ...card }}
            >
              <div style={{ fontWeight: 900, fontSize: 16, color: "#dc2626" }}>Delete Activity?</div>
              <div style={{ marginTop: 8, color: "#64748b", fontWeight: 700 }}>
                This action cannot be undone. Are you sure you want to delete this activity?
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" style={btn} disabled={deleting} onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ ...btn, background: "#dc2626", color: "white", border: "none" }}
                  disabled={deleting}
                  onClick={() => onDelete(deleteConfirm)}
                >
                  {deleting ? "Deleting..." : "Delete Activity"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
