import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getParticipantsForEvaluation,
  submitEvaluation,
  type ParticipantEvalStatus,
  type ActivityParticipantsEval,
  type CreateEvaluationPayload,
  type EvaluationPresence,
} from "../../services/post-activity-evaluations.service";

// ─── Styles ──────────────────────────────────────────────────────────────────

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

const scoreBtn = (selected: boolean, value: number): React.CSSProperties => {
  const colors = ["", "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];
  return {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: selected ? `2px solid ${colors[value]}` : "1.5px solid var(--border)",
    background: selected
      ? `color-mix(in srgb, ${colors[value]} 18%, var(--surface))`
      : "var(--surface-2)",
    color: selected ? colors[value] : "var(--muted)",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    transition: "all 0.14s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvalDraft {
  presence: EvaluationPresence;
  feedback: string;
  skillScores: Record<string, number>; // skillId → score
  submitted: boolean;
  submitting: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerEvaluateActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ActivityParticipantsEval | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, EvalDraft>>({});
  const [activeEmployee, setActiveEmployee] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;
    getParticipantsForEvaluation(activityId)
      .then((res) => {
        setData(res);

        const initial: Record<string, EvalDraft> = {};
        for (const p of res.participants) {
          const empId = String(p.employee._id);
          if (p.isEvaluated && p.evaluation) {
            const scores: Record<string, number> = {};
            for (const s of p.evaluation.skillScores || []) {
              const skillId = s.skillId?._id || s.skillId;
              scores[String(skillId)] = s.score;
            }
            initial[empId] = {
              presence: p.evaluation.presence,
              feedback: p.evaluation.feedback || "",
              skillScores: scores,
              submitted: true,
              submitting: false,
            };
          } else {
            initial[empId] = {
              presence: "PRESENT",
              feedback: "",
              skillScores: {},
              submitted: false,
              submitting: false,
            };
          }
        }

        setDrafts(initial);

        // Auto-select first pending
        const firstPending = res.participants.find((p) => !p.isEvaluated);
        if (firstPending) setActiveEmployee(String(firstPending.employee._id));
        else if (res.participants.length > 0)
          setActiveEmployee(String(res.participants[0].employee._id));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activityId]);

  const updateDraft = (empId: string, patch: Partial<EvalDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], ...patch },
    }));
  };

  const handleSubmit = async (participant: ParticipantEvalStatus) => {
    const empId = String(participant.employee._id);
    const draft = drafts[empId];
    if (!draft || draft.submitting || draft.submitted) return;

    updateDraft(empId, { submitting: true });

    const payload: CreateEvaluationPayload = {
      activityId: activityId!,
      employeeId: empId,
      presence: draft.presence,
      feedback: draft.feedback,
      skillScores: Object.entries(draft.skillScores).map(([skillId, score]) => ({
        skillId,
        score,
      })),
    };

    try {
      await submitEvaluation(payload);
      updateDraft(empId, { submitted: true, submitting: false });

      // Move to next pending
      const pending = data?.participants.filter(
        (p) =>
          !drafts[String(p.employee._id)]?.submitted &&
          String(p.employee._id) !== empId
      );
      if (pending && pending.length > 0) {
        setActiveEmployee(String(pending[0].employee._id));
      }
    } catch {
      updateDraft(empId, { submitting: false });
      alert("Failed to submit evaluation. Please try again.");
    }
  };

  // ─── Loading / Error ──────────────────────────────────────────────────────

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
          <p style={{ color: "var(--muted)" }}>Activity not found or not accessible.</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, cursor: "pointer" }}>
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const { activity, participants } = data;
  const totalReviewed = participants.filter(
    (p) => drafts[String(p.employee._id)]?.submitted
  ).length;
  const pct =
    participants.length > 0
      ? Math.round((totalReviewed / participants.length) * 100)
      : 0;

  const activitySkills: Array<{ _id: string; name: string; category: string }> =
    activity.skills || [];

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
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
            {activity.title}
          </h1>
          <p className="page-subtitle">
            Evaluate participants · {participants.length} employee
            {participants.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Global progress bar */}
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
          {pct === 100 && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#22c55e", fontWeight: 700 }}>
              ✓ All participants have been evaluated!
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left: participant list */}
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
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "var(--border)"}`,
                    background: isSelected
                      ? "color-mix(in srgb, #3b82f6 8%, var(--surface))"
                      : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={avatarStyle(36)}>
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      userName[0]?.toUpperCase() || "?"
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
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

          {/* Right: evaluation form */}
          {activeEmployee && drafts[activeEmployee] ? (
            <EvaluationForm
              participant={
                participants.find((p) => String(p.employee._id) === activeEmployee)!
              }
              draft={drafts[activeEmployee]}
              activitySkills={activitySkills}
              onChange={(patch) => updateDraft(activeEmployee, patch)}
              onSubmit={() =>
                handleSubmit(
                  participants.find((p) => String(p.employee._id) === activeEmployee)!
                )
              }
            />
          ) : (
            <div
              style={{ ...card, textAlign: "center", color: "var(--muted)", padding: 48 }}
            >
              Select an employee to evaluate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Evaluation Form Sub-component ───────────────────────────────────────────

function EvaluationForm({
  participant,
  draft,
  activitySkills,
  onChange,
  onSubmit,
}: {
  participant: ParticipantEvalStatus;
  draft: EvalDraft;
  activitySkills: Array<{ _id: string; name: string; category: string }>;
  onChange: (patch: Partial<EvalDraft>) => void;
  onSubmit: () => void;
}) {
  const emp = participant.employee;
  const userName = emp.user_id?.name || "Unknown";
  const userEmail = emp.user_id?.email || "";
  const userAvatar = emp.user_id?.avatarUrl;
  const isDone = draft.submitted;

  const scoreLabel = (s: number) =>
    ["", "Very Low", "Low", "Medium", "High", "Expert"][s] || "";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 28,
        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* Employee header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={avatarStyle(52)}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            userName[0]?.toUpperCase() || "?"
          )}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "var(--text)" }}>
            {userName}
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{userEmail}</div>
          {emp.jobTitle && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {emp.jobTitle}
            </div>
          )}
        </div>
        {isDone && (
          <span
            style={{
              marginLeft: "auto",
              padding: "6px 16px",
              borderRadius: 999,
              background: "color-mix(in srgb, #22c55e 15%, transparent)",
              color: "#16a34a",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            ✓ Evaluated
          </span>
        )}
      </div>

      {/* Presence */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>
          PRESENCE
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(["PRESENT", "ABSENT"] as EvaluationPresence[]).map((p) => (
            <button
              key={p}
              disabled={isDone}
              onClick={() => onChange({ presence: p })}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: `2px solid ${
                  draft.presence === p
                    ? p === "PRESENT" ? "#22c55e" : "#ef4444"
                    : "var(--border)"
                }`,
                background:
                  draft.presence === p
                    ? p === "PRESENT"
                      ? "color-mix(in srgb, #22c55e 12%, var(--surface))"
                      : "color-mix(in srgb, #ef4444 12%, var(--surface))"
                    : "var(--surface-2)",
                color:
                  draft.presence === p
                    ? p === "PRESENT" ? "#16a34a" : "#dc2626"
                    : "var(--muted)",
                fontWeight: 800,
                fontSize: 14,
                cursor: isDone ? "default" : "pointer",
                transition: "all 0.14s",
                opacity: isDone ? 0.7 : 1,
              }}
            >
              {p === "PRESENT" ? "✓ Present" : "✗ Absent"}
            </button>
          ))}
        </div>
      </div>

      {/* Skill scores — only if PRESENT */}
      {draft.presence === "PRESENT" && activitySkills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 14 }}>
            SKILL SCORES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activitySkills.map((skill) => {
              const currentScore = draft.skillScores[skill._id] || 0;
              return (
                <div key={skill._id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                        {skill.name}
                      </span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {skill.category}
                      </span>
                    </div>
                    {currentScore > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                        {scoreLabel(currentScore)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        disabled={isDone}
                        onClick={() =>
                          !isDone &&
                          onChange({ skillScores: { ...draft.skillScores, [skill._id]: v } })
                        }
                        style={scoreBtn(currentScore === v, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>
          FEEDBACK <span style={{ fontWeight: 400 }}>(optional)</span>
        </div>
        <textarea
          disabled={isDone}
          value={draft.feedback}
          onChange={(e) => onChange({ feedback: e.target.value })}
          placeholder="Add any notes about this employee's performance…"
          maxLength={2000}
          rows={4}
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
        <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {draft.feedback.length}/2000
        </div>
      </div>

      {/* Submit */}
      {!isDone ? (
        <button
          onClick={onSubmit}
          disabled={draft.submitting}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: draft.submitting ? "var(--border)" : "#3b82f6",
            color: "#fff",
            fontWeight: 900,
            fontSize: 15,
            cursor: draft.submitting ? "default" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {draft.submitting ? "Submitting…" : "Submit Evaluation"}
        </button>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "14px",
            borderRadius: 12,
            background: "color-mix(in srgb, #22c55e 10%, var(--surface))",
            color: "#16a34a",
            fontWeight: 800,
            fontSize: 15,
            border: "1.5px solid #22c55e",
          }}
        >
          ✓ Evaluation submitted successfully
        </div>
      )}
    </div>
  );
}