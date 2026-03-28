import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  enrollInActivity,
  getActivityParticipations,
  getActivitySkills,
  getActivityScoreForEmployee,
  listActivities,
  type ActivityRecord,
  type ActivityScoreResponse,
  type ActivitySkillRecord,
  type ParticipationStatus,
} from "../../services/activities.service";

type RecommendationLevel = "HIGH" | "MEDIUM" | "LOW";

type RecommendationItem = {
  activityId: string;
  title: string;
  reason: string;
  match: number;
  level: RecommendationLevel;
  seats: number;
  score: ActivityScoreResponse;
  activity: ActivityRecord;
};

function readEmployeeIdFromStorage(): string | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { _id?: string; id?: string; userId?: string };
    return parsed?._id || parsed?.id || parsed?.userId || null;
  } catch {
    return null;
  }
}

function toRecommendationLevel(score: number): RecommendationLevel {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function levelBadge(lvl: RecommendationLevel): string {
  if (lvl === "HIGH") return "badge badge-high";
  if (lvl === "MEDIUM") return "badge badge-medium";
  return "badge badge-low";
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function formatLevel(value: string): string {
  if (!value) return "-";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function Recommendations() {
  const navigate = useNavigate();
  const employeeId = useMemo(() => readEmployeeIdFromStorage(), []);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [lastGenerated, setLastGenerated] = useState("-");
  const [applyingByActivity, setApplyingByActivity] = useState<Record<string, boolean>>({});
  const [participationStatusByActivity, setParticipationStatusByActivity] = useState<
    Record<string, ParticipationStatus | undefined>
  >({});
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationItem | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<ActivitySkillRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const generate = useCallback(async () => {
    const currentEmployeeId = employeeId;
    if (!currentEmployeeId) {
      setError("Utilisateur non identifié. Reconnecte-toi puis réessaie.");
      setRecs([]);
      setParticipationStatusByActivity({});
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    setParticipationStatusByActivity({});
    setSelectedRecommendation(null);
    setSelectedSkills([]);

    try {
      const activities = await listActivities();
      if (!activities.length) {
        setRecs([]);
        setParticipationStatusByActivity({});
        setInfo("Aucune activité disponible pour le moment.");
        setLastGenerated(new Date().toLocaleString("fr-FR"));
        return;
      }

      const scored = await Promise.all(
        activities.map(async (activity) => {
          try {
            const score = await getActivityScoreForEmployee(activity._id, currentEmployeeId);
            const match = Number.isFinite(score.globalScore) ? Number(score.globalScore.toFixed(1)) : 0;
            return {
              activityId: activity._id,
              title: activity.title,
              reason: score.skillScores.length
                ? `Score basé sur ${score.skillScores.length} skill(s) pondérés.`
                : "Aucun skill pondéré trouvé pour cette activité.",
              match,
              level: toRecommendationLevel(match),
              seats: activity.availableSlots,
              score,
              activity,
            } as RecommendationItem;
          } catch {
            return null;
          }
        }),
      );

      const ranked = scored
        .filter((row): row is RecommendationItem => row !== null)
        .sort((a, b) => b.match - a.match)
        .slice(0, 5);

      const participationEntries = await Promise.all(
        ranked.map(async (item) => {
          try {
            const participations = await getActivityParticipations(item.activityId);
            const ownParticipation = participations.find((row) => row.employeeId === currentEmployeeId);
            return [item.activityId, ownParticipation?.status] as const;
          } catch {
            // Soft fallback: if status lookup fails, keep card usable.
            return [item.activityId, undefined] as const;
          }
        }),
      );

      setRecs(ranked);
      setParticipationStatusByActivity(Object.fromEntries(participationEntries));
      if (!ranked.length) {
        setInfo("Aucune recommandation calculable actuellement.");
      }
      setLastGenerated(new Date().toLocaleString("fr-FR"));
    } catch (e: unknown) {
      setRecs([]);
      setParticipationStatusByActivity({});
      setError(e instanceof Error ? e.message : "Impossible de générer les recommandations.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const applyToActivity = async (activityId: string) => {
    if (!employeeId) {
      setError("Utilisateur non identifié. Reconnecte-toi puis réessaie.");
      return;
    }
    const currentStatus = participationStatusByActivity[activityId];
    if (currentStatus === "REJECTED") {
      setError("Votre candidature pour cette activité a été rejetée.");
      setInfo("");
      return;
    }
    if (currentStatus === "APPROVED") {
      setInfo("Votre candidature pour cette activité a été acceptée.");
      setError("");
      return;
    }

    setApplyingByActivity((prev) => ({ ...prev, [activityId]: true }));
    setError("");
    setInfo("");
    try {
      await enrollInActivity(activityId, employeeId);
      setInfo("Inscription envoyée avec succès.");
      await generate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible de s'inscrire à l'activité.");
    } finally {
      setApplyingByActivity((prev) => ({ ...prev, [activityId]: false }));
    }
  };

  const openRecommendationDetails = useCallback(async (item: RecommendationItem) => {
    setSelectedRecommendation(item);
    setDetailsLoading(true);
    setSelectedSkills([]);

    try {
      const skills = await getActivitySkills(item.activityId);
      setSelectedSkills(skills);
    } catch {
      // Keep modal open even if skill details fail.
      setSelectedSkills([]);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeRecommendationDetails = useCallback(() => {
    setSelectedRecommendation(null);
    setSelectedSkills([]);
    setDetailsLoading(false);
  }, []);

  const selectedStatus = selectedRecommendation
    ? participationStatusByActivity[selectedRecommendation.activityId]
    : undefined;
  const selectedIsRejected = selectedStatus === "REJECTED";
  const selectedIsApproved = selectedStatus === "APPROVED";

  return (
    <div className="hr-page">
      <div className="card header-card">
        <div className="section-head">
          <div>
            <div className="header-title">Recommendations</div>
            <div className="header-sub">Suggested activities based on your skills and progress.</div>
          </div>

          <div className="hr-actions">
            <button className="btn btn-ghost" onClick={() => void generate()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="btn btn-primary" onClick={() => void generate()} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        <div className="meta-row">
          <span className="meta">Last generated: {lastGenerated}</span>
          <span className="dot">•</span>
          <span className="meta">Model: dynamic scoring backend</span>
        </div>
      </div>

      {(error || info) && (
        <div className="card section-card" style={{ marginBottom: 12 }}>
          {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
          {!error && info && <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>{info}</p>}
        </div>
      )}

      <div className="hr-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div className="card section-card">
          <div className="section-head">
            <div className="section-title">Top matches</div>
            <span className="badge">{recs.length} items</span>
          </div>

          <div className="history">
            {!recs.length && !loading && (
              <p className="muted">Aucune recommandation pour le moment. Clique sur Generate.</p>
            )}

            {recs.map((r) => {
              const currentStatus = participationStatusByActivity[r.activityId];
              const isRejected = currentStatus === "REJECTED";
              const isApproved = currentStatus === "APPROVED";
              return (
                <div className="history-item" key={r.activityId} style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="history-title">{r.title}</div>
                    <div className="history-date">{r.reason}</div>

                    <div className="meta-row">
                      <span className={levelBadge(r.level)}>{r.level}</span>
                      <span className="badge">Seats: {r.seats}</span>
                      {isRejected && (
                        <span
                          className="badge"
                          style={{ background: "#fee2e2", borderColor: "#fecaca", color: "#b91c1c" }}
                        >
                          REJECTED
                        </span>
                      )}
                      {isApproved && (
                        <span
                          className="badge"
                          style={{ background: "#dcfce7", borderColor: "#bbf7d0", color: "#166534" }}
                        >
                          APPROVED
                        </span>
                      )}
                    </div>

                    {isRejected && (
                      <p style={{ margin: "8px 0 0", color: "#b91c1c", fontWeight: 700 }}>
                        Votre candidature pour cette activité a été rejetée.
                      </p>
                    )}
                    {isApproved && (
                      <p style={{ margin: "8px 0 0", color: "#166534", fontWeight: 700 }}>
                        Votre candidature pour cette activité a été acceptée.
                      </p>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <div className="score-value" style={{ fontSize: 22 }}>
                      {r.match}%
                    </div>
                    <div className="score-sub">match score</div>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => void applyToActivity(r.activityId)}
                      disabled={!!applyingByActivity[r.activityId] || isRejected || isApproved}
                      style={
                        isRejected
                          ? {
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              cursor: "not-allowed",
                            }
                          : isApproved
                            ? {
                                background: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                cursor: "not-allowed",
                              }
                            : undefined
                      }
                    >
                      {isRejected
                        ? "Rejected"
                        : isApproved
                          ? "Approved"
                          : applyingByActivity[r.activityId]
                            ? "Applying..."
                            : "Apply"}
                    </button>
                    <button
                      className="btn btn-small btn-ghost"
                      onClick={() => void openRecommendationDetails(r)}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Why these?</div>
            </div>
            <p className="muted">
              Recommendations are based on your skill levels, activity history, and team context.
              Scores are now loaded from backend endpoints.
            </p>

            <div className="tags">
              <span className="tag">Skill match</span>
              <span className="tag">Progress boost</span>
              <span className="tag">Team gaps</span>
              <span className="tag">Priority</span>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Next step</div>
            </div>
            <div className="stack">
              <button className="btn w-full" onClick={() => navigate("/me/profile")}>
                Open my profile
              </button>
              <button className="btn w-full btn-primary" onClick={() => navigate("/me/activities")}>
                See my activities
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRecommendation && (
        <div
          onClick={closeRecommendationDetails}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.2)",
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 96vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "white",
              border: "1px solid #eaecef",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
                  {selectedRecommendation.activity.title}
                </div>
                <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>
                  {selectedRecommendation.activity.type}
                </div>
              </div>
              <button type="button" className="btn" onClick={closeRecommendationDetails}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Description</div>
                <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
                  {selectedRecommendation.activity.description || "-"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Location</div>
                  <div style={{ color: "#475569" }}>{selectedRecommendation.activity.location || "-"}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Duration</div>
                  <div style={{ color: "#475569" }}>{selectedRecommendation.activity.duration || "-"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Start Date</div>
                  <div style={{ color: "#475569" }}>{formatDate(selectedRecommendation.activity.startDate)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>End Date</div>
                  <div style={{ color: "#475569" }}>{formatDate(selectedRecommendation.activity.endDate)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Priority Level</div>
                  <div style={{ color: "#475569" }}>{formatLevel(selectedRecommendation.activity.targetLevel)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Seats</div>
                  <div style={{ color: "#475569" }}>{selectedRecommendation.seats}</div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Required Skills</div>
                {detailsLoading ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Loading skills...
                  </p>
                ) : selectedSkills.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>
                    No required skills found for this activity.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedSkills.map((as, idx) => (
                      <div
                        key={as._id || `${as.skill_id?._id || "skill"}-${idx}`}
                        style={{
                          borderLeft: "3px solid #e0f2fe",
                          paddingLeft: 12,
                          color: "#475569",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{as.skill_id.name}</div>
                        <div style={{ fontSize: 11, color: "#a3a3a3", marginTop: 2 }}>
                          Level: <span style={{ fontWeight: 700 }}>{as.required_level}</span> | Importance:{" "}
                          <span style={{ fontWeight: 700 }}>{(as.weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button className="btn" style={{ flex: 1 }} onClick={closeRecommendationDetails}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  style={
                    selectedIsRejected
                      ? { flex: 1, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }
                      : selectedIsApproved
                        ? { flex: 1, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }
                        : { flex: 1 }
                  }
                  onClick={() => {
                    void applyToActivity(selectedRecommendation.activityId);
                    closeRecommendationDetails();
                  }}
                  disabled={
                    !!applyingByActivity[selectedRecommendation.activityId] ||
                    selectedIsRejected ||
                    selectedIsApproved
                  }
                >
                  {selectedIsRejected
                    ? "Rejected"
                    : selectedIsApproved
                      ? "Approved"
                      : applyingByActivity[selectedRecommendation.activityId]
                        ? "Applying..."
                        : "Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
