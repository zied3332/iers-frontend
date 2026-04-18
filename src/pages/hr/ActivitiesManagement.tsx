import React, { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiTrash2, FiPlus, FiX, FiSearch, FiFilter, FiExternalLink, FiUsers } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
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

// ─────────────────────────────────────────────────────────────
// 🎨 Design Tokens (keeping your CSS variables + color palette)
// ─────────────────────────────────────────────────────────────
const styles = {
  // Layout containers
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px" } as React.CSSProperties,
  container: { maxWidth: "1400px", margin: "0 auto" } as React.CSSProperties,
  
  // Card system
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
  } as React.CSSProperties,
  cardHover: {
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    transform: "translateY(-2px)",
  } as React.CSSProperties,
  
  // Inputs & Forms
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "14px",
    border: "1px solid var(--input-border)",
    outline: "none",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "15px",
    fontWeight: 500,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  } as React.CSSProperties,
  inputFocus: {
    borderColor: "var(--primary, #3b82f6)",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--muted)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  } as React.CSSProperties,
  
  // Buttons
  btn: {
    padding: "10px 18px",
    borderRadius: "14px",
    border: "1px solid var(--input-border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  } as React.CSSProperties,
  btnPrimary: {
    background: "#1f7a5a",
    color: "white",
    border: "none",
    boxShadow: "0 4px 12px rgba(31, 122, 90, 0.3)",
  } as React.CSSProperties,
  btnPrimaryHover: {
    background: "#1a664a",
    transform: "translateY(-1px)",
    boxShadow: "0 6px 16px rgba(31, 122, 90, 0.4)",
  } as React.CSSProperties,
  btnDanger: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
  } as React.CSSProperties,
  btnGhost: {
    background: "transparent",
    border: "1px dashed var(--border)",
    color: "var(--muted)",
  } as React.CSSProperties,
  
  // Badges & Tags
  badge: (bg: string, color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: "999px",
    background: bg,
    color,
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.02em",
  }) as React.CSSProperties,
  
  // Typography
  heading: { fontSize: "36px", fontWeight: 800, margin: 0, lineHeight: 1.2 } as React.CSSProperties,
  subheading: { fontSize: "22px", fontWeight: 700, margin: 0 } as React.CSSProperties,
  muted: { color: "var(--muted)", fontWeight: 500 } as React.CSSProperties,
  
  // Section headers
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,
  
  // Grid layouts
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" } as React.CSSProperties,
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" } as React.CSSProperties,
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" } as React.CSSProperties,
  
  // Modal overlay
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.5)",
    backdropFilter: "blur(4px)",
    zIndex: 110,
    display: "grid",
    placeItems: "center",
    padding: "20px",
  } as React.CSSProperties,
  
  // Activity card
  activityCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: "240px",
    transition: "all 0.2s ease",
    cursor: "pointer",
  } as React.CSSProperties,
  activityCardHover: {
    borderColor: "var(--primary, #3b82f6)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  } as React.CSSProperties,
  
  // Skill item
  skillItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "var(--surface)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  } as React.CSSProperties,
  
  // Empty state
  emptyState: {
    textAlign: "center",
    padding: "32px 20px",
    color: "var(--muted)",
  } as React.CSSProperties,
} as const;

// ─────────────────────────────────────────────────────────────
// 📋 Constants & Helpers
// ─────────────────────────────────────────────────────────────
const activityTypeOptions: ActivityType[] = ["TRAINING", "CERTIFICATION", "PROJECT", "MISSION", "AUDIT"];
const levelOptions: DesiredLevel[] = ["LOW", "MEDIUM", "HIGH"];
const contextOptions: PriorityContext[] = ["UPSKILLING", "EXPERTISE", "DEVELOPMENT"];
/** Board grouping — lifecycle is system-driven but columns stay for filtering */
const statusOptions: ActivityStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const skillLevelOptions: ("LOW" | "MEDIUM" | "HIGH" | "EXPERT")[] = ["LOW", "MEDIUM", "HIGH", "EXPERT"];

const formatLabel = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

function canDeleteActivity(a: ActivityRecord): boolean {
  return a.status === "PLANNED" && (a.workflowStatus === "DRAFT" || !a.workflowStatus);
}

// Calculate working days between two dates (excluding weekends)
const calculateWorkingDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  return workingDays;
};

