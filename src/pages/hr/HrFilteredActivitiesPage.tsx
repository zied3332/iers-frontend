import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiSearch, FiSlash, FiUsers } from "react-icons/fi";
import {
  listActivities,
  cancelActivityById,
  type ActivityRecord,
  type ListActivitiesQuery,
} from "../../services/activities.service";
import { getAllDepartments, type Department } from "../../services/departments.service";

const META: Record<
  NonNullable<ListActivitiesQuery["hrView"]>,
  { title: string; subtitle: string }
> = {
  drafts: {
    title: "Activity drafts",
    subtitle: "Planned activities still in draft mode.",
  },
  pipeline: {
    title: "Staffing & validation",
    subtitle: "",
  },
  completed: {
    title: "Completed activities",
    subtitle:
      "Activities that ran and passed their end date. Read-only archive for reference.",
  },
};

function formatLabel(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
}

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toMonthIndex(rawDate?: string): number {
  if (!rawDate) return -1;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getMonth();
}

type GroupMode = "department" | "month";
type CreatedSortOrder = "newest" | "oldest";

function toCreationTimestamp(activity: ActivityRecord): number {
  const raw = activity.createdAt || "";
  const parsed = Date.parse(String(raw));
  if (!Number.isNaN(parsed)) return parsed;
  const fallback = Date.parse(String(activity.startDate || ""));
  return Number.isNaN(fallback) ? 0 : fallback;
}

function getDepartmentKey(activity: ActivityRecord): string {
  const raw = activity.departmentId as unknown;
  if (!raw) return "__unassigned__";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const candidate = raw as { _id?: unknown; id?: unknown };
    if (typeof candidate._id === "string") return candidate._id;
    if (typeof candidate.id === "string") return candidate.id;
  }
  return "__unassigned__";
}

function normalizeDepartments(raw: unknown): Department[] {
  if (Array.isArray(raw)) return raw as Department[];
  if (raw && typeof raw === "object") {
    const candidate = raw as { data?: unknown; items?: unknown; departments?: unknown };
    if (Array.isArray(candidate.data)) return candidate.data as Department[];
    if (Array.isArray(candidate.items)) return candidate.items as Department[];
    if (Array.isArray(candidate.departments)) return candidate.departments as Department[];
  }
  return [];
}

type PipelinePhase = "PRIMARY_SENT_TO_MANAGER" | "MANAGER_SENT_TO_HR" | "FINAL_VALIDATED_STARTED";

function resolvePipelinePhase(activity: ActivityRecord): PipelinePhase {
  const workflow = String(activity.workflowStatus || "").toUpperCase();
  const started =
    Boolean(activity.hrFinalLaunchAt) ||
    activity.status === "IN_PROGRESS" ||
    workflow === "IN_PROGRESS";
  if (started) return "FINAL_VALIDATED_STARTED";

  const managerSent =
    Boolean(activity.rosterReadyForHrAt) || workflow === "READY_FOR_HR_FINAL";
  if (managerSent) return "MANAGER_SENT_TO_HR";

  return "PRIMARY_SENT_TO_MANAGER";
}

