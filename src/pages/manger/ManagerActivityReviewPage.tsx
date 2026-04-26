import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActivityById,
  getActivitySkills,
  type ActivityRecord,
  type ActivitySkillRecord,
} from "../../services/activities.service";
import {
  getActivityStaffingStatus,
  getNextBackupCandidates,
  markRosterReadyForHr,
  replaceDeclinedInvitation,
} from "../../services/activityInvitations.service";
import {
  approveActivityReview,
  getActivityReview,
} from "../../services/activityReviews.service";
import { getCandidates } from "../../services/hrCopilot.service";
import type {
  ActivityInvitationItem,
  ActivityStaffingStatusResponse,
} from "../../types/activity-invitations";
import type { ActivityReviewRecord } from "../../types/activity-review";
import "./ManagerActivityReviewPage1.css";

type CandidateItem = {
  employeeId: string;
  name: string;
  finalScore: number;
  shortReason: string;
  rank: number;
  recommendationType: string;
};

type ViewMode = "list" | "grid";

type BackupOpt = Awaited<
  ReturnType<typeof getNextBackupCandidates>
>["availableBackups"][number];

function latestInvitationForEmployee(
  invitations: ActivityInvitationItem[],
  employeeId: string
): ActivityInvitationItem | undefined {
  const sid = String(employeeId).trim();
  const list = invitations.filter((i) => String(i.employeeId).trim() === sid);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];

  const rank: Record<string, number> = {
    ACCEPTED: 100,
    REPLACED: 85,
    INVITED: 70,
    DECLINED: 60,
    CANCELLED: 40,
  };

  return [...list].sort((a, b) => {
    const rb = rank[b.status] ?? 0;
    const ra = rank[a.status] ?? 0;
    if (rb !== ra) return rb - ra;
    return (
      new Date(b.invitedAt || 0).getTime() -
      new Date(a.invitedAt || 0).getTime()
    );
  })[0];
}

