import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FiEdit2,
  FiEye,
  FiTrash2,
  FiPlus,
  FiX,
  FiSearch,
  FiFilter,
  FiExternalLink,
  FiUsers,
} from "react-icons/fi";
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
import {
  getAllDepartments,
  type Department,
} from "../../services/departments.service";

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    padding: "24px",
  } as React.CSSProperties,

  container: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto",
  } as React.CSSProperties,

  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
  } as React.CSSProperties,

  boardCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 6px 24px rgba(15, 23, 42, 0.04)",
  } as React.CSSProperties,

  input: {
    width: "100%",
    height: "46px",
    padding: "0 14px",
    borderRadius: "14px",
    border: "1px solid var(--input-border)",
    outline: "none",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: 500,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid var(--input-border)",
    outline: "none",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: 500,
    resize: "vertical",
    minHeight: "100px",
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--muted)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  btn: {
    height: "42px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid var(--input-border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  btnPrimary: {
    background: "var(--primary)",
    color: "var(--primary-on)",
    border: "1px solid var(--primary-border)",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--primary) 35%, transparent)",
  } as React.CSSProperties,

  btnSecondary: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
  } as React.CSSProperties,

  btnGhost: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px dashed var(--border)",
  } as React.CSSProperties,

  btnDangerSoft: {
    background: "#fff5f5",
    color: "#b42318",
    border: "1px solid #f3c7c7",
  } as React.CSSProperties,

  btnLink: {
    background: "transparent",
    border: "none",
    padding: 0,
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  badge: (bg: string, color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 10px",
      borderRadius: "999px",
      background: bg,
      color,
      fontWeight: 700,
      fontSize: "11px",
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
    }) as React.CSSProperties,

  muted: {
    color: "var(--muted)",
    fontWeight: 600,
  } as React.CSSProperties,

  subheading: {
    fontSize: "22px",
    fontWeight: 800,
    margin: 0,
    color: "var(--text)",
  } as React.CSSProperties,

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  } as React.CSSProperties,

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  } as React.CSSProperties,

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
  } as React.CSSProperties,

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.46)",
    backdropFilter: "blur(4px)",
    zIndex: 110,
    display: "grid",
    placeItems: "center",
    padding: "20px",
  } as React.CSSProperties,

  activityCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: "220px",
    width: "100%",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
  } as React.CSSProperties,

  activityCardHover: {
    borderColor: "var(--primary-border)",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    transform: "translateY(-2px)",
  } as React.CSSProperties,

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 14px",
    color: "var(--muted)",
    fontSize: "13px",
    fontWeight: 600,
  } as React.CSSProperties,

  divider: {
    height: "1px",
    background: "var(--border)",
    width: "100%",
  } as React.CSSProperties,

  skillChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: "12px",
  } as React.CSSProperties,

  skillItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "var(--surface)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  } as React.CSSProperties,

  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "var(--muted)",
  } as React.CSSProperties,
} as const;

const activityTypeOptions: ActivityType[] = [
  "TRAINING",
  "CERTIFICATION",
  "PROJECT",
  "MISSION",
  "AUDIT",
];
const levelOptions: DesiredLevel[] = ["LOW", "MEDIUM", "HIGH"];
const contextOptions: PriorityContext[] = [
  "UPSKILLING",
  "EXPERTISE",
  "DEVELOPMENT",
];
const skillLevelOptions: ("LOW" | "MEDIUM" | "HIGH" | "EXPERT")[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "EXPERT",
];

const formatLabel = (v: string) =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

function canDeleteActivity(a: ActivityRecord): boolean {
  return a.status === "PLANNED" && (a.workflowStatus === "DRAFT" || !a.workflowStatus);
}

const calculateWorkingDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
    current.setDate(current.getDate() + 1);
  }
  return workingDays;
};

const statusPalette: Record<ActivityStatus, { bg: string; color: string; border: string }> = {
  PLANNED: { bg: "var(--surface-2)", color: "var(--muted)", border: "var(--border)" },
  IN_PROGRESS: { bg: "#fff7e6", color: "#b54708", border: "#f5d9a6" },
  COMPLETED: {
    bg: "var(--primary-weak)",
    color: "var(--primary-soft-text)",
    border: "var(--primary-border)",
  },
  CANCELLED: { bg: "#fef3f2", color: "#b42318", border: "#fecdca" },
};

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