function HrFilteredActivitiesInner({
  mode,
}: {
  mode: NonNullable<ListActivitiesQuery["hrView"]>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("department");
  const [createdSortOrder, setCreatedSortOrder] = useState<CreatedSortOrder>("newest");
  const sectionGroup = searchParams.get("sectionGroup");
  const sectionKey = searchParams.get("sectionKey");
  const isSectionView = Boolean(
    sectionGroup &&
      sectionKey &&
      (sectionGroup === "department" || sectionGroup === "month")
  );

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
        const [activities, allDepartments] = await Promise.allSettled([
          listActivities({ hrView: mode }),
          getAllDepartments(),
        ]);

        setItems(activities.status === "fulfilled" ? activities.value || [] : []);
        setDepartments(
          allDepartments.status === "fulfilled"
            ? normalizeDepartments(allDepartments.value)
            : []
        );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load activities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [activities, allDepartments] = await Promise.allSettled([
          listActivities({ hrView: mode }),
          getAllDepartments(),
        ]);
        if (cancelled) return;
        setItems(activities.status === "fulfilled" ? activities.value || [] : []);
        setDepartments(
          allDepartments.status === "fulfilled"
            ? normalizeDepartments(allDepartments.value)
            : []
        );
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load activities.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredItems = !q
      ? items
      : items.filter((activity) => {
          const blob = [
            activity.title,
            activity.type,
            activity.status,
            activity.workflowStatus || "",
            activity.departmentName || "",
            activity.location || "",
          ]
            .join(" ")
            .toLowerCase();
          return blob.includes(q);
        });

    const copy = [...filteredItems];
    copy.sort((a, b) => {
      const aTs = toCreationTimestamp(a);
      const bTs = toCreationTimestamp(b);
      return createdSortOrder === "oldest" ? aTs - bTs : bTs - aTs;
    });
    return copy;
  }, [items, search, createdSortOrder]);

  const availableDepartments = useMemo(() => {
    const map = new Map<string, string>();

    for (const d of departments) {
      const id = String(d?._id || "").trim();
      if (!id) continue;
      map.set(id, String(d?.name || "Unnamed Department"));
    }

    for (const activity of sorted) {
      const key = getDepartmentKey(activity);
      if (key === "__unassigned__") continue;
      if (!map.has(key)) {
        map.set(key, String(activity.departmentName || "Unnamed Department"));
      }
    }

    const base = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const hasUnassigned = sorted.some((a) => getDepartmentKey(a) === "__unassigned__");
    if (hasUnassigned) return [...base, ["__unassigned__", "Unassigned Department"] as const];
    return base;
  }, [departments, sorted]);
  const pipelineGroups = useMemo(() => {
    const groups: Record<PipelinePhase, ActivityRecord[]> = {
      PRIMARY_SENT_TO_MANAGER: [],
      MANAGER_SENT_TO_HR: [],
      FINAL_VALIDATED_STARTED: [],
    };
    for (const activity of sorted) {
      groups[resolvePipelinePhase(activity)].push(activity);
    }
    return groups;
  }, [sorted]);

  const page = META[mode];
  const showCancelOnRow = mode === "pipeline";

  const groupedByDepartment = useMemo(() => {
    return availableDepartments.map(([departmentId, departmentName]) => {
      const rows = sorted.filter((a) => getDepartmentKey(a) === departmentId);
      return {
        key: departmentId,
        title: departmentName,
        subtitle: "Activities in this department.",
        rows,
      };
    });
  }, [availableDepartments, sorted]);

  const groupedByMonth = useMemo(() => {
    return MONTH_OPTIONS.map((monthName, monthIdx) => {
      const rows = sorted.filter((a) => toMonthIndex(a.startDate) === monthIdx);
      return {
        key: String(monthIdx),
        title: monthName,
        subtitle: "Activities that start in this month.",
        rows,
      };
    });
  }, [sorted]);

  const cardStyles = {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "16px",
    alignItems: "stretch" as const,
    justifyContent: "space-between" as const,
    padding: "clamp(16px, 1.4vw, 22px)",
    borderRadius: "18px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
  };

  const renderActivityRow = (a: ActivityRecord) => (
    <div key={a._id} style={cardStyles}>
      <button
        type="button"
        onClick={() => navigate(`/hr/activities/${a._id}/staffing`)}
        style={{
          flex: "1 1 620px",
          minWidth: "min(100%, 320px)",
          textAlign: "left",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "var(--text)",
          padding: 0,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "clamp(16px, 1.2vw, 19px)",
            marginBottom: "6px",
            lineHeight: 1.35,
          }}
        >
          {a.title}
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {formatLabel(a.type)} · {formatLabel(a.status)}
          {a.workflowStatus ? ` · ${formatLabel(a.workflowStatus)}` : ""}
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px 18px",
            fontSize: "13px",
            color: "var(--muted)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <FiCalendar size={14} /> {a.startDate} → {a.endDate}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <FiUsers size={14} /> {a.availableSlots} seats
          </span>
        </div>
      </button>

      <div
        style={{
          display: "flex",
          flex: "0 1 auto",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          minWidth: "fit-content",
          marginLeft: "auto",
        }}
      >
        {showCancelOnRow && a.status === "IN_PROGRESS" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCancelConfirmId(a._id);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid color-mix(in srgb, var(--border) 72%, #f59e0b)",
              background: "color-mix(in srgb, var(--surface-2) 86%, #f59e0b)",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <FiSlash size={14} /> Cancel
          </button>
        ) : null}

        <button
          type="button"
          aria-label="Open staffing"
          onClick={() => navigate(`/hr/activities/${a._id}/staffing`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            cursor: "pointer",
            color: "var(--primary, #10b981)",
            flexShrink: 0,
          }}
        >
          <FiArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const openSectionView = (group: GroupMode, key: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sectionGroup", group);
    params.set("sectionKey", key);
    navigate({ search: params.toString() });
  };

  const clearSectionView = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("sectionGroup");
    params.delete("sectionKey");
    navigate({ search: params.toString() });
  };

  const renderSection = (
    sectionKeyValue: string,
    title: string,
    subtitle: string,
    rows: ActivityRecord[],
    accent: string
  ) => {
    const rowsToRender = isSectionView ? rows : rows.slice(0, 3);
    const hasMore = !isSectionView && rows.length > 3;
    return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "18px",
        padding: "16px",
        background: "var(--card)",
      }}
    >
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: accent,
              display: "inline-block",
            }}
          />
          {title} ({rows.length})
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => openSectionView(groupMode, sectionKeyValue)}
            style={{
              marginLeft: "auto",
              height: "34px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            View more
          </button>
        ) : null}
        {isSectionView ? (
          <button
            type="button"
            onClick={clearSectionView}
            style={{
              marginLeft: "auto",
              height: "34px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        ) : null}
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "13px" }}>{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <div
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "1px dashed var(--border)",
            color: "var(--muted)",
            background: "var(--surface-2)",
            fontSize: "13px",
          }}
        >
          There is no activity yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          {rowsToRender.map((a) => renderActivityRow(a))}
        </div>
      )}
    </section>
    );
  };

  const onConfirmCancel = async () => {
    if (!cancelConfirmId) return;
    setCancelling(true);
    setError("");

    try {
      await cancelActivityById(cancelConfirmId);
      setCancelConfirmId(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not cancel activity.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        padding: "clamp(16px, 2vw, 28px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "min(1600px, 100%)",
          margin: "0 auto",
        }}
      >
        <div
          className="page-header"
          style={{
            marginBottom: "65px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <h1 className="page-title" style={{ margin: 0 }}>
            {page.title}
          </h1>
          {page.subtitle ? (
            <p
              className="page-subtitle"
              style={{
                maxWidth: "900px",
                margin: 0,
                marginTop: "4px",
                lineHeight: 1.6,
              }}
            >
              {page.subtitle}
            </p>
          ) : null}
        </div>

        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 340px", maxWidth: "620px" }}>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              style={{
                height: "42px",
                width: "100%",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "0 12px 0 40px",
                fontWeight: 600,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as GroupMode)}
              style={{
                height: "42px",
                minWidth: "240px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "0 12px",
                fontWeight: 700,
              }}
            >
              <option value="department">Filter by department</option>
              <option value="month">Filter by time (months)</option>
            </select>

            <select
              value={createdSortOrder}
              onChange={(e) => setCreatedSortOrder(e.target.value as CreatedSortOrder)}
              style={{
                height: "42px",
                minWidth: "220px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                padding: "0 12px",
                fontWeight: 700,
              }}
            >
              <option value="newest">newest first</option>
              <option value="oldest">oldest first</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: "14px", color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>
          Showing {sorted.length} activity{sorted.length === 1 ? "" : "ies"}
          {search.trim() ? " after search" : ""}
        </div>

        {error ? (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "14px",
              border: "1px solid color-mix(in srgb, var(--border) 66%, #ef4444)",
              background: "color-mix(in srgb, var(--surface-2) 90%, #ef4444)",
              color: "var(--text)",
              fontWeight: 600,
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: "var(--muted)", padding: "40px 0" }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: "56px 24px",
              textAlign: "center",
              color: "var(--muted)",
              border: "1px dashed var(--border)",
              borderRadius: "18px",
              background: "var(--surface-2)",
            }}
          >
            No activities in this list yet.
          </div>
        ) : groupMode === "department" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {(isSectionView && sectionGroup === "department"
              ? groupedByDepartment.filter((s) => s.key === sectionKey)
              : groupedByDepartment
            ).map((section) =>
              renderSection(section.key, section.title, section.subtitle, section.rows, "var(--primary)")
            )}
          </div>
        ) : groupMode === "month" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {(isSectionView && sectionGroup === "month"
              ? groupedByMonth.filter((s) => s.key === sectionKey)
              : groupedByMonth
            ).map((section) =>
              renderSection(section.key, section.title, section.subtitle, section.rows, "var(--primary)")
            )}
          </div>
        ) : mode === "pipeline" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderSection(
              "PRIMARY_SENT_TO_MANAGER",
              "Primary list sent to manager",
              "HR shortlist is sent and waiting on manager-side review/replacements.",
              pipelineGroups.PRIMARY_SENT_TO_MANAGER,
              "#f59e0b"
            )}
            {renderSection(
              "MANAGER_SENT_TO_HR",
              "Manager sent list to HR",
              "Manager confirmed the roster and sent it back. HR can run final validation.",
              pipelineGroups.MANAGER_SENT_TO_HR,
              "#2563eb"
            )}
            {renderSection(
              "FINAL_VALIDATED_STARTED",
              "Final validation done (activity started)",
              "HR final validation already launched the activity.",
              pipelineGroups.FINAL_VALIDATED_STARTED,
              "var(--primary)"
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {sorted.map((a) => renderActivityRow(a))}
          </div>
        )}
      </div>

      {cancelConfirmId ? (
        <div
          onClick={() => !cancelling && setCancelConfirmId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 96vw)",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              borderLeft: "4px solid color-mix(in srgb, var(--primary) 70%, #f59e0b)",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "18px",
                color: "var(--text)",
                marginBottom: "12px",
              }}
            >
              Cancel activity?
            </div>

            <div
              style={{
                color: "var(--muted)",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              This marks the activity as cancelled. Use for in-progress activities
              that should not continue.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setCancelConfirmId(null)}
                disabled={cancelling}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  fontWeight: 700,
                  cursor: cancelling ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => void onConfirmCancel()}
                disabled={cancelling}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--primary-on)",
                  fontWeight: 800,
                  cursor: cancelling ? "not-allowed" : "pointer",
                }}
              >
                {cancelling ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HrStaffingPipelinePage() {
  return <HrFilteredActivitiesInner mode="pipeline" />;
}

export function HrCompletedActivitiesPage() {
  return <HrFilteredActivitiesInner mode="completed" />;
}