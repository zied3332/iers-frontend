import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getParticipantsForEvaluation,
  type ActivityParticipantsEval,
  type PostActivityEvaluation,
} from "../../services/post-activity-evaluations.service";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import {
  buildDateRange,
  getMonitorDraftWithServer,
  type MonitorDraft,
  type DailyAttendanceStatus,
} from "../../services/manager-activity-monitor.service";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
};

function badgeStyle(status: DailyAttendanceStatus): React.CSSProperties {
  if (status === "PRESENT") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #166534)",
      background: "color-mix(in srgb, var(--surface) 86%, #22c55e)",
      border: "1px solid color-mix(in srgb, var(--border) 68%, #22c55e)",
    };
  }
  if (status === "LATE") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #92400e)",
      background: "color-mix(in srgb, var(--surface) 86%, #f59e0b)",
      border: "1px solid color-mix(in srgb, var(--border) 68%, #f59e0b)",
    };
  }
  if (status === "EXCUSED") {
    return {
      color: "color-mix(in srgb, var(--text) 84%, #1d4ed8)",
      background: "color-mix(in srgb, var(--surface) 88%, #3b82f6)",
      border: "1px solid color-mix(in srgb, var(--border) 70%, #3b82f6)",
    };
  }
  return {
    color: "color-mix(in srgb, var(--text) 84%, #991b1b)",
    background: "color-mix(in srgb, var(--surface) 88%, #ef4444)",
    border: "1px solid color-mix(in srgb, var(--border) 70%, #ef4444)",
  };
}

