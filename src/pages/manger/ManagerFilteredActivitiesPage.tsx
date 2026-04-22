import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiSearch, FiUsers } from "react-icons/fi";
import {
  listActivities,
  type ActivityRecord,
  type ListActivitiesQuery,
} from "../../services/activities.service";
import { getFinalizedActivitiesForEvaluation } from "../../services/post-activity-evaluations.service";

const META: Record<
  NonNullable<ListActivitiesQuery["managerView"]>,
  { title: string; subtitle: string }
> = {
  running: {
    title: "Activities in progress",
    subtitle:
      "Launched by HR after final validation. Ongoing until the end date; open to follow staffing and the team view.",
  },
  past: {
    title: "Past activities",
    subtitle:
      "Completed activities waiting for final evaluation submission. Once finalized, they move to Evaluated activities.",
  },
};

function formatLabel(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
}

function ManagerFilteredActivitiesInner({
  mode,
}: {
  mode: NonNullable<ListActivitiesQuery["managerView"]>;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [finalizedActivityIds, setFinalizedActivityIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ActivityRecord["type"]>(
    "all"
  );
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await listActivities({ managerView: mode });
        let finalized = new Set<string>();
        if (mode === "past") {
          try {
            const finalizedRows = await getFinalizedActivitiesForEvaluation();
            finalized = new Set(
              (finalizedRows || []).map((row) => String(row.activity?._id || ""))
            );
          } catch {
            finalized = new Set();
          }
        }
        if (!cancelled) {
          setItems(data || []);
          setFinalizedActivityIds(finalized);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load activities."
          );
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

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (mode === "past" && finalizedActivityIds.has(String(a._id))) return false;

      if (!q) return true;
      const haystack = [
        a.title,
        a.type,
        a.status,
        a.workflowStatus || "",
        a.startDate,
        a.endDate,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, search, mode, typeFilter, finalizedActivityIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mode, items.length, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ITEMS_PER_PAGE));

  const paginated = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSorted, currentPage, totalPages]);

  const safePage = Math.min(currentPage, totalPages);
  const startItem =
    filteredSorted.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredSorted.length);

  const page = META[mode];

  function handleOpenActivity(activityId: string) {
    if (mode === "running") {
      navigate(`/manager/activities/${activityId}/monitor`);
      return;
    }

    navigate(`/manager/activities/${activityId}/evaluate`);
  }

  function renderActivityCard(a: ActivityRecord) {
    return (
      <button
        key={a._id}
        type="button"
        onClick={() => handleOpenActivity(a._id)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "16px",
          alignItems: "center",
          textAlign: "left",
          padding: "18px 20px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "var(--card)",
          cursor: "pointer",
          boxShadow: "var(--shadow)",
          color: "var(--text)",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "17px",
              marginBottom: "6px",
            }}
          >
            {a.title}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            {formatLabel(a.type)} · {formatLabel(a.status)}
            {a.workflowStatus
              ? ` · ${formatLabel(a.workflowStatus)}`
              : ""}
          </div>

          <div
            style={{
              marginTop: "10px",
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FiCalendar size={14} /> {a.startDate} → {a.endDate}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FiUsers size={14} /> {a.availableSlots} seats
            </span>
          </div>
        </div>

        <FiArrowRight
          size={22}
          style={{
            color: "var(--sidebar-link-active-pill)",
            flexShrink: 0,
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div className="page-header" style={{ marginBottom: "20px" }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {page.title}
          </h1>
          <p
            className="page-subtitle"
            style={{ maxWidth: "720px", marginTop: "8px" }}
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
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "10px 12px",
              background: "var(--card)",
            }}
          >
            <FiSearch size={16} style={{ color: "var(--muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, type, status, or date..."
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text)",
              }}
            />
          </label>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value as "all" | ActivityRecord["type"]
              )
            }
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "10px 12px",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 600,
            }}
          >
            <option value="all">All activity types</option>
            <option value="TRAINING">Training</option>
            <option value="CERTIFICATION">Certification</option>
            <option value="PROJECT">Project</option>
            <option value="MISSION">Mission</option>
            <option value="AUDIT">Audit</option>
          </select>
        </div>

        {mode === "past" ? (
          <div
            style={{
              borderRadius: "10px",
              padding: "8px 12px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              marginBottom: "14px",
              color: "var(--muted)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Past activities list only includes completed activities not finalized yet.
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: "var(--muted)", padding: "40px 0" }}>
            Loading…
          </div>
        ) : filteredSorted.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--muted)",
              border: "1px dashed var(--border)",
              borderRadius: "16px",
              background: "var(--surface-2)",
            }}
          >
            No activities in this list.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {paginated.map((a) => renderActivityCard(a))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Showing {startItem} to {endItem} of {filteredSorted.length}
              </span>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        pageNumber === currentPage
                          ? "btn btn-primary btn-small"
                          : "btn btn-ghost btn-small"
                      }
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ManagerRunningActivitiesPage() {
  return <ManagerFilteredActivitiesInner mode="running" />;
}

export function ManagerPastActivitiesPage() {
  return <ManagerFilteredActivitiesInner mode="past" />;
}