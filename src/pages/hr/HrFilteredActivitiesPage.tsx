import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiSlash, FiUsers } from "react-icons/fi";
import {
  listActivities,
  cancelActivityById,
  type ActivityRecord,
  type ListActivitiesQuery,
} from "../../services/activities.service";

const META: Record<
  NonNullable<ListActivitiesQuery["hrView"]>,
  { title: string; subtitle: string }
> = {
  pipeline: {
    title: "Staffing & validation",
    subtitle:
      "Activities where HR used recommendations, finalized the shortlist, and sent it to the manager — through invitations and launch. Open one to continue HR work. Cancel is available for activities that are already in progress.",
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
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listActivities({ hrView: mode });
      setItems(data || []);
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
        const data = await listActivities({ hrView: mode });
        if (!cancelled) setItems(data || []);
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
    const copy = [...items];
    copy.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    return copy;
  }, [items]);
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
              border: "1px solid #fcd34d",
              background: "#fef3c7",
              color: "#92400e",
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

  const renderSection = (
    title: string,
    subtitle: string,
    rows: ActivityRecord[],
    accent: string
  ) => (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "18px",
        padding: "16px",
        background: "var(--card)",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
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
          No activities in this phase.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rows.map((a) => renderActivityRow(a))}
        </div>
      )}
    </section>
  );

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
            marginBottom: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <h1 className="page-title" style={{ margin: 0 }}>
            {page.title}
          </h1>
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
        </div>

        {error ? (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "14px",
              border: "1px solid #fecaca",
              background: "rgba(239,68,68,0.08)",
              color: "#b91c1c",
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
        ) : mode === "pipeline" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {renderSection(
              "Primary list sent to manager",
              "HR shortlist is sent and waiting on manager-side review/replacements.",
              pipelineGroups.PRIMARY_SENT_TO_MANAGER,
              "#f59e0b"
            )}
            {renderSection(
              "Manager sent list to HR",
              "Manager confirmed the roster and sent it back. HR can run final validation.",
              pipelineGroups.MANAGER_SENT_TO_HR,
              "#2563eb"
            )}
            {renderSection(
              "Final validation done (activity started)",
              "HR final validation already launched the activity.",
              pipelineGroups.FINAL_VALIDATED_STARTED,
              "#16a34a"
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
              borderLeft: "4px solid #d97706",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "18px",
                color: "#92400e",
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
                  background: "#92400e",
                  color: "#fff",
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