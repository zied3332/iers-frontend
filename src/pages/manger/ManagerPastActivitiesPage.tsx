import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCompletedActivitiesForEvaluation,
  type ActivityEvalProgress,
} from "../../services/post-activity-evaluations.service";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  cursor: "pointer",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

const badge = (done: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  background: done
    ? "color-mix(in srgb, var(--surface-2) 70%, #bbf7d0)"
    : "color-mix(in srgb, var(--surface-2) 70%, #fde68a)",
  color: done
    ? "color-mix(in srgb, var(--text) 80%, #16a34a)"
    : "color-mix(in srgb, var(--text) 80%, #b45309)",
});

const typeColors: Record<string, string> = {
  TRAINING: "#3b82f6",
  CERTIFICATION: "#8b5cf6",
  PROJECT: "#f59e0b",
  MISSION: "#10b981",
  AUDIT: "#ef4444",
};

export default function ManagerPastActivitiesEvalPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityEvalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  useEffect(() => {
    getCompletedActivitiesForEvaluation()
      .then((data) => setActivities(data || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activities.filter((a) => {
    if (filter === "pending") return !a.isFullyReviewed;
    if (filter === "done") return a.isFullyReviewed;
    return true;
  });

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Loading past activities…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header" style={{ marginBottom: 28 }}>
          <div>
            <h1 className="page-title">Post-Activity Evaluations</h1>
            <p className="page-subtitle" style={{ maxWidth: 640 }}>
              Review and evaluate employees who participated in completed activities.
              Evaluations update their skill levels automatically.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Total Activities", value: activities.length, color: "#3b82f6" },
            {
              label: "Pending Reviews",
              value: activities.filter((a) => !a.isFullyReviewed).length,
              color: "#f59e0b",
            },
            {
              label: "Fully Reviewed",
              value: activities.filter((a) => a.isFullyReviewed).length,
              color: "#22c55e",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                ...card,
                cursor: "default",
                padding: 18,
                borderLeft: `4px solid ${stat.color}`,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 18px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: filter === f ? "var(--text)" : "var(--surface)",
                color: filter === f ? "var(--surface)" : "var(--text)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f === "all" ? "All" : f === "pending" ? "⏳ Pending" : "✅ Completed"}
            </button>
          ))}
        </div>

        {/* Activity list */}
        {filtered.length === 0 ? (
          <div
            style={{
              ...card,
              textAlign: "center",
              color: "var(--muted)",
              padding: 48,
              cursor: "default",
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 700 }}>No activities found</p>
            <p style={{ fontSize: 14, marginTop: 6 }}>
              {filter === "pending"
                ? "All activities have been fully evaluated 🎉"
                : "No completed activities yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map((item) => {
              const pct =
                item.totalParticipants > 0
                  ? Math.round((item.reviewedCount / item.totalParticipants) * 100)
                  : 0;
              const typeColor = typeColors[item.activity.type] || "#6b7280";

              return (
                <div
                  key={item.activity._id}
                  style={card}
                  onClick={() =>
                    navigate(`/manager/activities/${item.activity._id}/evaluate`)
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow =
                      "0 10px 30px rgba(59, 130, 246, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 24px rgba(15, 23, 42, 0.08)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Title + type badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: typeColor,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{ fontWeight: 900, fontSize: 18, color: "var(--text)" }}
                        >
                          {item.activity.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                            color: typeColor,
                          }}
                        >
                          {item.activity.type}
                        </span>
                      </div>

                      {/* Dates */}
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                        {new Date(item.activity.startDate).toLocaleDateString()} →{" "}
                        {new Date(item.activity.endDate).toLocaleDateString()}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}
                          >
                            EVALUATION PROGRESS
                          </span>
                          <span
                            style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}
                          >
                            {item.reviewedCount} / {item.totalParticipants}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "var(--border)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: 999,
                              background: pct === 100 ? "#22c55e" : "#3b82f6",
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div style={{ flexShrink: 0, paddingTop: 4 }}>
                      <span style={badge(item.isFullyReviewed)}>
                        {item.isFullyReviewed ? "✓ Done" : `${item.pendingCount} pending`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}