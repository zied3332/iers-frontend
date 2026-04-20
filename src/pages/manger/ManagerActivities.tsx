import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listActivities,
  type ActivityRecord,
} from "../../services/activities.service";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 12px",
  borderRadius: 999,
  background: bg,
  color,
  fontWeight: 900,
  fontSize: 13,
});

const contextColors: Record<string, [string, string]> = {
  UPSKILLING: ["color-mix(in srgb, var(--surface-2) 78%, #bae6fd)", "color-mix(in srgb, var(--text) 84%, #0369a1)"],
  EXPERTISE: ["color-mix(in srgb, var(--surface-2) 78%, #fde68a)", "color-mix(in srgb, var(--text) 84%, #b45309)"],
  DEVELOPMENT: ["color-mix(in srgb, var(--surface-2) 78%, #ddd6fe)", "color-mix(in srgb, var(--text) 84%, #6d28d9)"],
};

type ManagerActivityPhase =
  | "RECEIVED_FROM_HR"
  | "INVITATIONS_ONGOING"
  | "SENT_TO_HR";

function resolveManagerActivityPhase(activity: ActivityRecord): ManagerActivityPhase | null {
  const workflow = String(activity.workflowStatus || "").toUpperCase();
  const status = String(activity.status || "").toUpperCase();

  // Running/past must move to dedicated pages.
  if (
    Boolean(activity.hrFinalLaunchAt) ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    workflow === "IN_PROGRESS" ||
    workflow === "COMPLETED"
  ) {
    return null;
  }

  const sentToHr =
    Boolean(activity.rosterReadyForHrAt) || workflow === "READY_FOR_HR_FINAL";
  if (sentToHr) return "SENT_TO_HR";

  if (
    workflow === "MANAGER_APPROVED" ||
    workflow === "EMPLOYEE_INVITATIONS_SENT"
  ) {
    return "INVITATIONS_ONGOING";
  }

  return "RECEIVED_FROM_HR";
}

export default function ManagerActivities() {
  const ITEMS_PER_PAGE = 6;
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [phasePages, setPhasePages] = useState<Record<ManagerActivityPhase, number>>({
    RECEIVED_FROM_HR: 1,
    INVITATIONS_ONGOING: 1,
    SENT_TO_HR: 1,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listActivities();
        setActivities(data || []);
      } catch (e) {
        console.error("Failed to load activities:", e);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const openActivityReview = (activity: ActivityRecord) => {
    navigate(`/manager/activities/${activity._id}/review`);
  };

  const groupedByPhase = useMemo(() => {
    const groups: Record<ManagerActivityPhase, ActivityRecord[]> = {
      RECEIVED_FROM_HR: [],
      INVITATIONS_ONGOING: [],
      SENT_TO_HR: [],
    };
    const sorted = [...activities].sort((a, b) =>
      String(b.startDate).localeCompare(String(a.startDate))
    );
    for (const activity of sorted) {
      const phase = resolveManagerActivityPhase(activity);
      if (phase) groups[phase].push(activity);
    }
    return groups;
  }, [activities]);

  useEffect(() => {
    setPhasePages({
      RECEIVED_FROM_HR: 1,
      INVITATIONS_ONGOING: 1,
      SENT_TO_HR: 1,
    });
  }, [activities.length]);
  const activePageCount =
    groupedByPhase.RECEIVED_FROM_HR.length +
    groupedByPhase.INVITATIONS_ONGOING.length +
    groupedByPhase.SENT_TO_HR.length;

  const renderActivityCard = (activity: ActivityRecord) => (
    <div
      key={activity._id}
      onClick={() => openActivityReview(activity)}
      style={{
        ...card,
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 16,
        alignItems: "start",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#3b82f6";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(59, 130, 246, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.08)";
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: "var(--text)", lineHeight: 1.25 }}>
            {activity.title}
          </div>
          <span style={badge(...contextColors[activity.priorityContext])}>
            {activity.priorityContext}
          </span>
        </div>

        <div style={{ color: "var(--muted)", fontSize: 15, marginBottom: 14, lineHeight: 1.65 }}>
          <div>
            {(activity.description || "").length > 100
              ? `${(activity.description || "").slice(0, 100)}…`
              : activity.description || "—"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>TYPE</div>
            <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>{activity.type}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>DURATION</div>
            <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>{activity.duration}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>START DATE</div>
            <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>
              {new Date(activity.startDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>
              SEATS LEFT
            </div>
            <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>{activity.availableSlots}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPhaseSection = (
    phase: ManagerActivityPhase,
    title: string,
    subtitle: string,
    rows: ActivityRecord[],
    accent: string
  ) => {
    const currentPage = phasePages[phase] || 1;
    const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    const pageRows = rows.slice(start, start + ITEMS_PER_PAGE);
    const startItem = rows.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(safePage * ITEMS_PER_PAGE, rows.length);

    return (
      <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 16,
        background: "var(--card)",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: accent,
              display: "inline-block",
            }}
          />
          {title} ({rows.length})
        </div>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <div
          style={{
            padding: "14px",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--muted)",
            background: "var(--surface-2)",
            fontSize: 13,
          }}
        >
          No activities in this phase.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 16 }}>
            {pageRows.map((activity) => renderActivityCard(activity))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
              Showing {startItem} to {endItem} of {rows.length}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={safePage === 1}
                onClick={() =>
                  setPhasePages((prev) => ({ ...prev, [phase]: Math.max(1, safePage - 1) }))
                }
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={`${phase}-${page}`}
                  type="button"
                  className={page === safePage ? "btn btn-primary btn-small" : "btn btn-ghost btn-small"}
                  onClick={() => setPhasePages((prev) => ({ ...prev, [phase]: page }))}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={safePage === totalPages}
                onClick={() =>
                  setPhasePages((prev) => ({ ...prev, [phase]: Math.min(totalPages, safePage + 1) }))
                }
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 40 }}>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title">My activities</h1>
            <p className="page-subtitle" style={{ maxWidth: 720 }}>
              Activities move page-to-page by phase. This page shows only manager workflow phases
              before HR final launch.
            </p>
          </div>
        </div>

        {activePageCount === 0 ? (
          <div style={{ ...card, textAlign: "center", color: "var(--muted)", padding: 40 }}>
            <p>
              No activities in this workflow page. Check <strong>In progress</strong> for launched
              activities and <strong>Past activities</strong> for finished ones.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {renderPhaseSection(
              "RECEIVED_FROM_HR",
              "Primary list received from HR",
              "Review and decide on the HR shortlist.",
              groupedByPhase.RECEIVED_FROM_HR,
              "#f59e0b"
            )}
            {renderPhaseSection(
              "INVITATIONS_ONGOING",
              "Invitations in progress",
              "Employees are being invited/replaced based on your selected roster.",
              groupedByPhase.INVITATIONS_ONGOING,
              "#2563eb"
            )}
            {renderPhaseSection(
              "SENT_TO_HR",
              "List sent to HR",
              "You sent the roster to HR and final validation is pending.",
              groupedByPhase.SENT_TO_HR,
              "#7c3aed"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
