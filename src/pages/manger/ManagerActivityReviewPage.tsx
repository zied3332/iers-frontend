import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  getActivityById,
  getActivitySkills,
  type ActivityRecord,
  type ActivitySkillRecord,
} from "../../services/activities.service";
import { getNextBackupCandidates } from "../../services/activityInvitations.service";
import { approveActivityReview, getActivityReview } from "../../services/activityReviews.service";
import { getCandidates } from "../../services/hrCopilot.service";
import type { ActivityReviewRecord } from "../../types/activity-review";
import "./ManagerActivityReviewPage.css";

type CandidateItem = {
  employeeId: string;
  name: string;
  finalScore: number;
  shortReason: string;
  rank: number;
  recommendationType: string;
};

function buildCandidateMap(
  primary: CandidateItem[],
  backup: CandidateItem[]
): Map<string, CandidateItem> {
  const m = new Map<string, CandidateItem>();
  for (const c of primary) m.set(c.employeeId, c);
  for (const c of backup) {
    if (!m.has(c.employeeId)) m.set(c.employeeId, c);
  }
  return m;
}

export default function ManagerActivityReviewPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [activitySkills, setActivitySkills] = useState<ActivitySkillRecord[]>([]);
  const [review, setReview] = useState<ActivityReviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [hrSelectedCandidates, setHrSelectedCandidates] = useState<CandidateItem[]>([]);
  const [backupCandidates, setBackupCandidates] = useState<CandidateItem[]>([]);
  const [selectedFinalIds, setSelectedFinalIds] = useState<string[]>([]);
  /** Reasons when an HR-suggested employee is excluded from the final list */
  const [exclusionReasons, setExclusionReasons] = useState<Record<string, string>>({});
  /** Default calendar days for replacement invites after a decline or missed deadline */
  const [managerReplacementResponseDays, setManagerReplacementResponseDays] = useState(3);

  const hrShortlistIds = useMemo(
    () => new Set(review?.hrSelectedEmployeeIds || []),
    [review?.hrSelectedEmployeeIds]
  );

  const seatsRequired = activity?.availableSlots ?? 0;

  const candidateById = useMemo(
    () => buildCandidateMap(hrSelectedCandidates, backupCandidates),
    [hrSelectedCandidates, backupCandidates]
  );

  const resolveName = (employeeId: string) =>
    candidateById.get(employeeId)?.name || `Employee ${employeeId.slice(-6)}`;

  useEffect(() => {
    const loadData = async () => {
      if (!activityId) return;
      setLoading(true);
      setError("");
      try {
        const [activityData, skills, reviewData, recommendations, backups] = await Promise.all([
          getActivityById(activityId),
          getActivitySkills(activityId),
          getActivityReview(activityId),
          getCandidates(activityId),
          getNextBackupCandidates(activityId, 24),
        ]);

        setActivity(activityData);
        setActivitySkills(skills);
        setReview(reviewData);

        if (!reviewData) {
          setError("No shortlist yet. HR must send it to you first.");
          setHrSelectedCandidates([]);
          setBackupCandidates([]);
          setSelectedFinalIds([]);
          return;
        }

        const primary = recommendations.primaryCandidates || [];
        const backupRecs = recommendations.backupCandidates || [];
        const fromApiBackups = (backups.availableBackups || []).map((b) => ({
          employeeId: b.employeeId,
          name: b.name,
          finalScore: b.finalScore,
          shortReason: b.shortReason,
          rank: b.rank || 0,
          recommendationType: b.recommendationType || "BACKUP",
        }));

        const primaryMap = new Map(primary.map((c) => [c.employeeId, c]));
        const backupRecMap = new Map(backupRecs.map((c) => [c.employeeId, c]));

        const hrList: CandidateItem[] = (reviewData.hrSelectedEmployeeIds || []).map(
          (id, index) => {
            const c = primaryMap.get(id) || backupRecMap.get(id);
            return {
              employeeId: id,
              name: c?.name || id,
              finalScore: c?.finalScore ?? 0,
              shortReason: c?.shortReason || "Suggested by HR for this activity.",
              rank: c?.rank ?? index + 1,
              recommendationType: c?.recommendationType || "HR_SHORTLIST",
            };
          }
        );

        const hrIds = new Set(hrList.map((h) => h.employeeId));
        const mergedBackups: CandidateItem[] = [
          ...fromApiBackups.filter((b) => !hrIds.has(b.employeeId)),
          ...backupRecs
            .filter((c) => !hrIds.has(c.employeeId))
            .map((c) => ({
              employeeId: c.employeeId,
              name: c.name,
              finalScore: c.finalScore,
              shortReason: c.shortReason,
              rank: c.rank,
              recommendationType: c.recommendationType || "BACKUP",
            })),
        ];
        const uniqueBackups = Array.from(
          new Map(mergedBackups.map((c) => [c.employeeId, c])).values()
        );

        setHrSelectedCandidates(hrList);
        setBackupCandidates(uniqueBackups);
        setSelectedFinalIds([...(reviewData.hrSelectedEmployeeIds || [])]);
        setExclusionReasons({});
      } catch (e: unknown) {
        console.error("Failed to load data:", e);
        setError(e instanceof Error ? e.message : "Failed to load activity data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activityId]);

  const needsMoreSeats = useMemo(() => {
    return seatsRequired > 0 && selectedFinalIds.length < seatsRequired;
  }, [seatsRequired, selectedFinalIds.length]);

  const canManagerAct = useMemo(() => {
    const s = review?.status;
    return s === "SUBMITTED_TO_MANAGER" || s === "RESUBMITTED_BY_HR";
  }, [review?.status]);

  const toggleFinalSelection = (employeeId: string) => {
    setError("");
    setSelectedFinalIds((prev) => {
      if (prev.includes(employeeId)) {
        setExclusionReasons((r) => {
          const next = { ...r };
          delete next[employeeId];
          return next;
        });
        return prev.filter((id) => id !== employeeId);
      }
      if (prev.length >= seatsRequired) {
        setError(`Maximum ${seatsRequired} participant(s). Remove one to add another.`);
        return prev;
      }
      return [...prev, employeeId];
    });
  };

  const updateExclusionReason = (employeeId: string, value: string) => {
    setExclusionReasons((prev) => ({ ...prev, [employeeId]: value }));
  };

  const validateExclusions = (): boolean => {
    const excluded = [...hrShortlistIds].filter((id) => !selectedFinalIds.includes(id));
    for (const id of excluded) {
      if (!exclusionReasons[id]?.trim()) {
        setError(`Reason required for excluding ${resolveName(id)}.`);
        return false;
      }
    }
    return true;
  };

  const buildManagerNoteFromExclusions = (): string | undefined => {
    const excluded = [...hrShortlistIds].filter((id) => !selectedFinalIds.includes(id));
    if (excluded.length === 0) return undefined;
    return excluded
      .map((id) => `${resolveName(id)}: ${exclusionReasons[id]?.trim() || ""}`)
      .join("\n");
  };

  const handleApprove = async () => {
    if (!activityId || !review) return;
    setError("");
    if (!validateExclusions()) return;
    if (selectedFinalIds.length !== seatsRequired) {
      setError(`Select exactly ${seatsRequired} people (now: ${selectedFinalIds.length}).`);
      return;
    }
    try {
      setSubmitting(true);
      const managerNote = buildManagerNoteFromExclusions();
      await approveActivityReview(activityId, {
        managerSelectedEmployeeIds: selectedFinalIds,
        managerReplacementResponseDays,
        ...(managerNote ? { managerNote } : {}),
      });
      navigate("/manager/activities");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectAllHrSuggested = () => {
    if (!canManagerAct) return;
    setError("");
    const fromBackup = selectedFinalIds.filter((id) => !hrShortlistIds.has(id));
    const room = Math.max(0, seatsRequired - fromBackup.length);
    const hrIds = hrSelectedCandidates.map((c) => c.employeeId);
    const take = hrIds.slice(0, room);
    setSelectedFinalIds([...fromBackup, ...take]);
  };

  const clearHrSuggested = () => {
    if (!canManagerAct) return;
    setError("");
    setSelectedFinalIds((prev) => prev.filter((id) => !hrShortlistIds.has(id)));
    setExclusionReasons((prev) => {
      const next = { ...prev };
      hrShortlistIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
  };

  if (loading) {
    return (
      <div className="manager-review-page">
        <div className="manager-review-shell">
          <div style={{ textAlign: "center", padding: 40 }}>
            <p>Loading activity data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="manager-review-page">
        <div className="manager-review-shell">
          <div style={{ textAlign: "center", padding: 40, color: "#b91c1c" }}>
            <p>{error || "Activity not found"}</p>
            <button type="button" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-review-page">
      <div className="manager-review-shell">
        <div className="manager-review-header">
          <div>
            <span className="manager-review-kicker">Manager review</span>
            <h1>{activity.title || "Activity review"}</h1>
          </div>
        </div>

        {error ? <div className="manager-review-error-banner">{error}</div> : null}

        {!canManagerAct && review ? (
          <div className="manager-review-info-banner">Status: {review.status}</div>
        ) : null}

        <section className="manager-review-panel manager-activity-details">
          <div className="section-head section-head--large">
            <h2>Activity details</h2>
          </div>

          <div className="manager-activity-detail-grid">
            <div className="manager-detail-field">
              <span className="manager-detail-label">Type</span>
              <span className="manager-detail-value">{activity.type}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Status</span>
              <span className="manager-detail-value">{activity.status}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Location</span>
              <span className="manager-detail-value">{activity.location || "—"}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Seats</span>
              <span className="manager-detail-value">{activity.availableSlots}</span>
            </div>
            <div className="manager-detail-field manager-detail-field--wide">
              <span className="manager-detail-label">Description</span>
              <span className="manager-detail-value">{activity.description || "—"}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Start</span>
              <span className="manager-detail-value">
                {activity.startDate
                  ? new Date(activity.startDate).toLocaleString()
                  : "—"}
              </span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">End</span>
              <span className="manager-detail-value">
                {activity.endDate ? new Date(activity.endDate).toLocaleString() : "—"}
              </span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Duration</span>
              <span className="manager-detail-value">{activity.duration || "—"}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Context</span>
              <span className="manager-detail-value">{activity.priorityContext}</span>
            </div>
            <div className="manager-detail-field">
              <span className="manager-detail-label">Priority level</span>
              <span className="manager-detail-value">{activity.targetLevel}</span>
            </div>
          </div>

          {activitySkills.length > 0 ? (
            <div className="manager-activity-skills">
              <span className="manager-detail-label">Required skills</span>
              <ul className="manager-skills-list">
                {activitySkills.map((s) => (
                  <li key={s._id}>
                    <strong>{s.skill_id?.name || s.skill_id?._id || "Skill"}</strong>
                    {s.required_level ? ` · ${s.required_level}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="manager-review-stats">
          <div className="manager-review-stat-card">
            <span>Seats required</span>
            <strong>{seatsRequired}</strong>
          </div>
          <div className="manager-review-stat-card">
            <span>HR suggested</span>
            <strong>{hrSelectedCandidates.length}</strong>
          </div>
          <div className={`manager-review-stat-card ${needsMoreSeats ? "manager-stat-warn" : ""}`}>
            <span>Your selection</span>
            <strong>
              {selectedFinalIds.length} / {seatsRequired || "—"}
            </strong>
          </div>
          <div className="manager-review-stat-card">
            <span>Backup pool</span>
            <strong>{backupCandidates.length}</strong>
          </div>
        </div>

        <section className="manager-review-panel">
          <div className="section-head section-head--row">
            <h2>HR shortlist</h2>
            <div className="manager-batch-actions">
              <button
                type="button"
                className="manager-batch-btn"
                onClick={selectAllHrSuggested}
                disabled={!canManagerAct || hrSelectedCandidates.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="manager-batch-btn"
                onClick={clearHrSuggested}
                disabled={!canManagerAct || hrSelectedCandidates.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="candidate-list">
            {hrSelectedCandidates.length === 0 ? (
              <div className="empty-state-card">No HR shortlist.</div>
            ) : (
              hrSelectedCandidates.map((candidate) => {
                const selected = selectedFinalIds.includes(candidate.employeeId);
                const showExclusion =
                  hrShortlistIds.has(candidate.employeeId) && !selected;

                return (
                  <div key={candidate.employeeId} className="manager-candidate-wrap">
                    <div className="manager-candidate-row">
                      <div className="manager-candidate-row__avatar">
                        {candidate.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="manager-candidate-row__body">
                        <div className="manager-candidate-row__top">
                          <h3 className="manager-candidate-row__name">{candidate.name}</h3>
                          <span className="manager-candidate-row__score">
                            {candidate.finalScore}/100
                          </span>
                        </div>
                        <p className="manager-candidate-row__reason">{candidate.shortReason}</p>
                        <div className="manager-candidate-row__meta">
                          <span>#{candidate.rank}</span>
                          <span>{candidate.recommendationType}</span>
                        </div>
                      </div>
                      <label className="manager-candidate-row__toggle">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!canManagerAct}
                          onChange={() => toggleFinalSelection(candidate.employeeId)}
                        />
                      </label>
                    </div>
                    {showExclusion ? (
                      <div className="manager-candidate-row__exclusion">
                        <label
                          className="manager-exclusion-label"
                          htmlFor={`excl-${candidate.employeeId}`}
                        >
                          Exclusion reason
                        </label>
                        <textarea
                          id={`excl-${candidate.employeeId}`}
                          className="manager-exclusion-textarea"
                          value={exclusionReasons[candidate.employeeId] || ""}
                          onChange={(e) =>
                            updateExclusionReason(candidate.employeeId, e.target.value)
                          }
                          placeholder="Why this person is not in the final list"
                          rows={2}
                          disabled={!canManagerAct}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section
          className={`manager-review-panel manager-backup-panel ${
            needsMoreSeats ? "manager-backup-panel--open" : "manager-backup-panel--idle"
          }`}
        >
          <div className="section-head section-head--row">
            <h2>
              Backups
              {needsMoreSeats ? (
                <span className="manager-backup-badge">
                  +{seatsRequired - selectedFinalIds.length}
                </span>
              ) : null}
            </h2>
          </div>

          <div className="candidate-list">
            {backupCandidates.length === 0 ? (
              <div className="empty-state-card">No backups.</div>
            ) : (
              backupCandidates.map((candidate) => {
                const selected = selectedFinalIds.includes(candidate.employeeId);
                return (
                  <div key={candidate.employeeId} className="manager-candidate-wrap">
                    <div className="manager-candidate-row">
                      <div className="manager-candidate-row__avatar manager-candidate-row__avatar--backup">
                        {candidate.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="manager-candidate-row__body">
                        <div className="manager-candidate-row__top">
                          <h3 className="manager-candidate-row__name">{candidate.name}</h3>
                          <span className="manager-candidate-row__score">
                            {candidate.finalScore}/100
                          </span>
                        </div>
                        <p className="manager-candidate-row__reason">{candidate.shortReason}</p>
                        <div className="manager-candidate-row__meta">
                          <span>#{candidate.rank}</span>
                          <span>{candidate.recommendationType}</span>
                        </div>
                      </div>
                      <label className="manager-candidate-row__toggle">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!canManagerAct}
                          onChange={() => toggleFinalSelection(candidate.employeeId)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="manager-review-actions--footer manager-review-footer-stack">
          <div className="manager-replacement-deadline-field">
            <label htmlFor="mgr-repl-days">Replacement invite deadline (days)</label>
            <input
              id="mgr-repl-days"
              type="number"
              min={1}
              max={365}
              disabled={!canManagerAct}
              value={managerReplacementResponseDays}
              onChange={(e) =>
                setManagerReplacementResponseDays(
                  Math.max(1, Math.min(365, Number(e.target.value) || 1))
                )
              }
            />
            <span className="manager-replacement-deadline-hint">
              Used when someone declines or misses the HR deadline and you invite a backup.
            </span>
          </div>
          <div className="manager-review-footer-buttons">
            <button
              type="button"
              className="manager-footer-btn manager-footer-btn--secondary"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button
              type="button"
              className="manager-footer-btn manager-footer-btn--primary"
              onClick={handleApprove}
              disabled={submitting || !canManagerAct || !review}
            >
              {submitting ? "…" : "Approve & notify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