type CreatedSortOrder = "newest" | "oldest";

function toActivityCreationTimestamp(activity: ActivityRecord): number {
  const parsed = Date.parse(String(activity.createdAt || ""));
  if (!Number.isNaN(parsed)) return parsed;
  const fallback = Date.parse(String(activity.startDate || ""));
  return Number.isNaN(fallback) ? 0 : fallback;
}

const INITIAL_FORM: FormState = {
  title: "",
  type: "TRAINING",
  availableSlots: 1,
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  duration: "",
  responsibleManagerId: "",
  departmentId: "",
  priorityContext: "UPSKILLING",
  targetLevel: "MEDIUM",
};

const normalizeExcelHeader = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const asString = (value: unknown) => String(value || "").trim();

const toActivityType = (value: unknown): ActivityType | null => {
  const normalized = asString(value).toUpperCase().replace(/\s+/g, "_");
  const allowed: ActivityType[] = ["TRAINING", "CERTIFICATION", "PROJECT", "MISSION", "AUDIT"];
  return allowed.includes(normalized as ActivityType) ? (normalized as ActivityType) : null;
};

const toPriorityContext = (value: unknown): PriorityContext | null => {
  const normalized = asString(value).toUpperCase().replace(/\s+/g, "_");
  const allowed: PriorityContext[] = ["UPSKILLING", "EXPERTISE", "DEVELOPMENT"];
  return allowed.includes(normalized as PriorityContext) ? (normalized as PriorityContext) : null;
};

