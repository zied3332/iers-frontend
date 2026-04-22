import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  finalizeActivityEvaluations,
  getParticipantsForEvaluation,
  submitEvaluation,
  type AttendanceStatus,
  type EvaluationOutcome,
  type ParticipantEvalStatus,
  type ParticipationLevel,
  type ActivityParticipantsEval,
  type CreateEvaluationPayload,
  type Recommendation,
  type SkillProgress,
} from "../../services/post-activity-evaluations.service";
import {
  buildDateRange,
  getMonitorDraftWithServer,
  saveMonitorDraftWithServer,
  type MonitorDraft,
  type DailyAttendanceStatus,
} from "../../services/manager-activity-monitor.service";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
};

const avatarStyle = (size = 40): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: "50%",
  background: "var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: size * 0.38,
  color: "var(--muted)",
  flexShrink: 0,
  overflow: "hidden",
});

interface EvalDraft {
  attendanceStatus: AttendanceStatus;
  participationLevel: ParticipationLevel;
  skillProgress: SkillProgress;
  outcome: EvaluationOutcome;
  recommendation: Recommendation;
  rating: number;
  comment: string;
  submitted: boolean;
  submitting: boolean;
}

const EVAL_DRAFT_STORAGE_KEY = "manager_eval_card_v1";

function toStatusLabel(v: DailyAttendanceStatus) {
  if (v === "PRESENT") return "Present";
  if (v === "LATE") return "Late";
  if (v === "EXCUSED") return "Excused";
  return "Absent";
}

function getAttendanceBadgeStyle(value: DailyAttendanceStatus): React.CSSProperties {
  if (value === "PRESENT") {
    return { color: "#166534", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)" };
  }
  if (value === "LATE") {
    return { color: "#92400e", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)" };
  }
  if (value === "EXCUSED") {
    return { color: "#1d4ed8", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.22)" };
  }
  return { color: "#991b1b", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.24)" };
}

function buildFinalReportText(params: {
  activityTitle: string;
  totalParticipants: number;
  reviewedCount: number;
  pendingCount: number;
  attendanceTrackedDays: number;
  attendanceSummary: Record<DailyAttendanceStatus, number>;
}) {
  return [
    `Activity: ${params.activityTitle}`,
    `Participants: ${params.totalParticipants}`,
    `Evaluations submitted: ${params.reviewedCount}`,
    `Pending evaluations: ${params.pendingCount}`,
    `Tracked attendance days: ${params.attendanceTrackedDays}`,
    "",
    "Attendance totals:",
    `- Present: ${params.attendanceSummary.PRESENT}`,
    `- Late: ${params.attendanceSummary.LATE}`,
    `- Excused: ${params.attendanceSummary.EXCUSED}`,
    `- Absent: ${params.attendanceSummary.ABSENT}`,
    "",
    "Manager conclusion:",
    "",
  ].join("\n");
}