function formatInviteDate(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

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

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ManagerActivityReviewPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [activitySkills, setActivitySkills] = useState<ActivitySkillRecord[]>([]);
  const [review, setReview] = useState<ActivityReviewRecord | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [hrSelectedCandidates, setHrSelectedCandidates] = useState<CandidateItem[]>([]);
  const [backupCandidates, setBackupCandidates] = useState<CandidateItem[]>([]);
  const [selectedFinalIds, setSelectedFinalIds] = useState<string[]>([]);
  const [exclusionReasons, setExclusionReasons] = useState<Record<string, string>>({});
  const [managerReplacementResponseDays, setManagerReplacementResponseDays] = useState(3);

  const [staffingStatus, setStaffingStatus] =
    useState<ActivityStaffingStatusResponse | null>(null);
  const [sendingRosterToHr, setSendingRosterToHr] = useState(false);
  const [pickEmployeeByDeclined, setPickEmployeeByDeclined] = useState<Record<string, string>>({});
  const [submittingReplaceId, setSubmittingReplaceId] = useState<string | null>(null);
  const [backupReplaceOptions, setBackupReplaceOptions] = useState<BackupOpt[]>([]);

  const hrShortlistIds = useMemo(
    () => new Set(review?.hrSelectedEmployeeIds || []),
    [review?.hrSelectedEmployeeIds]
  );

  const seatsRequired = activity?.availableSlots ?? 0;

  const candidateById = useMemo(
    () => buildCandidateMap(hrSelectedCandidates, backupCandidates),
    [hrSelectedCandidates, backupCandidates]
  );

  const selectedCandidates = useMemo(
    () => selectedFinalIds.map((id) => candidateById.get(id)).filter(Boolean) as CandidateItem[],
    [candidateById, selectedFinalIds]
  );

  const canManagerAct = useMemo(() => {
    const s = review?.status;
    return s === "SUBMITTED_TO_MANAGER" || s === "RESUBMITTED_BY_HR";
  }, [review?.status]);

  const needsMoreSeats = seatsRequired > 0 && selectedFinalIds.length < seatsRequired;
  const overSelected = seatsRequired > 0 && selectedFinalIds.length > seatsRequired;

  const showInviteColumn = useMemo(
    () => Boolean(staffingStatus && (staffingStatus.invitations || []).length > 0),
    [staffingStatus]
  );

  const declinedInvitations = useMemo(
    () => (staffingStatus?.invitations || []).filter((i) => i.status === "DECLINED"),
    [staffingStatus?.invitations]
  );

  const listedCandidateIds = useMemo(
    () =>
      new Set([
        ...hrSelectedCandidates.map((c) => c.employeeId),
        ...backupCandidates.map((c) => c.employeeId),
      ]),
    [hrSelectedCandidates, backupCandidates]
  );

  const invitationsOnlyRows = useMemo(() => {
    const invs = staffingStatus?.invitations || [];
    const uniqueIds = [...new Set(invs.map((i) => String(i.employeeId).trim()))];

    return uniqueIds
      .map((eid) => latestInvitationForEmployee(invs, eid))
      .filter((inv): inv is ActivityInvitationItem => Boolean(inv))
      .filter((inv) => !listedCandidateIds.has(String(inv.employeeId).trim()));
  }, [staffingStatus?.invitations, listedCandidateIds]);

  const canSendRosterToHr = useMemo(() => {
    if (!staffingStatus || !activity) return false;
    if (activity.hrFinalLaunchAt || activity.status === "IN_PROGRESS") return false;
    if (activity.rosterReadyForHrAt) return false;

    const wf = activity.workflowStatus;
    if (wf && wf !== "EMPLOYEE_INVITATIONS_SENT") return false;

    const seats = staffingStatus.seatsRequired || 1;
    return staffingStatus.accepted >= seats && staffingStatus.invited === 0;
  }, [staffingStatus, activity]);

  const formatEmployeeFallback = (employeeId?: string | null) => {
    const normalized = typeof employeeId === "string" ? employeeId.trim() : "";
    return normalized ? `Employee ${normalized.slice(-6)}` : "Employee Unknown";
  };

  const resolveName = (employeeId?: string | null) => {
    if (!employeeId) return formatEmployeeFallback(employeeId);
    return candidateById.get(employeeId)?.name || formatEmployeeFallback(employeeId);
  };

  const reloadStaffing = useCallback(async () => {
    if (!activityId) return;
    try {
      const snap = await getActivityStaffingStatus(activityId);
      setStaffingStatus(snap);

      if (snap?.managerReplacementResponseDays != null) {
        setManagerReplacementResponseDays(Number(snap.managerReplacementResponseDays));
      }
    } catch {
      setStaffingStatus(null);
    }
  }, [activityId]);

  const reloadActivity = useCallback(async () => {
    if (!activityId) return;
    try {
      const a = await getActivityById(activityId);
      setActivity(a);
    } catch {
      // ignore
    }
  }, [activityId]);

  useEffect(() => {
    const loadData = async () => {
      if (!activityId) return;

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const [activityData, skills, reviewData, recommendations, backups] =
          await Promise.all([
            getActivityById(activityId),
            getActivitySkills(activityId),
            getActivityReview(activityId),
            getCandidates(activityId),
            getNextBackupCandidates(activityId, 24),
          ]);

        setActivity(activityData);
        setActivitySkills(skills);
        setReview(reviewData);

        await reloadStaffing();

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
              name: c?.name || formatEmployeeFallback(id),
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
  }, [activityId, reloadStaffing]);

  useEffect(() => {
    if (!activityId || declinedInvitations.length === 0) {
      setBackupReplaceOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getNextBackupCandidates(activityId, 30);
        if (!cancelled) setBackupReplaceOptions(data.availableBackups || []);
      } catch {
        if (!cancelled) setBackupReplaceOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, declinedInvitations]);

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

  const handleReplaceDeclined = useCallback(
    async (inv: ActivityInvitationItem) => {
      const invId = inv._id || inv.id || "";
      if (!invId || !activityId) return;

      const replacementEmployeeId = pickEmployeeByDeclined[invId];

      if (!replacementEmployeeId) {
        setError("Choose a replacement candidate.");
        return;
      }

      setError("");
      setSuccess("");
      setSubmittingReplaceId(invId);

      try {
        await replaceDeclinedInvitation({
          declinedInvitationId: invId,
          replacementEmployeeId,
          replacementResponseDays: managerReplacementResponseDays,
        });

        setSuccess("Replacement invitation sent.");

        setPickEmployeeByDeclined((prev) => {
          const next = { ...prev };
          delete next[invId];
          return next;
        });

        await reloadStaffing();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Replacement failed.");
      } finally {
        setSubmittingReplaceId(null);
      }
    },
    [
      activityId,
      pickEmployeeByDeclined,
      managerReplacementResponseDays,
      reloadStaffing,
    ]
  );

  const handleSendRosterToHr = async () => {
    if (!activityId) return;

    setError("");
    setSuccess("");
    setSendingRosterToHr(true);

    try {
      await markRosterReadyForHr(activityId);
      setSuccess("Roster sent to HR. Waiting for final validation.");
      await reloadActivity();
      await reloadStaffing();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not send roster to HR.");
    } finally {
      setSendingRosterToHr(false);
    }
  };

  const renderInviteBadge = (inv?: ActivityInvitationItem) => {
    if (!showInviteColumn) return null;

    let cls = "manager-modern-pill";
    let label: string;

    if (!inv) {
      cls += " muted";
      label = "Not invited";
    } else {
      switch (inv.status) {
        case "INVITED":
          cls += " warning";
          label = "Pending";
          break;
        case "ACCEPTED":
          cls += " success";
          label = "Accepted";
          break;
        case "DECLINED":
          cls += " danger";
          label = "Declined";
          break;
        case "REPLACED":
          cls += " muted";
          label = "Replaced";
          break;
        case "CANCELLED":
          cls += " muted";
          label = "Cancelled";
          break;
        default:
          cls += " muted";
          label = inv.status;
      }
    }

    return <span className={cls}>{label}</span>;
  };

  const renderDeclinedReplacement = (inv?: ActivityInvitationItem) => {
    if (!showInviteColumn || !inv || inv.status !== "DECLINED") return null;

    const invId = inv._id || inv.id || "";
    if (!invId) return null;

    const missed = inv.declineReason === "Missed the response deadline";

    return (
      <div className="manager-modern-replace-box">
        <p>
          {missed ? "Missed deadline" : "Declined"}
          {inv.declineReason && !missed ? ` · ${inv.declineReason}` : ""}
          {" · Invited "}
          {formatInviteDate(inv.invitedAt)}
        </p>

        <div className="manager-modern-replace-row">
          <select
            value={pickEmployeeByDeclined[invId] || ""}
            onChange={(e) =>
              setPickEmployeeByDeclined((prev) => ({
                ...prev,
                [invId]: e.target.value,
              }))
            }
          >
            <option value="">Select backup…</option>
            {backupReplaceOptions.map((b) => (
              <option key={b.employeeId} value={b.employeeId}>
                {b.name} · {b.finalScore}/100
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={submittingReplaceId === invId || !pickEmployeeByDeclined[invId]}
            onClick={() => void handleReplaceDeclined(inv)}
          >
            {submittingReplaceId === invId ? "Sending..." : "Send replacement"}
          </button>
        </div>

        {backupReplaceOptions.length === 0 ? (
          <p className="manager-modern-warn">No backups left in the pool.</p>
        ) : null}
      </div>
    );
  };

  const renderCandidateCard = (candidate: CandidateItem, source: "hr" | "backup") => {
    const selected = selectedFinalIds.includes(candidate.employeeId);
    const showExclusion = source === "hr" && hrShortlistIds.has(candidate.employeeId) && !selected;
    const invForRow = staffingStatus
      ? latestInvitationForEmployee(staffingStatus.invitations || [], candidate.employeeId)
      : undefined;

    return (
      <div
        key={candidate.employeeId}
        className={`manager-modern-candidate-card ${selected ? "selected" : ""} ${
          viewMode === "grid" ? "grid-card" : ""
        }`}
      >
        <div className="manager-modern-candidate-main">
          <div className={`manager-modern-avatar ${source === "backup" ? "backup" : ""}`}>
            {viewMode === "grid" ? `#${candidate.rank}` : candidate.name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="manager-modern-candidate-content">
            <div className="manager-modern-candidate-top">
              <div>
                <h3>{candidate.name}</h3>
                <p>{candidate.shortReason}</p>
              </div>

              <div className="manager-modern-candidate-badges">
                {renderInviteBadge(invForRow)}
                <span className="manager-modern-score">{candidate.finalScore}/100</span>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="manager-modern-grid-bars">
                <div>
                  <span>Recommendation</span>
                  <strong>{Math.round(candidate.finalScore)}%</strong>
                  <div>
                    <i style={{ width: `${Math.min(candidate.finalScore, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <span>Rank quality</span>
                  <strong>{candidate.rank <= 3 ? "High" : "Backup"}</strong>
                  <div>
                    <i style={{ width: `${candidate.rank <= 3 ? 82 : 54}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="manager-modern-meta-row">
                <span>Rank #{candidate.rank}</span>
                <span>{candidate.recommendationType}</span>
                <span>{source === "hr" ? "HR shortlist" : "Backup option"}</span>
              </div>
            )}
          </div>

          <label className="manager-modern-switch">
            <input
              type="checkbox"
              checked={selected}
              disabled={!canManagerAct}
              onChange={() => toggleFinalSelection(candidate.employeeId)}
            />
            <span>{selected ? "Selected" : "Select"}</span>
          </label>
        </div>

        {renderDeclinedReplacement(invForRow)}

        {showExclusion ? (
          <div className="manager-modern-exclusion">
            <label htmlFor={`excl-${candidate.employeeId}`}>Exclusion reason</label>
            <textarea
              id={`excl-${candidate.employeeId}`}
              value={exclusionReasons[candidate.employeeId] || ""}
              onChange={(e) => updateExclusionReason(candidate.employeeId, e.target.value)}
              placeholder="Explain why this HR-suggested employee is not in the final list."
              rows={2}
              disabled={!canManagerAct}
            />
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="manager-modern-page">
        <div className="manager-modern-loading">Loading manager review...</div>
      </main>
    );
  }

  if (!activity) {
    return (
      <main className="manager-modern-page">
        <div className="manager-modern-loading error">
          <p>{error || "Activity not found"}</p>
          <button type="button" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="manager-modern-page">
      <div className="manager-modern-topbar">
        <div>
          <div className="manager-modern-eyebrow">Manager review</div>
          <h1>{activity.title || "Activity review"}</h1>
          <p>
            Review HR shortlist, adjust final participants, handle declined invites,
            and send the roster back to HR.
          </p>
        </div>

        <div className="manager-modern-top-actions">
          <button type="button" className="manager-modern-btn" onClick={() => navigate(-1)}>
            Back
          </button>

          <button
            type="button"
            className="manager-modern-btn primary"
            onClick={handleApprove}
            disabled={submitting || !canManagerAct || !review}
          >
            {submitting ? "Approving..." : "Approve & notify"}
          </button>
        </div>
      </div>

      {error ? <div className="manager-modern-alert error">{error}</div> : null}
      {success ? <div className="manager-modern-alert success">{success}</div> : null}

      {!canManagerAct && review ? (
        <div className="manager-modern-alert info">Current review status: {review.status}</div>
      ) : null}

      <div className="manager-modern-layout">
        <aside className="manager-modern-side-card">
          <div className="manager-modern-card-body">
            <h2>Activity details</h2>

            <div className="manager-modern-detail-grid">
              <div><span>Type</span><strong>{activity.type}</strong></div>
              <div><span>Status</span><strong>{activity.status}</strong></div>
              <div><span>Location</span><strong>{activity.location || "—"}</strong></div>
              <div><span>Seats</span><strong>{activity.availableSlots}</strong></div>
              <div><span>Start</span><strong>{formatDate(activity.startDate)}</strong></div>
              <div><span>End</span><strong>{formatDate(activity.endDate)}</strong></div>
              <div><span>Duration</span><strong>{activity.duration || "—"}</strong></div>
              <div><span>Context</span><strong>{activity.priorityContext || "—"}</strong></div>
            </div>

            <div className="manager-modern-description">
              <span>Description</span>
              <p>{activity.description || "—"}</p>
            </div>

            {activitySkills.length > 0 ? (
              <div className="manager-modern-skills">
                <span>Required skills</span>
                <div>
                  {activitySkills.map((s) => (
                    <strong key={s._id}>
                      {s.skill_id?.name || s.skill_id?._id || "Skill"}
                      {s.required_level ? ` · ${s.required_level}` : ""}
                    </strong>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="manager-modern-main">
          <div className="manager-modern-kpi-grid">
            <div><span>Seats required</span><strong>{seatsRequired}</strong></div>
            <div><span>HR suggested</span><strong>{hrSelectedCandidates.length}</strong></div>
            <div className={needsMoreSeats || overSelected ? "warning" : ""}>
              <span>Your selection</span>
              <strong>{selectedFinalIds.length} / {seatsRequired || "—"}</strong>
            </div>
            <div><span>Backup pool</span><strong>{backupCandidates.length}</strong></div>
          </div>

          <div className="manager-modern-card">
            <div className="manager-modern-section-head">
              <div>
                <h2>Seat planning</h2>
                <p>Final participants selected by the manager.</p>
              </div>

              <span className={needsMoreSeats ? "manager-modern-pill warning" : "manager-modern-pill success"}>
                {needsMoreSeats
                  ? `${seatsRequired - selectedFinalIds.length} seat(s) missing`
                  : "Seats covered"}
              </span>
            </div>

            <div className="manager-modern-seat-map">
              {Array.from({ length: seatsRequired || 0 }).map((_, index) => {
                const candidate = selectedCandidates[index];

                return (
                  <div
                    key={index}
                    className={`manager-modern-seat ${candidate ? "filled" : ""}`}
                  >
                    <div>Seat {index + 1}</div>
                    <strong>{candidate?.name || "Open"}</strong>
                    <p>{candidate ? "Selected for final roster" : "Needs decision"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {showInviteColumn && staffingStatus ? (
            <div className="manager-modern-card">
              <div className="manager-modern-section-head">
                <div>
                  <h2>Invitation status</h2>
                  <p>Live responses after employee invitations are sent.</p>
                </div>
              </div>

              <div className="manager-modern-invite-grid">
                <div><span>Seats</span><strong>{staffingStatus.seatsRequired}</strong></div>
                <div className="success"><span>Accepted</span><strong>{staffingStatus.accepted}</strong></div>
                <div className="warning"><span>Pending</span><strong>{staffingStatus.invited}</strong></div>
                <div className="danger"><span>Declined / overdue</span><strong>{staffingStatus.declined}</strong></div>
              </div>

              {canSendRosterToHr ? (
                <div className="manager-modern-roster-box">
                  <p>
                    Every seat has accepted. Send the roster to HR so they can run
                    final validation and start the activity.
                  </p>
                  <button
                    type="button"
                    disabled={sendingRosterToHr}
                    onClick={() => void handleSendRosterToHr()}
                  >
                    {sendingRosterToHr ? "Sending..." : "Send to HR"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="manager-modern-card">
            <div className="manager-modern-section-head">
              <div>
                <h2>HR shortlist</h2>
                <p>Review HR-proposed candidates and keep or remove them.</p>
              </div>

              <div className="manager-modern-section-actions">
                <div className="manager-modern-view-toggle">
                  <button
                    type="button"
                    className={viewMode === "list" ? "active" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={viewMode === "grid" ? "active" : ""}
                    onClick={() => setViewMode("grid")}
                  >
                    Grid
                  </button>
                </div>

                <button
                  type="button"
                  onClick={selectAllHrSuggested}
                  disabled={!canManagerAct || hrSelectedCandidates.length === 0}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearHrSuggested}
                  disabled={!canManagerAct || hrSelectedCandidates.length === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className={viewMode === "grid" ? "manager-modern-grid-list" : "manager-modern-list"}>
              {hrSelectedCandidates.length === 0 ? (
                <div className="manager-modern-empty">No HR shortlist.</div>
              ) : (
                hrSelectedCandidates.map((candidate) =>
                  renderCandidateCard(candidate, "hr")
                )
              )}
            </div>
          </div>

          <div className={`manager-modern-card ${needsMoreSeats ? "accent" : ""}`}>
            <div className="manager-modern-section-head">
              <div>
                <h2>Backups</h2>
                <p>Use backups if you need to replace or complete the roster.</p>
              </div>

              {needsMoreSeats ? (
                <span className="manager-modern-pill warning">
                  +{seatsRequired - selectedFinalIds.length} needed
                </span>
              ) : null}
            </div>

            <div className={viewMode === "grid" ? "manager-modern-grid-list" : "manager-modern-list"}>
              {backupCandidates.length === 0 ? (
                <div className="manager-modern-empty">No backups.</div>
              ) : (
                backupCandidates.map((candidate) =>
                  renderCandidateCard(candidate, "backup")
                )
              )}
            </div>
          </div>

          {invitationsOnlyRows.length > 0 ? (
            <div className="manager-modern-card">
              <div className="manager-modern-section-head">
                <div>
                  <h2>Other invited participants</h2>
                  <p>Replacement or backup invites not shown in the candidate lists.</p>
                </div>
              </div>

              <div className="manager-modern-list">
                {invitationsOnlyRows.map((inv) => {
                  const invId = inv._id || inv.id || inv.employeeId;
                  const displayName =
                    inv.employeeName || formatEmployeeFallback(inv.employeeId);

                  return (
                    <div key={invId} className="manager-modern-candidate-card readonly">
                      <div className="manager-modern-candidate-main">
                        <div className="manager-modern-avatar backup">
                          {displayName.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="manager-modern-candidate-content">
                          <div className="manager-modern-candidate-top">
                            <div>
                              <h3>{displayName}</h3>
                              <p>
                                Invitation · respond by{" "}
                                {formatInviteDate(inv.responseDeadlineAt)}
                              </p>
                            </div>
                            <div className="manager-modern-candidate-badges">
                              {renderInviteBadge(inv)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {renderDeclinedReplacement(inv)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="manager-modern-footer">
            <div>
              <label htmlFor="mgr-repl-days">Replacement invite deadline</label>
              <div>
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
                <span>days</span>
              </div>
              <p>Used when someone declines or misses the HR deadline.</p>
            </div>

            <div>
              <button
                type="button"
                className="manager-modern-btn"
                onClick={() => navigate(-1)}
              >
                Back
              </button>

              <button
                type="button"
                className="manager-modern-btn primary"
                onClick={handleApprove}
                disabled={submitting || !canManagerAct || !review}
              >
                {submitting ? "Approving..." : "Approve & notify"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}