const statusPalette: Record<ActivityStatus, { bg: string; color: string }> = {
  PLANNED: { bg: "#eff6ff", color: "#1d4ed8" },
  IN_PROGRESS: { bg: "#fef3c7", color: "#a16207" },
  COMPLETED: { bg: "#ecfdf5", color: "#047857" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

const departmentColors = ["#075985", "#5b21b6", "#c2410c", "#166534", "#be123c", "#7c2d12", "#4338ca"];

// ─────────────────────────────────────────────────────────────
// 🧩 Types
// ─────────────────────────────────────────────────────────────
type FormState = {
  title: string;
  type: ActivityType;
  availableSlots: number;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  duration: string;
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
  responsibleManagerId: string;
  departmentId: string;
};

const INITIAL_FORM: FormState = {
  title: "", type: "TRAINING", availableSlots: 1, description: "", location: "",
  startDate: "", endDate: "", duration: "",
  responsibleManagerId: "", departmentId: "", priorityContext: "UPSKILLING", targetLevel: "MEDIUM",
};

// ─────────────────────────────────────────────────────────────
// 🚀 Main Component
// ─────────────────────────────────────────────────────────────
export default function ActivitiesManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    } catch {}
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
    responsibleManagerId: "", departmentId: "",
  });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);

  const sectionGroupByParam = searchParams.get("sectionGroupBy");
  const sectionKeyParam = searchParams.get("sectionKey");
  const isValidSectionGroupBy = sectionGroupByParam === "status" || sectionGroupByParam === "department";
  const sectionViewGroupBy = isValidSectionGroupBy ? sectionGroupByParam : null;
  const isSectionView = Boolean(sectionViewGroupBy && sectionKeyParam);

  // Persist preference
  useEffect(() => {
    try { localStorage.setItem("activityGroupBy", groupBy); } catch {}
  }, [groupBy]);

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [activitiesRes, usersRes, departmentsRes, skillsRes] = await Promise.allSettled([
          listActivities(), getUsers(), getAllDepartments(), listSkills(),
        ]);
        if (activitiesRes.status === "fulfilled") setActivities(activitiesRes.value || []);
        if (usersRes.status === "fulfilled") setUsers(usersRes.value || []);
        if (departmentsRes.status === "fulfilled") setDepartments(departmentsRes.value || []);
        if (skillsRes.status === "fulfilled") setSkills(skillsRes.value || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived data
  const managers = useMemo(() =>
    (users || []).filter((u) => String(u.role || "").toUpperCase() === "MANAGER"), [users]);

  // Filter managers by selected department for the activity form
  const formFilteredManagers = useMemo(() => {
    if (!form.departmentId) return [];
    return managers.filter((m) =>
      String(m.department || "").toLowerCase() === String(form.departmentId || "").toLowerCase() ||
      String(m.department || "") === String(form.departmentId || "")
    );
  }, [managers, form.departmentId]);

  // Filter managers by selected department for the assignment form
  const assignFilteredManagers = useMemo(() => {
    if (!assignForm.departmentId) return [];
    return managers.filter((m) =>
      String(m.department || "").toLowerCase() === String(assignForm.departmentId || "").toLowerCase() ||
      String(m.department || "") === String(assignForm.departmentId || "")
    );
  }, [managers, assignForm.departmentId]);

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
        a.title, a.type, a.location, a.duration, a.startDate, a.endDate, a.status,
        managerNameById.get(a.responsibleManagerId || "") || "",
        departmentNameById.get(a.departmentId || "") || "",
        a.description, a.priorityContext, a.targetLevel,
        ...a.requiredSkills.map((s) => `${s.name} ${s.type} ${s.desiredLevel}`),
      ].join(" ").toLowerCase();
      return blob.includes(search);
    });
  }, [activities, q, managerNameById, departmentNameById]);

  const groupedBoard = useMemo(() => {
    const sections: Array<{ key: string; title: string; items: ActivityRecord[]; color?: string }> = [];
    
    if (groupBy === "status") {
      statusOptions.forEach((status) => {
        sections.push({
          key: status,
          title: formatLabel(status),
          items: filtered.filter((a) => (a.status || "PLANNED") === status),
          color: statusPalette[status].color,
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

    orderedDepartments.forEach((d, i) => {
      const key = String(d._id);
      sections.push({ 
        key, 
        title: String(d.name || "Unnamed Department"), 
        items: byDepartment.get(key) || [],
        color: departmentColors[i % departmentColors.length],
      });
    });

    if (byDepartment.has("__unassigned__")) {
      sections.push({
        key: "__unassigned__",
        title: "Unassigned Department",
        items: byDepartment.get("__unassigned__") || [],
        color: "var(--muted)",
      });
    }
    return sections;
  }, [filtered, groupBy, departments]);

  const activeBoard = useMemo(() => {
    if (!isSectionView || !sectionViewGroupBy) return groupedBoard;

    const sectionTitle =
      sectionViewGroupBy === "status"
        ? formatLabel(sectionKeyParam || "")
        : sectionKeyParam === "__unassigned__"
          ? "Unassigned Department"
          : departmentNameById.get(sectionKeyParam || "") || "Department";

    const sectionItems = filtered.filter((a) => {
      if (sectionViewGroupBy === "status") return (a.status || "PLANNED") === sectionKeyParam;
      const departmentKey = a.departmentId || "__unassigned__";
      return departmentKey === sectionKeyParam;
    });

    const sectionColor =
      sectionViewGroupBy === "status"
        ? statusPalette[(sectionKeyParam as ActivityStatus) || "PLANNED"]?.color || "var(--text)"
        : "var(--text)";

    return [{ key: sectionKeyParam || "section", title: sectionTitle, items: sectionItems, color: sectionColor }];
  }, [isSectionView, sectionViewGroupBy, sectionKeyParam, groupedBoard, filtered, departmentNameById]);

  const openSectionView = (sectionKey: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sectionGroupBy", groupBy);
    params.set("sectionKey", sectionKey);
    navigate({ search: params.toString() });
  };

  const clearSectionView = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("sectionGroupBy");
    params.delete("sectionKey");
    navigate({ search: params.toString() });
  };

  // ─────────────────────────────────────────────────────────
  // 🎯 Handlers
  // ─────────────────────────────────────────────────────────
  const addSelectedSkill = () => setSelectedSkills((prev) => [
    ...prev, { skillId: "", requiredLevel: "MEDIUM", weight: 1 },
  ]);

  const removeSelectedSkill = (index: number) => 
    setSelectedSkills((prev) => prev.filter((_, i) => i !== index));

  const updateSelectedSkill = (index: number, patch: Partial<SkillSelectionState>) => 
    setSelectedSkills((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const validate = (): string => {
    if (!form.title.trim()) return "Activity title is required.";
    if (!form.description.trim()) return "Detailed description is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!form.startDate) return "Start date is required.";
    if (!form.endDate) return "End date is required.";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) 
      return "End date must be after start date.";
    if (!form.duration.trim()) return "Duration is required (e.g., 4 weeks, 6 days).";
    if (!Number.isFinite(form.availableSlots) || form.availableSlots <= 0) 
      return "Seats must be greater than 0.";
    if (!form.departmentId) return "Department is required.";
    if (!form.responsibleManagerId) return "Responsible manager is required.";
    return "";
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }

    const payload: CreateActivityInput = {
      title: form.title.trim(), type: form.type, requiredSkills: [],
      availableSlots: Number(form.availableSlots), description: form.description.trim(),
      location: form.location.trim(), startDate: form.startDate, endDate: form.endDate,
      duration: form.duration.trim(),
      responsibleManagerId: form.responsibleManagerId || undefined,
      departmentId: form.departmentId || undefined,
      priorityContext: form.priorityContext, targetLevel: form.targetLevel,
    };

    setSaving(true);
    try {
      let activity: ActivityRecord;
      if (selectedActivity) {
        activity = await updateActivityById(selectedActivity._id, payload);
        setActivities((prev) => prev.map((a) => (a._id === activity._id ? activity : a)));
        setSuccess("✓ Activity updated successfully");
        setSelectedActivity(null);
      } else {
        activity = await createActivity(payload);
        setActivities((prev) => [activity, ...prev]);
        setSuccess("✓ Activity created successfully");
      }

      // Handle skills
      if (selectedActivity) {
        for (const oldSkill of activitySkills) {
          await removeSkillFromActivity(selectedActivity._id, oldSkill.skill_id._id);
        }
      }
      for (const skillSel of selectedSkills) {
        if (skillSel.skillId) {
          await addSkillToActivity(activity._id, skillSel.skillId, skillSel.requiredLevel, skillSel.weight);
        }
      }

      setForm(INITIAL_FORM); setSelectedSkills([]); setActivitySkills([]);
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
    } catch (e) { console.error("Failed to load skills:", e); setActivitySkills([]); }
    setViewMoreOpen(true);
  };

  const openEdit = async (a: ActivityRecord) => {
    setSelectedActivity(a);
    const workingDays = calculateWorkingDays(a.startDate, a.endDate);
    setCalculatedDuration(workingDays);
    setForm({
      title: a.title, type: a.type, availableSlots: a.availableSlots,
      description: a.description, location: a.location, startDate: a.startDate,
      endDate: a.endDate, duration: a.duration,
      responsibleManagerId: a.responsibleManagerId || "", departmentId: a.departmentId || "",
      priorityContext: a.priorityContext, targetLevel: a.targetLevel,
    });
    try {
      const actSkills = await getActivitySkills(a._id);
      setActivitySkills(actSkills);
      setSelectedSkills(actSkills.map((as) => ({
        skillId: as.skill_id._id, requiredLevel: as.required_level, weight: as.weight,
      })));
    } catch (e) { console.error("Failed to load skills:", e); setActivitySkills([]); setSelectedSkills([]); }
    setCreateOpen(true);
  };

  const onDelete = async (activityId: string) => {
    setDeleting(true); setError(""); setSuccess("");
    try {
      await deleteActivityById(activityId);
      setActivities((prev) => prev.filter((x) => x._id !== activityId));
      setDeleteConfirm(null);
      setSuccess("✓ Activity deleted");
    } catch (e: any) {
      setError(e?.message || "Failed to delete activity.");
    } finally { setDeleting(false); }
  };

  const saveAssign = async () => {
    if (!selectedActivity) return;
    setAssignSaving(true); setError(""); setSuccess("");
    try {
      const updated = await updateActivityById(selectedActivity._id, {
        responsibleManagerId: assignForm.responsibleManagerId || undefined,
        departmentId: assignForm.departmentId || undefined,
      });
      setActivities((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setAssignOpen(false); setSelectedActivity(null);
      setSuccess("✓ Assignment updated");
    } catch (e: any) {
      setError(e?.message || "Failed to update assignment.");
    } finally { setAssignSaving(false); }
  };

  // ─────────────────────────────────────────────────────────
  // 🎨 Render Helpers
  // ─────────────────────────────────────────────────────────
  const renderAlert = () => {
    if (!error && !success) return null;
    return (
      <div style={{
        ...styles.card, marginTop: "16px",
        borderLeft: `4px solid ${error ? "#dc2626" : "#16a34a"}`,
        background: error ? "rgba(239,68,68,0.06)" : "rgba(22,163,74,0.08)",
      }}>
        <span style={{ color: error ? "#b91c1c" : "#166534", fontWeight: 700 }}>
          {error || success}
        </span>
      </div>
    );
  };

  const renderActivityCard = (a: ActivityRecord) => {
    const statusColors = statusPalette[a.status] || statusPalette.PLANNED;
    return (
      <div
        key={a._id}
        style={styles.activityCard}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.activityCardHover)}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "none";
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "18px", lineHeight: 1.3, color: "var(--text)" }} title={a.title}>
              {a.title}
            </div>
            <div style={{ ...styles.muted, fontSize: "13px", marginTop: "4px" }}>
              {formatLabel(a.type)} • {a.duration}
            </div>
          </div>
          <span style={styles.badge(statusColors.bg, statusColors.color)}>
            {formatLabel(a.status)}
          </span>
        </div>

        {/* Meta Grid */}
        <div style={styles.grid2}>
          <div>
            <div style={styles.label}>Priority</div>
            <div style={{ fontWeight: 600 }}>{formatLabel(a.targetLevel)}</div>
          </div>
          <div>
            <div style={styles.label}>Seats</div>
            <div style={{ fontWeight: 600 }}>{a.availableSlots}</div>
          </div>
          <div>
            <div style={styles.label}>Context</div>
            <div style={{ fontWeight: 600 }}>{formatLabel(a.priorityContext)}</div>
          </div>
          <div>
            <div style={styles.label}>Location</div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>{a.location}</div>
          </div>
        </div>

        {/* Skills Preview */}
        {a.requiredSkills?.length > 0 && (
          <div>
            <div style={styles.label}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {a.requiredSkills.slice(0, 3).map((s, i) => (
                <span key={i} style={styles.badge("var(--surface-2)", "var(--muted)")}>
                  {s.name}
                </span>
              ))}
              {a.requiredSkills.length > 3 && (
                <span style={{ ...styles.muted, fontSize: "12px", alignSelf: "center" }}>
                  +{a.requiredSkills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: "auto", display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <button
            type="button"
            style={{ ...styles.btn, fontSize: "13px", padding: "8px 12px", background: "#e0f2fe", border: "1px solid #7dd3fc", color: "#075985" }}
            onClick={(e) => { e.stopPropagation(); openViewMore(a); }}
          >
            <FiEye size={14} /> View
          </button>
          <button
            type="button"
            style={{ ...styles.btn, fontSize: "13px", padding: "8px 12px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#5b21b6" }}
            onClick={(e) => { e.stopPropagation(); openEdit(a); }}
          >
            <FiEdit2 size={14} /> Edit
          </button>
          <button
            type="button"
            style={{ ...styles.btn, fontSize: "13px", padding: "8px 12px", background: "#dcfce7", border: "1px solid #86efac", color: "#166534" }}
            onClick={(e) => { e.stopPropagation(); navigate(`/hr/activities/${a._id}/staffing`); }}
          >
            <FiUsers size={14} /> Staff
          </button>
          {canDeleteActivity(a) ? (
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnDanger, fontSize: "13px", padding: "8px 12px" }}
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(a._id); }}
            >
              <FiTrash2 size={14} /> Delete
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // 🖼️ Main Render
  // ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div className="page-header" style={{ alignItems: "start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Activity Management</h1>
          </div>
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnPrimary, fontSize: "16px", padding: "12px 20px" }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1f7a5a";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(31, 122, 90, 0.3)";
            }}
            onClick={() => {
              setError(""); setSuccess(""); setForm(INITIAL_FORM); setSelectedSkills([]);
              setSelectedActivity(null); setCalculatedDuration(0); setCreateOpen(true);
            }}
          >
            <FiPlus size={18} /> Create New Activity
          </button>
        </div>

        {/* Alert */}
        {renderAlert()}

        {/* Main Board */}
        <div style={{ ...styles.card, marginTop: "20px", padding: 0, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={styles.subheading}>Activities</div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {/* Group By */}
                <div style={{ position: "relative" }}>
                  <FiFilter style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <select
                    style={{ ...styles.input, paddingLeft: "38px", width: "230px", cursor: "pointer" }}
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as "status" | "department")}
                  >
                    <option value="status">Group by Status</option>
                    <option value="department">Group by Department</option>
                  </select>
                </div>
                {/* Search */}
                <div style={{ position: "relative", width: "320px" }}>
                  <FiSearch style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    style={{ ...styles.input, paddingLeft: "38px" }}
                    placeholder="Search activities..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: "24px" }}>
            {loading ? (
              <div style={{ ...styles.emptyState, fontSize: "16px" }}>Loading activities...</div>
            ) : filtered.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}>No activities found</div>
                <div style={{ fontSize: "14px" }}>Try adjusting your search or create a new activity</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {activeBoard.map((section) => {
                  const items = section.items || [];
                  const visibleItems = isSectionView ? items : items.slice(-3);
                  const hasOverflow = !isSectionView && items.length > 3;
                  return (
                    <div key={section.key}>
                      <div style={styles.sectionHeader}>
                        <div style={{ fontWeight: 800, fontSize: "20px", color: section.color || "var(--text)" }}>
                          {section.title}
                        </div>
                        <span style={styles.badge("var(--surface-2)", "var(--muted)")}>{items.length}</span>
                        {hasOverflow && (
                          <button
                            type="button"
                            style={{
                              ...styles.btn,
                              marginLeft: "auto",
                              padding: "8px 12px",
                              borderRadius: "12px",
                              background: "#e0f2fe",
                              border: "1px solid #7dd3fc",
                              color: "#075985",
                              fontSize: "13px",
                              fontWeight: 800,
                            }}
                            title={`Show all ${section.title} activities`}
                            onClick={() => openSectionView(section.key)}
                          >
                            <FiExternalLink size={16} /> View all
                          </button>
                        )}
                        {isSectionView && (
                          <button
                            type="button"
                            style={{ ...styles.btn, marginLeft: "auto", padding: "6px 12px", fontSize: "12px" }}
                            onClick={clearSectionView}
                          >
                            Back to all sections
                          </button>
                        )}
                      </div>
                      {items.length === 0 ? (
                        <div style={{ ...styles.emptyState, padding: "20px", background: "var(--surface)", borderRadius: "14px" }}>
                          No activities in this section
                        </div>
                      ) : (
                        <div
                          style={
                            isSectionView
                              ? {
                                  display: "grid",
                                  gap: "16px",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                  width: "100%",
                                  maxWidth: "1120px",
                                }
                              : { display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "8px", scrollBehavior: "smooth" }
                          }
                        >
                          {visibleItems.map((a) => renderActivityCard(a))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            📝 Create/Edit Modal
            ───────────────────────────────────────────── */}
        {createOpen && (
          <div
            onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}
            style={styles.modalOverlay}
          >
            <form
              onSubmit={onCreate}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...styles.card, width: "min(1100px, 98vw)", maxHeight: "92vh",
                overflowY: "auto", fontSize: "15px", padding: "28px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "24px", color: "var(--text)" }}>
                    {selectedActivity ? "✏️ Edit Activity" : "✨ Create Activity"}
                  </div>
                  <div style={{ ...styles.muted, fontSize: "14px", marginTop: "4px" }}>
                    Fill in the details below to {selectedActivity ? "update" : "create"} this activity
                  </div>
                </div>
                <button 
                  type="button" 
                  style={{ ...styles.btn, padding: "8px 14px" }} 
                  onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}
                >
                  <FiX size={16} /> Close
                </button>
              </div>

              {/* Basic Info */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "16px", color: "var(--text)" }}>📋 Basic Information</div>
                <div style={styles.grid2}>
                  <div>
                    <label style={styles.label}>Activity Title *</label>
                    <input
                      style={styles.input}
                      placeholder="e.g., Advanced React Patterns Workshop"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Type</label>
                    <select
                      style={styles.input}
                      value={form.type}
                      onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ActivityType }))}
                    >
                      {activityTypeOptions.map((x) => <option key={x} value={x}>{formatLabel(x)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <label style={styles.label}>Description *</label>
                  <textarea
                    style={{ ...styles.input, minHeight: "100px", resize: "vertical" }}
                    placeholder="Detailed description of the activity..."
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Skills Section */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text)" }}>🎯 Required Skills</div>
                  {skills.length > 0 && (
                    <button type="button" style={{ ...styles.btn, ...styles.btnGhost, fontSize: "13px" }} onClick={addSelectedSkill}>
                      <FiPlus size={14} /> Add Skill
                    </button>
                  )}
                </div>
                
                {skills.length === 0 ? (
                  <div style={{ ...styles.muted, fontSize: "14px", textAlign: "center", padding: "12px" }}>
                    No skills available in the system yet.
                  </div>
                ) : selectedSkills.length === 0 ? (
                  <div style={{ ...styles.muted, fontSize: "14px", textAlign: "center", padding: "12px" }}>
                    Click "Add Skill" to define required competencies
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {selectedSkills.map((skillSel, index) => (
                      <div key={index} style={styles.skillItem}>
                        <select
                          style={{ ...styles.input, flex: 2 }}
                          value={skillSel.skillId}
                          onChange={(e) => updateSelectedSkill(index, { skillId: e.target.value })}
                        >
                          <option value="">-- Select skill --</option>
                          {skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <select
                          style={{ ...styles.input, flex: 1 }}
                          value={skillSel.requiredLevel}
                          onChange={(e) => updateSelectedSkill(index, { requiredLevel: e.target.value as any })}
                        >
                          {skillLevelOptions.map((x) => <option key={x} value={x}>{formatLabel(x)}</option>)}
                        </select>
                        <input
                          style={{ ...styles.input, flex: 1, textAlign: "center" }}
                          type="number" min="0" max="100"
                          placeholder="Weight %"
                          value={Math.round(skillSel.weight * 100)}
                          onChange={(e) => {
                            const pct = Math.max(0, Math.min(100, Number(e.target.value)));
                            updateSelectedSkill(index, { weight: pct / 100 });
                          }}
                        />
                        <button 
                          type="button" 
                          style={{ ...styles.btn, ...styles.btnDanger, padding: "10px 12px" }}
                          onClick={() => removeSelectedSkill(index)}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logistics Grid */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "16px", color: "var(--text)" }}>📅 Logistics</div>
                <div style={styles.grid4}>
                  <div>
                    <label style={styles.label}>Seats</label>
                    <input
                      style={styles.input} type="number" min="1"
                      value={form.availableSlots}
                      onChange={(e) => setForm((prev) => ({ ...prev, availableSlots: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Location</label>
                    <input
                      style={styles.input} placeholder="e.g., Remote, Paris HQ"
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Start Date *</label>
                    <input
                      style={styles.input} type="date"
                      value={form.startDate}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        const workingDays = calculateWorkingDays(newStartDate, form.endDate);
                        setCalculatedDuration(workingDays);
                        setForm((prev) => ({
                          ...prev,
                          startDate: newStartDate,
                          duration: workingDays > 0 ? `${workingDays} days` : prev.duration,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>End Date *</label>
                    <input
                      style={styles.input} type="date"
                      value={form.endDate}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        const workingDays = calculateWorkingDays(form.startDate, newEndDate);
                        setCalculatedDuration(workingDays);
                        setForm((prev) => ({
                          ...prev,
                          endDate: newEndDate,
                          duration: workingDays > 0 ? `${workingDays} days` : prev.duration,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div style={{ ...styles.grid3, marginTop: "14px" }}>
                  <div>
                    <label style={styles.label}>
                      Duration
                      {calculatedDuration > 0 && (
                        <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginLeft: "6px" }}>
                          (max: {calculatedDuration} days)
                        </span>
                      )}
                    </label>
                    <input
                      style={styles.input} placeholder="e.g., 4 weeks"
                      value={form.duration}
                      onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Department *</label>
                    <select
                      style={styles.input}
                      value={form.departmentId}
                      onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value, responsibleManagerId: "" }))}
                    >
                      <option value="">Select department...</option>
                      {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Responsible Manager *</label>
                    <select
                      style={styles.input}
                      value={form.responsibleManagerId}
                      onChange={(e) => setForm((prev) => ({ ...prev, responsibleManagerId: e.target.value }))}
                      disabled={!form.departmentId}
                    >
                      <option value="">
                        {form.departmentId ? "Select manager..." : "Select department first"}
                      </option>
                      {formFilteredManagers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Prioritization */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "16px", color: "var(--text)" }}>🎯 Prioritization</div>
                <div style={styles.grid2}>
                  <div>
                    <label style={styles.label}>Context</label>
                    <select
                      style={styles.input}
                      value={form.priorityContext}
                      onChange={(e) => setForm((prev) => ({ ...prev, priorityContext: e.target.value as PriorityContext }))}
                    >
                      {contextOptions.map((x) => <option key={x} value={x}>{formatLabel(x)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Target Level</label>
                    <select
                      style={styles.input}
                      value={form.targetLevel}
                      onChange={(e) => setForm((prev) => ({ ...prev, targetLevel: e.target.value as DesiredLevel }))}
                    >
                      {levelOptions.map((x) => <option key={x} value={x}>{formatLabel(x)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
                <div style={{ ...styles.muted, fontSize: "14px" }}>
                  💡 Prioritization uses context + target level for smart recommendations
                </div>
                <button 
                  type="submit" 
                  style={{ ...styles.btn, ...styles.btnPrimary, fontSize: "15px", padding: "12px 28px" }}
                  disabled={saving}
                >
                  {saving ? (selectedActivity ? "Updating..." : "Creating...") : (selectedActivity ? "✓ Update Activity" : "✨ Create Activity")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            👥 Assign Modal
            ───────────────────────────────────────────── */}
        {assignOpen && selectedActivity && (
          <div onClick={() => !assignSaving && setAssignOpen(false)} style={styles.modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 96vw)", ...styles.card, padding: "24px" }}>
              <div style={{ fontWeight: 800, fontSize: "20px", color: "var(--text)", marginBottom: "4px" }}>👥 Assign Activity</div>
              <div style={{ ...styles.muted, fontSize: "14px", marginBottom: "20px" }}>{selectedActivity.title}</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={styles.label}>Department *</label>
                  <select
                    style={styles.input}
                    value={assignForm.departmentId}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, departmentId: e.target.value, responsibleManagerId: "" }))}
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Responsible Manager *</label>
                  <select
                    style={styles.input}
                    value={assignForm.responsibleManagerId}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, responsibleManagerId: e.target.value }))}
                    disabled={!assignForm.departmentId}
                  >
                    <option value="">
                      {assignForm.departmentId ? "Select manager..." : "Select department first"}
                    </option>
                    {assignFilteredManagers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" style={styles.btn} onClick={() => !assignSaving && setAssignOpen(false)}>Cancel</button>
                <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} disabled={assignSaving} onClick={saveAssign}>
                  {assignSaving ? "Saving..." : "✓ Save Assignment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            👁️ View More Modal
            ───────────────────────────────────────────── */}
        {viewMoreOpen && selectedActivity && (
          <div onClick={() => setViewMoreOpen(false)} style={styles.modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 96vw)", maxHeight: "88vh", overflowY: "auto", ...styles.card, padding: "24px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "22px", color: "var(--text)" }}>{selectedActivity.title}</div>
                  <div style={{ ...styles.muted, fontSize: "14px", marginTop: "4px" }}>
                    {formatLabel(selectedActivity.type)} • <span style={styles.badge(statusPalette[selectedActivity.status].bg, statusPalette[selectedActivity.status].color)}>{formatLabel(selectedActivity.status)}</span>
                  </div>
                </div>
                <button type="button" style={styles.btn} onClick={() => setViewMoreOpen(false)}><FiX size={16} /> Close</button>
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gap: "18px" }}>
                <div>
                  <div style={styles.label}>Description</div>
                  <div style={{ color: "var(--text)", lineHeight: 1.6 }}>{selectedActivity.description || "—"}</div>
                </div>

                <div style={styles.grid2}>
                  <div><div style={styles.label}>Location</div><div>{selectedActivity.location || "—"}</div></div>
                  <div><div style={styles.label}>Duration</div><div>{selectedActivity.duration || "—"}</div></div>
                  <div><div style={styles.label}>Start Date</div><div>{selectedActivity.startDate || "—"}</div></div>
                  <div><div style={styles.label}>End Date</div><div>{selectedActivity.endDate || "—"}</div></div>
                  <div><div style={styles.label}>Available Seats</div><div>{selectedActivity.availableSlots}</div></div>
                  <div><div style={styles.label}>Target Level</div><div>{formatLabel(selectedActivity.targetLevel)}</div></div>
                </div>

                <div style={styles.grid2}>
                  <div>
                    <div style={styles.label}>Context</div>
                    <span style={styles.badge("#e0f2fe", "#0369a1")}>{formatLabel(selectedActivity.priorityContext)}</span>
                  </div>
                  <div>
                    <div style={styles.label}>Manager</div>
                    <div>{managerNameById.get(selectedActivity.responsibleManagerId || "") || "Unassigned"}</div>
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Department</div>
                  <div>{departmentNameById.get(selectedActivity.departmentId || "") || "Unassigned"}</div>
                </div>

                {activitySkills.length > 0 && (
                  <div>
                    <div style={styles.label}>Required Skills</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                      {activitySkills.map((as, idx) => (
                        <div key={idx} style={{ 
                          padding: "12px 16px", background: "var(--surface)", 
                          borderRadius: "12px", borderLeft: "3px solid #3b82f6" 
                        }}>
                          <div style={{ fontWeight: 700 }}>{as.skill_id.name}</div>
                          <div style={{ ...styles.muted, fontSize: "13px", marginTop: "4px" }}>
                            Level: <strong>{formatLabel(as.required_level)}</strong> • 
                            Weight: <strong>{Math.round(as.weight * 100)}%</strong>
                          </div>
                          {as.skill_id.description && (
                            <div style={{ ...styles.muted, fontSize: "13px", marginTop: "6px", fontStyle: "italic" }}>
                              {as.skill_id.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────
            🗑️ Delete Confirmation
            ───────────────────────────────────────────── */}
        {deleteConfirm && (
          <div onClick={() => !deleting && setDeleteConfirm(null)} style={styles.modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 96vw)", ...styles.card, padding: "24px", borderLeft: "4px solid #dc2626" }}>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#dc2626", marginBottom: "12px" }}>⚠️ Delete Activity?</div>
              <div style={{ ...styles.muted, marginBottom: "20px" }}>
                Only unused planned activities can be deleted. This cannot be undone.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" style={styles.btn} disabled={deleting} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  type="button"
                  style={{ ...styles.btn, background: "#dc2626", color: "white", border: "none" }}
                  disabled={deleting}
                  onClick={() => onDelete(deleteConfirm)}
                >
                  {deleting ? "Deleting..." : "🗑️ Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}