function formatDateDisplay(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

export default function PostActivityEvaluationReadOnlyPage() {
  const navigate = useNavigate();
  const { activityId = "" } = useParams();

  const [data, setData] = useState<ActivityParticipantsEval | null>(null);
  const [monitorDraft, setMonitorDraft] = useState<MonitorDraft>({
    attendanceByParticipant: {},
    dayNotes: {},
    finalReport: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [participantsData, monitor] = await Promise.all([
          getParticipantsForEvaluation(activityId),
          getMonitorDraftWithServer(activityId),
        ]);
        if (cancelled) return;
        setData(participantsData);
        setMonitorDraft(monitor);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load evaluation details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const days = useMemo(
    () => buildDateRange(data?.activity?.startDate, data?.activity?.endDate),
    [data?.activity?.startDate, data?.activity?.endDate]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Loading finalized evaluation…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "color-mix(in srgb, var(--text) 78%, #b91c1c)" }}>
            {error || "Evaluation details not found."}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const participants = data.participants || [];
  const evaluatedCount = participants.filter((p) => p.isEvaluated).length;
  const completionPercent = participants.length
    ? Math.round((evaluatedCount / participants.length) * 100)
    : 0;

  const parseLineValue = (feedback: string, prefix: string): string | null => {
    const line = feedback
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!line) return null;
    const idx = line.indexOf(":");
    if (idx < 0) return null;
    return line.slice(idx + 1).trim() || null;
  };

  const assessmentLabel = (
    evaluation: PostActivityEvaluation | null,
    field:
      | "attendanceStatus"
      | "participationLevel"
      | "skillProgress"
      | "outcome"
      | "recommendation"
  ) => {
    const raw = (evaluation as any)?.managerAssessment?.[field];
    if (raw) return String(raw).replaceAll("_", " ");
    if (!evaluation) return "—";

    const feedback = String(evaluation.feedback || "");
    if (field === "attendanceStatus") {
      return evaluation.presence === "ABSENT" ? "POOR" : "GOOD";
    }
    if (field === "participationLevel") {
      return (
        parseLineValue(feedback, "Participation")?.replaceAll("_", " ") || "—"
      );
    }
    if (field === "skillProgress") {
      return (
        parseLineValue(feedback, "Skill progress")?.replaceAll("_", " ") || "—"
      );
    }
    if (field === "outcome") {
      return (
        parseLineValue(feedback, "Outcome")?.replaceAll("_", " ") ||
        (evaluation.presence === "ABSENT"
          ? "DID NOT COMPLETE"
          : "COMPLETED SUCCESSFULLY")
      );
    }
    if (field === "recommendation") {
      return (
        parseLineValue(feedback, "Recommendation")?.replaceAll("_", " ") || "—"
      );
    }
    return "—";
  };

  const assessmentRating = (evaluation: PostActivityEvaluation | null): string => {
    const raw = (evaluation as any)?.managerAssessment?.rating;
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
    if (!evaluation) return "—";
    const scores = Array.isArray(evaluation.skillScores)
      ? evaluation.skillScores.map((s: any) => Number(s?.score || 0)).filter((n) => n > 0)
      : [];
    if (scores.length > 0) {
      return String(Math.max(1, Math.min(5, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))));
    }
    const parsed = parseLineValue(String(evaluation.feedback || ""), "Manager rating");
    return parsed ? parsed.replace("/5", "").trim() : "—";
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: 18 }}>
          <button type="button" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontWeight: 700, padding: 0 }} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{data.activity?.title || "Activity"}</h1>
          <p className="page-subtitle">Finalized post-activity evaluation (read-only)</p>
        </div>

        <div
          style={{
            ...card,
            marginBottom: 14,
            background: "color-mix(in srgb, var(--surface) 90%, var(--sidebar-link-active-pill))",
            border: "1px solid color-mix(in srgb, var(--border) 68%, var(--sidebar-link-active-pill))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Activity details</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge">{String(data.activity?.type || "—").replaceAll("_", " ")}</span>
              <span className="badge">Status: {String(data.activity?.status || "—").replaceAll("_", " ")}</span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
              fontSize: 13,
            }}
          >
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>Start date</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiCalendar size={14} /> {formatDateDisplay(data.activity?.startDate)}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>End date</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiCalendar size={14} /> {formatDateDisplay(data.activity?.endDate)}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>Duration</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiClock size={14} /> {data.activity?.duration || "—"}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>Location</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiMapPin size={14} /> {data.activity?.location || "—"}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>Available seats</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiUsers size={14} /> {data.activity?.seats ?? "—"}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--card)" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12 }}>Finalized at</div>
              <div style={{ marginTop: 4, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FiCheckCircle size={14} /> {formatDateDisplay(data.activity?.managerEvaluationFinalizedAt)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 700 }}>Overall progress</span>
            <span style={{ fontWeight: 800 }}>{evaluatedCount}/{participants.length} ({completionPercent}%)</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${completionPercent}%`,
                background: "color-mix(in srgb, var(--text) 35%, #22c55e)",
              }}
            />
          </div>
        </div>

        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Attendance history</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>Employee</th>
                  {days.map((day, idx) => (
                    <th key={day} style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12 }}>
                      D{idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const empId = String(p.employee._id);
                  const name = p.employee.user_id?.name || "Unknown";
                  return (
                    <tr key={empId}>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", fontWeight: 800 }}>{name}</td>
                      {days.map((day) => {
                        const status = (monitorDraft.attendanceByParticipant?.[empId]?.[day] || "ABSENT") as DailyAttendanceStatus;
                        return (
                          <td key={day} style={{ padding: "10px", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ ...badgeStyle(status), borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 12 }}>
                              {status}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          {participants.map((p) => {
            const evalItem = p.evaluation;
            return (
              <div key={String(p.employee._id)} style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900 }}>
                    {p.employee.user_id?.name || "Unknown"}
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: p.isEvaluated
                        ? "color-mix(in srgb, var(--surface) 86%, #22c55e)"
                        : "color-mix(in srgb, var(--surface) 86%, #f59e0b)",
                    }}
                  >
                    {p.isEvaluated ? "Evaluated" : "Pending"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, fontSize: 13 }}>
                  <div><strong>Attendance:</strong> {assessmentLabel(evalItem, "attendanceStatus")}</div>
                  <div><strong>Participation:</strong> {assessmentLabel(evalItem, "participationLevel")}</div>
                  <div><strong>Skill progress:</strong> {assessmentLabel(evalItem, "skillProgress")}</div>
                  <div><strong>Outcome:</strong> {assessmentLabel(evalItem, "outcome")}</div>
                  <div><strong>Recommendation:</strong> {assessmentLabel(evalItem, "recommendation")}</div>
                  <div><strong>Rating:</strong> {assessmentRating(evalItem)}</div>
                </div>
                <div style={{ marginTop: 8, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                  {(evalItem as any)?.managerAssessment?.comment || evalItem?.feedback || "No comment"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...card }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Final report to HR</div>
          <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>
            {monitorDraft.finalReport || "No final report provided."}
          </div>
        </div>
      </div>
    </div>
  );
}