const toTargetLevel = (value: unknown): DesiredLevel | null => {
  const normalized = asString(value).toUpperCase().replace(/\s+/g, "_");
  const allowed: DesiredLevel[] = ["LOW", "MEDIUM", "HIGH"];
  return allowed.includes(normalized as DesiredLevel) ? (normalized as DesiredLevel) : null;
};

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
  const [createdSortOrder, setCreatedSortOrder] = useState<CreatedSortOrder>("newest");
  const groupBy: "department" = "department";

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewMoreOpen, setViewMoreOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<SkillSelectionState[]>([]);
  const [assignForm, setAssignForm] = useState<AssignFormState>({
    responsibleManagerId: "",
    departmentId: "",
  });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  const excelImportInputRef = useRef<HTMLInputElement | null>(null);

  const sectionGroupByParam = searchParams.get("sectionGroupBy");
  const sectionKeyParam = searchParams.get("sectionKey");
  const isValidSectionGroupBy = sectionGroupByParam === "department";
  const sectionViewGroupBy = isValidSectionGroupBy ? sectionGroupByParam : null;
  const isSectionView = Boolean(sectionViewGroupBy && sectionKeyParam);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [activitiesRes, usersRes, departmentsRes, skillsRes] =
          await Promise.allSettled([
            listActivities({ hrView: "drafts" }),
            getUsers(),
            getAllDepartments(),
            listSkills(),
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

  const managers = useMemo(
    () => (users || []).filter((u) => String(u.role || "").toUpperCase() === "MANAGER"),
    [users]
  );

  const formFilteredManagers = useMemo(() => {
    if (!form.departmentId) return [];
    return managers.filter(
      (m) =>
        String(m.department || "").toLowerCase() ===
          String(form.departmentId || "").toLowerCase() ||
        String(m.department || "") === String(form.departmentId || "")
    );
  }, [managers, form.departmentId]);

  const assignFilteredManagers = useMemo(() => {
    if (!assignForm.departmentId) return [];
    return managers.filter(
      (m) =>
        String(m.department || "").toLowerCase() ===
          String(assignForm.departmentId || "").toLowerCase() ||
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
    const base = !search
      ? activities
      : activities.filter((a) => {
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

    const copy = [...base];
    copy.sort((a, b) => {
      const aTs = toActivityCreationTimestamp(a);
      const bTs = toActivityCreationTimestamp(b);
      return createdSortOrder === "oldest" ? aTs - bTs : bTs - aTs;
    });
    return copy;
  }, [activities, q, managerNameById, departmentNameById, createdSortOrder]);

  const groupedBoard = useMemo(() => {
    const sections: Array<{
      key: string;
      title: string;
      items: ActivityRecord[];
      tone?: string;
    }> = [];

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
      sections.push({
        key,
        title: String(d.name || "Unnamed Department"),
        items: byDepartment.get(key) || [],
        tone: "var(--text)",
      });
    });

    if (byDepartment.has("__unassigned__")) {
      sections.push({
        key: "__unassigned__",
        title: "Unassigned Department",
        items: byDepartment.get("__unassigned__") || [],
        tone: "var(--text)",
      });
    }

    return sections;
  }, [filtered, groupBy, departments]);

  const activeBoard = useMemo(() => {
    if (!isSectionView || !sectionViewGroupBy) return groupedBoard;

    const sectionTitle =
      sectionKeyParam === "__unassigned__"
        ? "Unassigned Department"
        : departmentNameById.get(sectionKeyParam || "") || "Department";

    const sectionItems = filtered.filter((a) => {
      const departmentKey = a.departmentId || "__unassigned__";
      return departmentKey === sectionKeyParam;
    });

    const sectionTone = "var(--text)";

    return [
      {
        key: sectionKeyParam || "section",
        title: sectionTitle,
        items: sectionItems,
        tone: sectionTone,
      },
    ];
  }, [
    isSectionView,
    sectionViewGroupBy,
    sectionKeyParam,
    groupedBoard,
    filtered,
    departmentNameById,
  ]);

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

  const addSelectedSkill = () =>
    setSelectedSkills((prev) => [
      ...prev,
      { skillId: "", requiredLevel: "MEDIUM", weight: 1 },
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
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      return "End date must be after start date.";
    }
    if (!form.duration.trim()) return "Duration is required (e.g., 4 weeks, 6 days).";
    if (!Number.isFinite(form.availableSlots) || form.availableSlots <= 0) {
      return "Seats must be greater than 0.";
    }
    if (!form.departmentId) return "Department is required.";
    if (!form.responsibleManagerId) return "Responsible manager is required.";
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
      responsibleManagerId: form.responsibleManagerId || undefined,
      departmentId: form.departmentId || undefined,
      priorityContext: form.priorityContext,
      targetLevel: form.targetLevel,
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

      if (selectedActivity) {
        for (const oldSkill of activitySkills) {
          await removeSkillFromActivity(selectedActivity._id, oldSkill.skill_id._id);
        }
      }

      for (const skillSel of selectedSkills) {
        if (skillSel.skillId) {
          await addSkillToActivity(
            activity._id,
            skillSel.skillId,
            skillSel.requiredLevel,
            skillSel.weight
          );
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
    } catch (e) {
      console.error("Failed to load skills:", e);
      setActivitySkills([]);
    }
    setViewMoreOpen(true);
  };

  const openEdit = async (a: ActivityRecord) => {
    setSelectedActivity(a);
    const workingDays = calculateWorkingDays(a.startDate, a.endDate);
    setCalculatedDuration(workingDays);

    setForm({
      title: a.title,
      type: a.type,
      availableSlots: a.availableSlots,
      description: a.description,
      location: a.location,
      startDate: a.startDate,
      endDate: a.endDate,
      duration: a.duration,
      responsibleManagerId: a.responsibleManagerId || "",
      departmentId: a.departmentId || "",
      priorityContext: a.priorityContext,
      targetLevel: a.targetLevel,
    });

    try {
      const actSkills = await getActivitySkills(a._id);
      setActivitySkills(actSkills);
      setSelectedSkills(
        actSkills.map((as) => ({
          skillId: as.skill_id._id,
          requiredLevel: as.required_level,
          weight: as.weight,
        }))
      );
    } catch (e) {
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
      setSuccess("✓ Activity deleted");
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
        responsibleManagerId: assignForm.responsibleManagerId || undefined,
        departmentId: assignForm.departmentId || undefined,
      });

      setActivities((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setAssignOpen(false);
      setSelectedActivity(null);
      setSuccess("✓ Assignment updated");
    } catch (e: any) {
      setError(e?.message || "Failed to update assignment.");
    } finally {
      setAssignSaving(false);
    }
  };

  const renderAlert = () => {
    if (!error && !success) return null;

    return (
      <div
        style={{
          ...styles.card,
          marginTop: "16px",
          padding: "16px 18px",
              borderLeft: `4px solid ${error ? "#d92d20" : "var(--primary-border)"}`,
              background: error ? "#fff7f7" : "var(--primary-weak)",
        }}
      >
        <span style={{ color: error ? "#b42318" : "var(--primary-soft-text)", fontWeight: 700 }}>
          {error || success}
        </span>
      </div>
    );
  };

  const renderActivityCard = (a: ActivityRecord) => {
    const statusColors = statusPalette[a.status] || statusPalette.PLANNED;
    const managerName = managerNameById.get(a.responsibleManagerId || "") || "Unassigned";
    const departmentName = departmentNameById.get(a.departmentId || "") || "Unassigned";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: "18px",
                lineHeight: 1.35,
                color: "var(--text)",
                marginBottom: "6px",
              }}
              title={a.title}
            >
              {a.title}
            </div>

            <div style={styles.metaRow}>
              <span>{formatLabel(a.type)}</span>
              <span>•</span>
              <span>{a.duration}</span>
            </div>
          </div>

          <span
            style={{
              ...styles.badge(statusColors.bg, statusColors.color),
              border: `1px solid ${statusColors.border}`,
            }}
          >
            {formatLabel(a.status)}
          </span>
        </div>

        <div style={styles.metaRow}>
          <span>
            <strong style={{ color: "var(--text)" }}>{formatLabel(a.targetLevel)}</strong> priority
          </span>
          <span>•</span>
          <span>
            <strong style={{ color: "var(--text)" }}>{a.availableSlots}</strong> seats
          </span>
          <span>•</span>
          <span>{formatLabel(a.priorityContext)}</span>
        </div>

        <div style={styles.metaRow}>
          <span>{departmentName}</span>
          <span>•</span>
          <span>{managerName}</span>
        </div>

        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--muted)",
            minHeight: "20px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {a.location}
        </div>

        {a.requiredSkills?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {a.requiredSkills.slice(0, 3).map((s, i) => (
              <span key={i} style={styles.skillChip}>
                {s.name}
              </span>
            ))}
            {a.requiredSkills.length > 3 && (
              <span style={{ ...styles.skillChip, background: "transparent" }}>
                +{a.requiredSkills.length - 3} more
              </span>
            )}
          </div>
        )}

        <div style={styles.divider} />

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={(e) => {
                e.stopPropagation();
                openViewMore(a);
              }}
            >
              <FiEye size={15} />
              View
            </button>

            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnPrimary, height: "40px" }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/hr/activities/${a._id}/recommendation`);//recommendation//staffing
              }}
            >
              <FiUsers size={15} />
              Launch AI
            </button>
          </div>

          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.btnLink}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(a);
              }}
            >
              <FiEdit2 size={14} />
              Edit
            </button>

            {canDeleteActivity(a) ? (
              <button
                type="button"
                style={{ ...styles.btnLink, color: "#b42318" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(a._id);
                }}
              >
                <FiTrash2 size={14} />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const importActivityFromExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Le fichier Excel est vide.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      throw new Error("Aucune ligne de donnees trouvee dans le fichier.");
    }

    const firstRow = rows[0];
    const normalizedRow = new Map<string, unknown>();
    Object.entries(firstRow).forEach(([key, value]) => {
      normalizedRow.set(normalizeExcelHeader(key), value);
    });

    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = normalizedRow.get(normalizeExcelHeader(key));
        if (asString(value)) return asString(value);
      }
      return "";
    };

    const title = read("title", "activity title", "nom activite");
    const description = read("description", "details", "activity description");
    const location = read("location", "lieu");
    const startDate = read("start date", "start", "date debut");
    const endDate = read("end date", "end", "date fin");
    const duration = read("duration", "duree");
    const seatsRaw = read("seats", "available slots", "places", "nb seats");
    const typeRaw = read("type", "activity type");
    const contextRaw = read("context", "priority context", "prioritization context");
    const levelRaw = read("target level", "level", "priority level");

    if (!title) {
      throw new Error("Colonne Title manquante (ou vide) dans le fichier Excel.");
    }

    const seats = Number(seatsRaw);
    const nextType = toActivityType(typeRaw) ?? "TRAINING";
    const nextContext = toPriorityContext(contextRaw) ?? "UPSKILLING";
    const nextLevel = toTargetLevel(levelRaw) ?? "MEDIUM";
    const nextDuration =
      duration ||
      (startDate && endDate
        ? `${Math.max(0, calculateWorkingDays(startDate, endDate))} days`
        : "");

    setForm((prev) => ({
      ...prev,
      title,
      type: nextType,
      availableSlots: Number.isFinite(seats) && seats > 0 ? Math.round(seats) : prev.availableSlots,
      description,
      location,
      startDate,
      endDate,
      duration: nextDuration,
      // Toujours vides: c'est toi qui les remplis a la main.
      departmentId: "",
      responsibleManagerId: "",
      priorityContext: nextContext,
      targetLevel: nextLevel,
    }));

    if (startDate && endDate) {
      setCalculatedDuration(calculateWorkingDays(startDate, endDate));
    } else {
      setCalculatedDuration(0);
    }
  };

  const onPickExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    try {
      await importActivityFromExcel(file);
      setSuccess(
        "Fichier importe. Complete maintenant Department et Responsible manager manuellement."
      );
    } catch (err: any) {
      setError(err?.message || "Impossible d'importer ce fichier Excel.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div
          className="page-header"
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "8px",
          }}
        >
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Activity Management
            </h1>
            <p style={{ ...styles.muted, margin: "8px 0 0", fontSize: "14px" }}>
              Draft planned activities before launching AI staffing.
            </p>
          </div>

          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnPrimary, height: "46px", padding: "0 18px" }}
            onClick={() => {
              setError("");
              setSuccess("");
              setForm(INITIAL_FORM);
              setSelectedSkills([]);
              setSelectedActivity(null);
              setCalculatedDuration(0);
              setCreateOpen(true);
            }}
          >
            <FiPlus size={17} />
            Create Activity
          </button>
        </div>

        {renderAlert()}

        <div style={{ ...styles.boardCard, marginTop: "22px" }}>
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={styles.subheading}>Activities</div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
               

                <div style={{ position: "relative", width: "320px", maxWidth: "100%" }}>
                  <FiSearch
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                  <input
                    style={{ ...styles.input, paddingLeft: "38px" }}
                    placeholder="Search activities..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select
                  value={createdSortOrder}
                  onChange={(e) => setCreatedSortOrder(e.target.value as CreatedSortOrder)}
                  style={{ ...styles.input, width: "260px", fontWeight: 700 }}
                >
                  <option value="newest">newest first</option>
                  <option value="oldest">oldest first</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ padding: "24px" }}>
            {loading ? (
              <div style={{ ...styles.emptyState, fontSize: "16px" }}>Loading activities...</div>
            ) : filtered.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "42px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>
                  No activities found
                </div>
                <div style={{ fontSize: "14px" }}>
                  Try changing your filters or create a new activity.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
                {activeBoard.map((section) => {
                  const items = section.items || [];
                  const visibleItems = isSectionView ? items : items.slice(-3);
                  const hasOverflow = !isSectionView && items.length > 3;

                  return (
                    <div key={section.key}>
                      <div style={styles.sectionHeader}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "19px",
                            color: "var(--text)",
                          }}
                        >
                          {section.title}
                        </div>

                        <span
                          style={{
                            ...styles.badge("#f8fafc", "#667085"),
                            border: "1px solid var(--border)",
                          }}
                        >
                          {items.length} activities
                        </span>

                        {hasOverflow && (
                          <button
                            type="button"
                            style={{ ...styles.btn, marginLeft: "auto", height: "38px" }}
                            title={`Show all ${section.title} activities`}
                            onClick={() => openSectionView(section.key)}
                          >
                            <FiExternalLink size={15} />
                            View all
                          </button>
                        )}

                        {isSectionView && (
                          <button
                            type="button"
                            style={{ ...styles.btn, marginLeft: "auto", height: "38px" }}
                            onClick={clearSectionView}
                          >
                            Back to all sections
                          </button>
                        )}
                      </div>

                      {items.length === 0 ? (
                        <div
                          style={{
                            ...styles.emptyState,
                            padding: "22px",
                            background: "var(--surface)",
                            borderRadius: "16px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          No activities in this section
                        </div>
                      ) : (
                        <div
                          style={
                            isSectionView
                              ? {
                                  display: "grid",
                                  gap: "16px",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                                  width: "100%",
                                }
                              : {
                                  display: "grid",
                                  gap: "16px",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                                  width: "100%",
                                }
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

        {createOpen && (
          <div
            onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}
            style={styles.modalOverlay}
          >
            <form
              onSubmit={onCreate}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...styles.card,
                width: "min(1100px, 98vw)",
                maxHeight: "92vh",
                overflowY: "auto",
                padding: "28px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "24px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "24px", color: "var(--text)" }}>
                    {selectedActivity ? "Edit Activity" : "Create Activity"}
                  </div>
                  <div style={{ ...styles.muted, fontSize: "14px", marginTop: "4px" }}>
                    Fill in the details below to {selectedActivity ? "update" : "create"} this
                    activity.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {!selectedActivity ? (
                    <>
                      <input
                        ref={excelImportInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={onPickExcelFile}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        style={{ ...styles.btn, ...styles.btnSecondary }}
                        onClick={() => excelImportInputRef.current?.click()}
                        title="Importer une activite depuis Excel"
                      >
                        Import Excel
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    style={{ ...styles.btn, width: "42px", padding: 0 }}
                    onClick={() => !saving && (setCreateOpen(false), setSelectedActivity(null))}
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "16px",
                    marginBottom: "16px",
                    color: "var(--text)",
                  }}
                >
                  Basic Information
                </div>
                {!selectedActivity ? (
                  <div style={{ ...styles.muted, fontSize: "13px", marginBottom: "12px" }}>
                    Excel attendu (1ere ligne): Title, Description, Type, Seats, Location, Start Date, End Date, Duration, Context, Target Level.
                    Department et Responsible manager restent a remplir manuellement.
                  </div>
                ) : null}

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
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          type: e.target.value as ActivityType,
                        }))
                      }
                    >
                      {activityTypeOptions.map((x) => (
                        <option key={x} value={x}>
                          {formatLabel(x)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <label style={styles.label}>Description *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Detailed description of the activity..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text)" }}>
                    Required Skills
                  </div>

                  {skills.length > 0 && (
                    <button
                      type="button"
                      style={{ ...styles.btn, ...styles.btnGhost }}
                      onClick={addSelectedSkill}
                    >
                      <FiPlus size={14} />
                      Add Skill
                    </button>
                  )}
                </div>

                {skills.length === 0 ? (
                  <div
                    style={{
                      ...styles.muted,
                      fontSize: "14px",
                      textAlign: "center",
                      padding: "12px",
                    }}
                  >
                    No skills available in the system yet.
                  </div>
                ) : selectedSkills.length === 0 ? (
                  <div
                    style={{
                      ...styles.muted,
                      fontSize: "14px",
                      textAlign: "center",
                      padding: "12px",
                    }}
                  >
                    Click "Add Skill" to define required competencies.
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
                          <option value="">Select skill...</option>
                          {skills.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>

                        <select
                          style={{ ...styles.input, flex: 1 }}
                          value={skillSel.requiredLevel}
                          onChange={(e) =>
                            updateSelectedSkill(index, {
                              requiredLevel: e.target.value as any,
                            })
                          }
                        >
                          {skillLevelOptions.map((x) => (
                            <option key={x} value={x}>
                              {formatLabel(x)}
                            </option>
                          ))}
                        </select>

                        <input
                          style={{ ...styles.input, flex: 1, textAlign: "center" }}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Weight %"
                          value={Math.round(skillSel.weight * 100)}
                          onChange={(e) => {
                            const pct = Math.max(0, Math.min(100, Number(e.target.value)));
                            updateSelectedSkill(index, { weight: pct / 100 });
                          }}
                        />

                        <button
                          type="button"
                          style={{ ...styles.btn, ...styles.btnDangerSoft, width: "42px", padding: 0 }}
                          onClick={() => removeSelectedSkill(index)}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "16px",
                    marginBottom: "16px",
                    color: "var(--text)",
                  }}
                >
                  Logistics
                </div>

                <div style={styles.grid4}>
                  <div>
                    <label style={styles.label}>Seats</label>
                    <input
                      style={styles.input}
                      type="number"
                      min="1"
                      value={form.availableSlots}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          availableSlots: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Location</label>
                    <input
                      style={styles.input}
                      placeholder="e.g., Remote, Paris HQ"
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Start Date *</label>
                    <input
                      style={styles.input}
                      type="date"
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
                      style={styles.input}
                      type="date"
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
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--muted)",
                            marginLeft: "6px",
                          }}
                        >
                          (max: {calculatedDuration} days)
                        </span>
                      )}
                    </label>
                    <input
                      style={styles.input}
                      placeholder="e.g., 4 weeks"
                      value={form.duration}
                      onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Department *</label>
                    <select
                      style={styles.input}
                      value={form.departmentId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          departmentId: e.target.value,
                          responsibleManagerId: "",
                        }))
                      }
                    >
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Responsible Manager *</label>
                    <select
                      style={styles.input}
                      value={form.responsibleManagerId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          responsibleManagerId: e.target.value,
                        }))
                      }
                      disabled={!form.departmentId}
                    >
                      <option value="">
                        {form.departmentId ? "Select manager..." : "Select department first"}
                      </option>
                      {formFilteredManagers.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "16px",
                    marginBottom: "16px",
                    color: "var(--text)",
                  }}
                >
                  Prioritization
                </div>

                <div style={styles.grid2}>
                  <div>
                    <label style={styles.label}>Context</label>
                    <select
                      style={styles.input}
                      value={form.priorityContext}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          priorityContext: e.target.value as PriorityContext,
                        }))
                      }
                    >
                      {contextOptions.map((x) => (
                        <option key={x} value={x}>
                          {formatLabel(x)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Target Level</label>
                    <select
                      style={styles.input}
                      value={form.targetLevel}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetLevel: e.target.value as DesiredLevel,
                        }))
                      }
                    >
                      {levelOptions.map((x) => (
                        <option key={x} value={x}>
                          {formatLabel(x)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                  paddingTop: "20px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ ...styles.muted, fontSize: "14px" }}>
                  Prioritization uses context and target level for smarter recommendations.
                </div>

                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary, minWidth: "170px" }}
                  disabled={saving}
                >
                  {saving
                    ? selectedActivity
                      ? "Updating..."
                      : "Creating..."
                    : selectedActivity
                    ? "Update Activity"
                    : "Create Activity"}
                </button>
              </div>
            </form>
          </div>
        )}

        {assignOpen && selectedActivity && (
          <div onClick={() => !assignSaving && setAssignOpen(false)} style={styles.modalOverlay}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(520px, 96vw)", ...styles.card, padding: "24px" }}
            >
              <div style={{ fontWeight: 800, fontSize: "20px", color: "var(--text)", marginBottom: "4px" }}>
                Assign Activity
              </div>
              <div style={{ ...styles.muted, fontSize: "14px", marginBottom: "20px" }}>
                {selectedActivity.title}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={styles.label}>Department *</label>
                  <select
                    style={styles.input}
                    value={assignForm.departmentId}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        departmentId: e.target.value,
                        responsibleManagerId: "",
                      }))
                    }
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Responsible Manager *</label>
                  <select
                    style={styles.input}
                    value={assignForm.responsibleManagerId}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        responsibleManagerId: e.target.value,
                      }))
                    }
                    disabled={!assignForm.departmentId}
                  >
                    <option value="">
                      {assignForm.departmentId ? "Select manager..." : "Select department first"}
                    </option>
                    {assignFilteredManagers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  style={styles.btn}
                  onClick={() => !assignSaving && setAssignOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  disabled={assignSaving}
                  onClick={saveAssign}
                >
                  {assignSaving ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMoreOpen && selectedActivity && (
          <div onClick={() => setViewMoreOpen(false)} style={styles.modalOverlay}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(720px, 96vw)",
                maxHeight: "88vh",
                overflowY: "auto",
                ...styles.card,
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: "12px",
                  marginBottom: "20px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "22px", color: "var(--text)" }}>
                    {selectedActivity.title}
                  </div>

                  <div
                    style={{
                      ...styles.muted,
                      fontSize: "14px",
                      marginTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{formatLabel(selectedActivity.type)}</span>
                    <span>•</span>
                    <span
                      style={{
                        ...styles.badge(
                          statusPalette[selectedActivity.status].bg,
                          statusPalette[selectedActivity.status].color
                        ),
                        border: `1px solid ${statusPalette[selectedActivity.status].border}`,
                      }}
                    >
                      {formatLabel(selectedActivity.status)}
                    </span>
                  </div>
                </div>

                <button type="button" style={styles.btn} onClick={() => setViewMoreOpen(false)}>
                  <FiX size={16} />
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: "18px" }}>
                <div>
                  <div style={styles.label}>Description</div>
                  <div style={{ color: "var(--text)", lineHeight: 1.7 }}>
                    {selectedActivity.description || "—"}
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div>
                    <div style={styles.label}>Location</div>
                    <div>{selectedActivity.location || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Duration</div>
                    <div>{selectedActivity.duration || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Start Date</div>
                    <div>{selectedActivity.startDate || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>End Date</div>
                    <div>{selectedActivity.endDate || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Available Seats</div>
                    <div>{selectedActivity.availableSlots}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Target Level</div>
                    <div>{formatLabel(selectedActivity.targetLevel)}</div>
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div>
                    <div style={styles.label}>Context</div>
                    <span
                      style={{
                        ...styles.badge("#f8fafc", "#475467"),
                        border: "1px solid var(--border)",
                      }}
                    >
                      {formatLabel(selectedActivity.priorityContext)}
                    </span>
                  </div>

                  <div>
                    <div style={styles.label}>Manager</div>
                    <div>
                      {managerNameById.get(selectedActivity.responsibleManagerId || "") ||
                        "Unassigned"}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Department</div>
                  <div>
                    {departmentNameById.get(selectedActivity.departmentId || "") || "Unassigned"}
                  </div>
                </div>

                {activitySkills.length > 0 && (
                  <div>
                    <div style={styles.label}>Required Skills</div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginTop: "8px",
                      }}
                    >
                      {activitySkills.map((as, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "14px 16px",
                            background: "var(--surface)",
                            borderRadius: "14px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{as.skill_id.name}</div>
                          <div style={{ ...styles.muted, fontSize: "13px", marginTop: "4px" }}>
                            Level: <strong>{formatLabel(as.required_level)}</strong> • Weight:{" "}
                            <strong>{Math.round(as.weight * 100)}%</strong>
                          </div>
                          {as.skill_id.description && (
                            <div style={{ ...styles.muted, fontSize: "13px", marginTop: "6px" }}>
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

        {deleteConfirm && (
          <div onClick={() => !deleting && setDeleteConfirm(null)} style={styles.modalOverlay}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(440px, 96vw)",
                ...styles.card,
                padding: "24px",
                borderLeft: "4px solid #d92d20",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "18px",
                  color: "#d92d20",
                  marginBottom: "12px",
                }}
              >
                Delete Activity?
              </div>

              <div style={{ ...styles.muted, marginBottom: "20px", lineHeight: 1.6 }}>
                Only unused planned activities can be deleted. This action cannot be undone.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  style={styles.btn}
                  disabled={deleting}
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  style={{ ...styles.btn, background: "#d92d20", color: "#fff", border: "none" }}
                  disabled={deleting}
                  onClick={() => onDelete(deleteConfirm)}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}