export default function ManagerEvaluateActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ActivityParticipantsEval | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, EvalDraft>>({});
  const [activeEmployee, setActiveEmployee] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [monitorDraft, setMonitorDraft] = useState<MonitorDraft>({
    attendanceByParticipant: {},
    dayNotes: {},
    finalReport: "",
  });

  useEffect(() => {
    if (!activityId) return;
    getParticipantsForEvaluation(activityId)
      .then(async (res) => {
        setData(res);
        setPageError("");
        const savedRaw =
          activityId && typeof window !== "undefined"
            ? window.localStorage.getItem(`${EVAL_DRAFT_STORAGE_KEY}:${activityId}`)
            : null;
        const savedDrafts = savedRaw
          ? (JSON.parse(savedRaw) as Record<string, Partial<EvalDraft>>)
          : {};

        const initial: Record<string, EvalDraft> = {};
        for (const p of res.participants) {
          const empId = String(p.employee._id);
          if (p.isEvaluated && p.evaluation) {
            const scores: Record<string, number> = {};
            for (const s of p.evaluation.skillScores || []) {
              const skillId = s.skillId?._id || s.skillId;
              scores[String(skillId)] = s.score;
            }
            const assessment = p.evaluation.managerAssessment;
            const baseRating = (() => {
                const values = Object.values(scores);
                if (values.length === 0) return 3;
                return Math.max(
                  1,
                  Math.min(
                    5,
                    Math.round(values.reduce((acc, v) => acc + v, 0) / values.length)
                  )
                );
              })();
            initial[empId] = {
              attendanceStatus:
                assessment?.attendanceStatus ||
                (p.evaluation.presence === "ABSENT" ? "POOR" : "GOOD"),
              participationLevel: assessment?.participationLevel || "ACTIVE",
              skillProgress: assessment?.skillProgress || "MODERATE",
              outcome:
                assessment?.outcome ||
                (p.evaluation.presence === "ABSENT"
                  ? "DID_NOT_COMPLETE"
                  : "COMPLETED_SUCCESSFULLY"),
              recommendation: assessment?.recommendation || "ADVANCED_TRAINING",
              rating: assessment?.rating || baseRating,
              comment:
                assessment?.comment || p.evaluation.feedback || "",
              submitted: true,
              submitting: false,
            };
          } else {
            const saved = savedDrafts[empId] || {};
            initial[empId] = {
              attendanceStatus: (saved.attendanceStatus as AttendanceStatus) || "GOOD",
              participationLevel:
                (saved.participationLevel as ParticipationLevel) || "ACTIVE",
              skillProgress: (saved.skillProgress as SkillProgress) || "MODERATE",
              outcome:
                (saved.outcome as EvaluationOutcome) || "COMPLETED_SUCCESSFULLY",
              recommendation:
                (saved.recommendation as Recommendation) || "ADVANCED_TRAINING",
              rating: Number(saved.rating || 3),
              comment: String(saved.comment || ""),
              submitted: false,
              submitting: false,
            };
          }
        }

        setDrafts(initial);
        const firstPending = res.participants.find((p) => !p.isEvaluated);
        if (firstPending) setActiveEmployee(String(firstPending.employee._id));
        else if (res.participants.length > 0) setActiveEmployee(String(res.participants[0].employee._id));

        const monitor = await getMonitorDraftWithServer(activityId);
        setMonitorDraft(monitor);
        if (monitor.finalReport?.trim()) {
          setReportText(monitor.finalReport);
        } else {
          setReportText(
            buildFinalReportText({
              activityTitle: res.activity?.title || "Activity",
              totalParticipants: res.participants.length,
              reviewedCount: res.participants.filter((p) => p.isEvaluated).length,
              pendingCount: res.participants.filter((p) => !p.isEvaluated).length,
              attendanceTrackedDays: 0,
              attendanceSummary: {
                PRESENT: 0,
                LATE: 0,
                EXCUSED: 0,
                ABSENT: 0,
              },
            })
          );
        }
      })
      .catch((e: unknown) => {
        setPageError(e instanceof Error ? e.message : "Activity not found or not accessible.");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [activityId]);

  const participants = data?.participants || [];
  const activity = data?.activity;
  const role = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? String(JSON.parse(raw)?.role || "") : "";
    } catch {
      return "";
    }
  })();
  const isManager = role === "MANAGER";
  const isFinalized = Boolean(activity?.managerEvaluationFinalizedAt);
  const isReadOnly = !isManager || isFinalized;

  const totalReviewed = participants.filter((p) => drafts[String(p.employee._id)]?.submitted).length;
  const totalCount = participants.length;
  const pct = totalCount > 0 ? Math.round((totalReviewed / totalCount) * 100) : 0;

  const activitySkills: Array<{ _id: string; name: string; category: string }> =
    activity?.skills || [];

  const attendanceSnapshot = useMemo(() => {
    if (!activityId || !activity) {
      return {
        days: [] as string[],
        totals: { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0 } as Record<DailyAttendanceStatus, number>,
      };
    }
    const days = buildDateRange(activity.startDate, activity.endDate);
    const totals: Record<DailyAttendanceStatus, number> = {
      PRESENT: 0,
      LATE: 0,
      EXCUSED: 0,
      ABSENT: 0,
    };

    participants.forEach((p) => {
      const id = String(p.employee._id);
      days.forEach((day) => {
        const status = monitorDraft.attendanceByParticipant?.[id]?.[day] || "ABSENT";
        totals[status] += 1;
      });
    });

    return { days, totals };
  }, [activityId, activity, participants, monitorDraft.attendanceByParticipant]);

  useEffect(() => {
    if (!activity || !activityId) return;
    if (reportText.trim()) return;
    setReportText(
      buildFinalReportText({
        activityTitle: activity.title || "Activity",
        totalParticipants: totalCount,
        reviewedCount: totalReviewed,
        pendingCount: totalCount - totalReviewed,
        attendanceTrackedDays: attendanceSnapshot.days.length,
        attendanceSummary: attendanceSnapshot.totals,
      })
    );
  }, [activity, activityId, totalCount, totalReviewed, attendanceSnapshot, reportText]);

  const updateDraft = (empId: string, patch: Partial<EvalDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], ...patch },
    }));
  };

  useEffect(() => {
    if (!activityId || typeof window === "undefined") return;
    const persistable: Record<string, Partial<EvalDraft>> = {};
    Object.entries(drafts).forEach(([employeeId, d]) => {
      if (!d.submitted) {
        persistable[employeeId] = {
          attendanceStatus: d.attendanceStatus,
          participationLevel: d.participationLevel,
          skillProgress: d.skillProgress,
          outcome: d.outcome,
          recommendation: d.recommendation,
          rating: d.rating,
          comment: d.comment,
        };
      }
    });
    window.localStorage.setItem(
      `${EVAL_DRAFT_STORAGE_KEY}:${activityId}`,
      JSON.stringify(persistable)
    );
  }, [activityId, drafts]);

  const handleSubmit = async (participant: ParticipantEvalStatus) => {
    if (isReadOnly) return;
    if (!activityId) return;
    const empId = String(participant.employee._id);
    const draft = drafts[empId];
    if (!draft || draft.submitting || draft.submitted) return;

    setPageError("");
    updateDraft(empId, { submitting: true });

    const isAbsent =
      draft.attendanceStatus === "POOR" || draft.outcome === "DID_NOT_COMPLETE";
    const presence = isAbsent ? "ABSENT" : "PRESENT";
    const normalizedRating = Math.max(1, Math.min(5, Math.round(draft.rating || 3)));
    const feedbackParts = [
      draft.comment.trim(),
      `Attendance: ${draft.attendanceStatus}`,
      `Participation: ${draft.participationLevel}`,
      `Skill progress: ${draft.skillProgress}`,
      `Outcome: ${draft.outcome}`,
      `Recommendation: ${draft.recommendation}`,
      `Manager rating: ${normalizedRating}/5`,
    ].filter(Boolean);
    const feedback = feedbackParts.join("\n").slice(0, 2000);

    const payload: CreateEvaluationPayload = {
      activityId,
      employeeId: empId,
      presence,
      feedback,
      skillScores:
        presence === "PRESENT"
          ? activitySkills.map((skill) => ({
              skillId: skill._id,
              score: normalizedRating,
            }))
          : [],
      managerAssessment: {
        attendanceStatus: draft.attendanceStatus,
        participationLevel: draft.participationLevel,
        skillProgress: draft.skillProgress,
        outcome: draft.outcome,
        recommendation: draft.recommendation,
        rating: normalizedRating,
        comment: draft.comment || "",
      },
    };

    try {
      await submitEvaluation(payload);
      setDrafts((prev) => {
        const next = {
          ...prev,
          [empId]: { ...prev[empId], submitted: true, submitting: false },
        };
        const nextPending = participants.find(
          (p) => !next[String(p.employee._id)]?.submitted
        );
        if (nextPending) setActiveEmployee(String(nextPending.employee._id));
        return next;
      });
    } catch (e: unknown) {
      updateDraft(empId, { submitting: false });
      setPageError(e instanceof Error ? e.message : "Failed to submit evaluation.");
    }
  };

  function saveFinalReportDraft() {
    if (!activityId || isReadOnly) return;
    setMonitorDraft((prev) => ({ ...prev, finalReport: reportText }));
    void saveMonitorDraftWithServer(activityId, { finalReport: reportText });
    setReportMessage("Report draft saved.");
    window.setTimeout(() => setReportMessage(""), 1800);
  }

  function sendFinalReport() {
    if (!activityId || isReadOnly) return;
    setMonitorDraft((prev) => ({ ...prev, finalReport: reportText }));
    void saveMonitorDraftWithServer(activityId, { finalReport: reportText });
    finalizeActivityEvaluations(activityId)
      .then((res) => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                activity: res?.activity || prev.activity,
              }
            : prev
        );
        setReportMessage(
          res?.message || "Evaluations finalized and sent to HR/super manager."
        );
      })
      .catch((e: unknown) => {
        setPageError(
          e instanceof Error
            ? e.message
            : "Failed to finalize evaluations."
        );
      });
  }

  function exportFinalReport() {
    const title = (activity?.title || "activity").replace(/[^\w\s-]/g, "").trim() || "activity";
    const fileName = `${title.replace(/\s+/g, "_")}_final_report.txt`;
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--muted)" }}>Loading participants…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "#b91c1c" }}>{pageError || "Activity not found or not accessible."}</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, cursor: "pointer" }}>
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 12,
              padding: 0,
            }}
          >
            ← Back to activities
          </button>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {activity?.title}
          </h1>
          <p className="page-subtitle">
            Evaluate participants and prepare final report for HR.
          </p>
          {isFinalized ? (
            <div style={{ marginTop: 8 }}>
              <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#166534", border: "1px solid rgba(34,197,94,0.28)" }}>
                Finalized • read-only
              </span>
            </div>
          ) : null}
        </div>

        {pageError ? (
          <div style={{ ...card, borderColor: "#fecaca", color: "#b91c1c", marginBottom: 18 }}>
            {pageError}
          </div>
        ) : null}

        <div style={{ ...card, marginBottom: 24, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              Overall Progress
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
              {totalReviewed} / {participants.length} evaluated
            </span>
          </div>
          <div
            style={{
              height: 8,
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

        <div style={{ ...card, marginBottom: 16, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Attendance history</div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              Review all tracked days before finalizing evaluations.
            </div>
          </div>
          {attendanceSnapshot.days.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>
              No attendance days found yet for this activity.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 980, borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      Employee
                    </th>
                    {attendanceSnapshot.days.map((day, idx) => (
                      <th
                        key={day}
                        style={{ textAlign: "left", padding: "12px 10px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
                      >
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
                        <td style={{ padding: "12px 10px", borderBottom: "1px solid #eef2f7", fontWeight: 800 }}>
                          {name}
                        </td>
                        {attendanceSnapshot.days.map((day) => {
                          const status =
                            monitorDraft.attendanceByParticipant?.[empId]?.[day] || "ABSENT";
                          return (
                            <td key={day} style={{ padding: "12px 10px", borderBottom: "1px solid #eef2f7" }}>
                              <span
                                style={{
                                  ...getAttendanceBadgeStyle(status),
                                  borderRadius: 999,
                                  padding: "4px 10px",
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}
                              >
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
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {participants.map((p) => {
              const empId = String(p.employee._id);
              const draft = drafts[empId];
              const isSelected = activeEmployee === empId;
              const isDone = draft?.submitted;
              const userName = p.employee.user_id?.name || "Unknown";
              const userAvatar = p.employee.user_id?.avatarUrl;
              const userEmail = p.employee.user_id?.email || "";

              return (
                <div
                  key={empId}
                  onClick={() => setActiveEmployee(empId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "var(--border)"}`,
                    background: isSelected
                      ? "color-mix(in srgb, #3b82f6 8%, var(--surface))"
                      : "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <div style={avatarStyle(34)}>
                    {userAvatar ? (
                      <img src={userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      userName[0]?.toUpperCase() || "?"
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userName}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{userEmail}</div>
                  </div>

                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isDone ? "#22c55e" : "#f59e0b",
                      flexShrink: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div>
            {activeEmployee && drafts[activeEmployee] ? (
              <EvaluationForm
                participant={participants.find((p) => String(p.employee._id) === activeEmployee)!}
                draft={drafts[activeEmployee]}
                readOnly={isReadOnly}
                onChange={(patch) => updateDraft(activeEmployee, patch)}
                onSubmit={() =>
                  handleSubmit(participants.find((p) => String(p.employee._id) === activeEmployee)!)
                }
              />
            ) : (
              <div style={{ ...card, textAlign: "center", color: "var(--muted)", padding: 48 }}>
                Select an employee to evaluate
              </div>
            )}
          </div>

        </div>

        <div style={{ ...card, display: "grid", gap: 14, alignContent: "start", marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Final report to HR</div>
            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
              Keep this summary up-to-date while you evaluate participants.
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface-2)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick summary</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              <div>Total participants: {totalCount}</div>
              <div>Evaluated: {totalReviewed}</div>
              <div>Pending: {Math.max(totalCount - totalReviewed, 0)}</div>
              <div>Tracked days: {attendanceSnapshot.days.length}</div>
              <div>
                Attendance totals:{" "}
                {(
                  ["PRESENT", "LATE", "EXCUSED", "ABSENT"] as DailyAttendanceStatus[]
                )
                  .map((s) => `${toStatusLabel(s)} ${attendanceSnapshot.totals[s]}`)
                  .join(" · ")}
              </div>
            </div>
          </div>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Manager final note</span>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              disabled={isReadOnly}
              rows={12}
              placeholder="Write the summary that HR will receive..."
              style={{
                border: "1px solid var(--border, #dbe2ea)",
                borderRadius: 12,
                padding: "12px 14px",
                resize: "vertical",
                background: "#fff",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost" onClick={saveFinalReportDraft}>
              Save report draft
            </button>
            <button type="button" className="btn btn-primary" onClick={sendFinalReport} disabled={isReadOnly}>
              Mark report ready for HR
            </button>
            <button type="button" className="btn btn-ghost" onClick={exportFinalReport}>
              Export report
            </button>
            {reportMessage ? (
              <div style={{ fontSize: 13, color: "#166534", fontWeight: 700, alignSelf: "center" }}>{reportMessage}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvaluationForm({
  participant,
  draft,
  readOnly,
  onChange,
  onSubmit,
}: {
  participant: ParticipantEvalStatus;
  draft: EvalDraft;
  readOnly: boolean;
  onChange: (patch: Partial<EvalDraft>) => void;
  onSubmit: () => void;
}) {
  const emp = participant.employee;
  const userName = emp.user_id?.name || "Unknown";
  const isDone = draft.submitted;
  const [savedHint, setSavedHint] = useState("");
  const recommendationScore = Math.max(1, Math.min(5, Math.round(draft.rating || 3))) * 20;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>
          Employee evaluation
        </div>
        <div style={{ color: "var(--muted)", marginTop: 4 }}>
          Use the full attendance history before submitting the final employee evaluation.
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border, #dbe2ea)",
          borderRadius: 14,
          padding: 16,
          background: "var(--surface, #fff)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 32, color: "var(--text)" }}>{userName}</div>
          <div style={{ color: "var(--muted)", marginTop: 2 }}>{emp.jobTitle || "Participant"}</div>
        </div>
        <div
          style={{
            borderRadius: 999,
            padding: "10px 16px",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "#1d4ed8",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          Recommendation score: {recommendationScore}/100
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Attendance</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.attendanceStatus}
            onChange={(e) =>
              onChange({ attendanceStatus: e.target.value as AttendanceStatus })
            }
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="IRREGULAR">Irregular</option>
            <option value="POOR">Poor</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Participation</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.participationLevel}
            onChange={(e) =>
              onChange({ participationLevel: e.target.value as ParticipationLevel })
            }
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value="VERY_ACTIVE">Very active</option>
            <option value="ACTIVE">Active</option>
            <option value="MODERATE">Moderate</option>
            <option value="LOW">Low</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Skill progress</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.skillProgress}
            onChange={(e) =>
              onChange({ skillProgress: e.target.value as SkillProgress })
            }
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value="STRONG">Strong improvement</option>
            <option value="MODERATE">Moderate improvement</option>
            <option value="SLIGHT">Slight improvement</option>
            <option value="NONE">No visible improvement</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Outcome</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.outcome}
            onChange={(e) =>
              onChange({ outcome: e.target.value as EvaluationOutcome })
            }
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value="COMPLETED_SUCCESSFULLY">Completed successfully</option>
            <option value="NEEDS_FOLLOW_UP">Needs follow-up</option>
            <option value="DID_NOT_COMPLETE">Did not complete</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Recommendation</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.recommendation}
            onChange={(e) =>
              onChange({ recommendation: e.target.value as Recommendation })
            }
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value="ADVANCED_TRAINING">Advanced training</option>
            <option value="PROJECT_ASSIGNMENT">Project assignment</option>
            <option value="MENTORING">Mentoring</option>
            <option value="RETRY_LATER">Retry later</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Manager rating</span>
          <select
            disabled={draft.submitting || readOnly}
            value={draft.rating}
            onChange={(e) => onChange({ rating: Number(e.target.value) || 1 })}
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}
          >
            <option value={1}>1 / 5</option>
            <option value={2}>2 / 5</option>
            <option value={3}>3 / 5</option>
            <option value={4}>4 / 5</option>
            <option value={5}>5 / 5</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Manager comment</div>
        <textarea
          disabled={draft.submitting || readOnly}
          value={draft.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          placeholder="Write your evaluation note here..."
          maxLength={2000}
          rows={6}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1.5px solid var(--border)",
            background: isDone ? "var(--surface-2)" : "var(--surface)",
            color: "var(--text)",
            fontSize: 14,
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
            opacity: isDone ? 0.7 : 1,
            boxSizing: "border-box",
          }}
        />
      </div>

      {!draft.submitting ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={draft.submitting || readOnly}
            onClick={() => {
              setSavedHint("Draft saved locally.");
              window.setTimeout(() => setSavedHint(""), 1500);
            }}
          >
            Save draft
          </button>
          <button
            onClick={onSubmit}
            disabled={draft.submitting || readOnly}
            style={{
              padding: "11px 16px",
              borderRadius: 10,
              border: "none",
              background: draft.submitting ? "var(--border)" : "#10b981",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              cursor: draft.submitting ? "default" : "pointer",
            }}
          >
            {draft.submitting
              ? "Submitting…"
              : isDone
              ? "Update evaluation"
              : "Submit evaluation"}
          </button>
          {savedHint ? (
            <span style={{ color: "#166534", fontWeight: 700, fontSize: 13, alignSelf: "center" }}>
              {savedHint}
            </span>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            borderRadius: 12,
            background: "color-mix(in srgb, #22c55e 10%, var(--surface))",
            color: "#16a34a",
            fontWeight: 800,
            fontSize: 15,
            border: "1.5px solid #22c55e",
          }}
        >
          Submitting evaluation...
        </div>
      )}
    </div>
  );
}
