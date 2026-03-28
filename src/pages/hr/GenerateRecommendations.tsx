import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getActivityParticipations,
  getActivityScoreForEmployee,
  listActivities,
  updateParticipationStatus,
  type ActivityParticipationRecord,
  type ActivityRecord,
  type ActivityScoreResponse,
  type ParticipationStatus,
} from "../../services/activities.service";

type RecommendationItem = {
  employeeId: string;
  employeeName: string;
  department: string;
  status: ParticipationStatus;
  score: ActivityScoreResponse;
};

const REVIEW_STATUSES: ParticipationStatus[] = ["REJECTED", "APPROVED"];

function normalizeReviewStatus(value?: ParticipationStatus): ParticipationStatus {
  return value === "REJECTED" ? "REJECTED" : "APPROVED";
}

function getEmployeeName(participation: ActivityParticipationRecord): string {
  const employee = participation.employee;
  if (employee && typeof employee === "object") {
    const name = String(employee.name || "").trim();
    if (name) return name;
    const email = String(employee.email || "").trim();
    if (email) return email;
  }
  return `Employee ${participation.employeeId}`;
}

function getDepartmentLabel(participation: ActivityParticipationRecord): string {
  const employee = participation.employee;
  if (!employee || typeof employee !== "object") return "Unknown";
  const department = employee.department;
  if (!department) return "Unknown";
  if (typeof department === "string") return department;
  return String(department.name || department._id || "Unknown");
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function HrGenerateRecommendations() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityId, setActivityId] = useState("");
  const [department, setDepartment] = useState<string>("ALL");
  const [skillQuery, setSkillQuery] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<RecommendationItem[] | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [statusDraftByEmployee, setStatusDraftByEmployee] = useState<
    Record<string, ParticipationStatus>
  >({});
  const [updatingStatusByEmployee, setUpdatingStatusByEmployee] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const loadActivities = async () => {
      setActivitiesLoading(true);
      setError("");
      try {
        const rows = await listActivities();
        setActivities(rows);
        setActivityId((prev) => prev || rows[0]?._id || "");
      } catch (e: unknown) {
        console.error("Failed to load activities:", e);
        setError(e instanceof Error ? e.message : "Failed to load activities.");
      } finally {
        setActivitiesLoading(false);
      }
    };

    loadActivities();
  }, []);

  const activity = useMemo(
    () => activities.find((a) => a._id === activityId) || null,
    [activities, activityId]
  );

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();
    (generated || []).forEach((row) => {
      if (row.department && row.department !== "Unknown") values.add(row.department);
    });
    return ["ALL", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [generated]);

  const generate = useCallback(async () => {
    if (!activityId) {
      setGenerated([]);
      setInfo("Select an activity first.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      const participations = await getActivityParticipations(activityId);
      if (!participations.length) {
        setGenerated([]);
        setInfo("No participations found for this activity.");
        return;
      }

      const scoredRows = await Promise.all(
        participations.map(async (participation) => {
          try {
            const score = await getActivityScoreForEmployee(activityId, participation.employeeId);
            const row: RecommendationItem = {
              employeeId: participation.employeeId,
              employeeName: getEmployeeName(participation),
              department: getDepartmentLabel(participation),
              status: participation.status,
              score,
            };
            return row;
          } catch (e: unknown) {
            console.error(
              `Failed to load score for employee ${participation.employeeId}:`,
              e
            );
            return null;
          }
        })
      );

      const q = skillQuery.trim().toLowerCase();
      const filtered = scoredRows
        .filter((row): row is RecommendationItem => row !== null)
        .filter((row) => row.score.globalScore >= minScore)
        .filter((row) =>
          department === "ALL" ? true : row.department.toLowerCase() === department.toLowerCase()
        )
        .filter((row) => {
          if (!q) return true;
          return row.score.skillScores.some(
            (skill) =>
              skill.skillId.toLowerCase().includes(q) ||
              skill.requiredLevel.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => b.score.globalScore - a.score.globalScore)
        .slice(0, topN);

      setGenerated(filtered);
      setStatusDraftByEmployee((prev) => {
        const next = { ...prev };
        filtered.forEach((row) => {
          next[row.employeeId] = normalizeReviewStatus(next[row.employeeId] || row.status);
        });
        return next;
      });
    } catch (e: unknown) {
      console.error("Failed to generate recommendations:", e);
      setError(e instanceof Error ? e.message : "Failed to generate recommendations.");
      setGenerated([]);
    } finally {
      setLoading(false);
    }
  }, [activityId, department, minScore, skillQuery, topN]);

  const handleStatusUpdate = async (employeeId: string) => {
    if (!activityId) return;
    const status = normalizeReviewStatus(statusDraftByEmployee[employeeId]);
    if (!status) return;

    setUpdatingStatusByEmployee((prev) => ({ ...prev, [employeeId]: true }));
    setError("");
    setInfo("");
    try {
      await updateParticipationStatus(activityId, employeeId, status);
      setInfo(`Participation status updated to ${status} for employee ${employeeId}.`);
      await generate();
    } catch (e: unknown) {
      console.error("Failed to update participation status:", e);
      setError(
        e instanceof Error ? e.message : "Failed to update participation status."
      );
    } finally {
      setUpdatingStatusByEmployee((prev) => ({ ...prev, [employeeId]: false }));
    }
  };

  return (
    <div className="hr-page">
      <div className="hr-topbar">
        <div>
          <div className="header-title">Generate Recommendations</div>
          <div className="header-sub">
            Choose an activity + filters, then generate a ranked candidate list.
          </div>
        </div>

        <div className="hr-actions">
          <Link className="btn btn-ghost" to="/hr/recommendations">
            Back
          </Link>
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={!activityId || loading || activitiesLoading}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {(error || info) && (
        <div className="card section-card" style={{ marginBottom: 12 }}>
          {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
          {!error && info && (
            <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>{info}</p>
          )}
        </div>
      )}

      <div className="hr-grid">
        {/* LEFT: INPUTS */}
        <div>
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Inputs</div>
              <span className="badge">Live API</span>
            </div>

            <div className="stack">
              <div>
                <div className="meta">Activity</div>
                <select
                  className="btn w-full"
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  disabled={activitiesLoading || !activities.length}
                >
                  {!activities.length && (
                    <option value="">
                      {activitiesLoading ? "Loading activities..." : "No activities available"}
                    </option>
                  )}
                  {activities.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.title} • seats {a.availableSlots}
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-cols">
                <div>
                  <div className="meta">Department</div>
                  <select
                    className="btn w-full"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {departmentOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="meta">Top N</div>
                  <input
                    className="btn w-full"
                    type="number"
                    min={1}
                    max={20}
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="two-cols">
                <div>
                  <div className="meta">Min Global Score: {minScore}</div>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={100}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div className="meta">Skill Filter</div>
                  <input
                    className="btn w-full"
                    placeholder="ex: React, Cloud..."
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Scoring Source</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Scores are fetched from backend dynamic scoring endpoints.
                </div>

                <div className="stack" style={{ marginTop: 10 }}>
                  <div>
                    <div className="meta">- Weighted score per skill</div>
                  </div>
                  <div>
                    <div className="meta">- Global score for each participation</div>
                  </div>
                  <div>
                    <div className="meta">
                      - Auto-refresh score after participation status update
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Activity Requirements</div>
                <div className="tags">
                  {activity?.requiredSkills?.length ? (
                    activity.requiredSkills.map((s) => (
                      <span key={`${s.name}-${s.desiredLevel}`} className="tag">
                        {s.name} • {s.desiredLevel}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No requirement found for selected activity.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: OUTPUT */}
        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Preview</div>
              <span className="badge">Top {topN}</span>
            </div>

            {loading ? (
              <p className="muted">Loading recommendations...</p>
            ) : !generated ? (
              <p className="muted">
                Click <b>Generate</b> to preview ranked candidates.
              </p>
            ) : generated.length === 0 ? (
              <p className="muted">
                No recommendations found for current filters.
              </p>
            ) : (
              <div className="stack">
                {generated.map((r) => (
                  <div key={r.employeeId} className="history-item">
                    <div style={{ display: "grid", gap: 4 }}>
                      <div className="history-title">
                        {r.employeeName}{" "}
                        <span className="meta">
                          ({r.department}) • {r.employeeId}
                        </span>
                      </div>

                      <div className="tags">
                        <span className="tag">Status: {r.status}</span>
                        <span className="tag">
                          Weighted: {formatScore(r.score.weightedScore)}
                        </span>
                        <span className="tag">
                          Weight total: {formatScore(r.score.weightTotal)}
                        </span>
                      </div>

                      <div className="stack" style={{ marginTop: 6 }}>
                        {r.score.skillScores.map((skill) => (
                          <div key={`${r.employeeId}-${skill.skillId}`} className="meta">
                            Skill {skill.skillId} - weight {formatScore(skill.weight)} - dynamic{" "}
                            {formatScore(skill.employeeDynamicScore)} - contribution{" "}
                            {formatScore(skill.contribution)}
                          </div>
                        ))}
                        {!r.score.skillScores.length && (
                          <div className="meta">No skill score details returned by API.</div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="score-value">{formatScore(r.score.globalScore)}%</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                        <select
                          className="btn btn-small"
                          value={normalizeReviewStatus(statusDraftByEmployee[r.employeeId] || r.status)}
                          onChange={(e) =>
                            setStatusDraftByEmployee((prev) => ({
                              ...prev,
                              [r.employeeId]: e.target.value as ParticipationStatus,
                            }))
                          }
                        >
                          {REVIEW_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => handleStatusUpdate(r.employeeId)}
                          disabled={!!updatingStatusByEmployee[r.employeeId]}
                        >
                          {updatingStatusByEmployee[r.employeeId]
                            ? "Updating..."
                            : "Update Status"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">What happens next?</div>
            </div>
            <p className="muted">
              Update participation status (APPROVED/REJECTED) directly here, then regenerate to
              refresh real backend scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}