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
import { approveActivityReview, getActivityReview } from "../../services/activityReviews.service";
import { getCandidates } from "../../services/hrCopilot.service";
import type {
  ActivityInvitationItem,
  ActivityStaffingStatusResponse,
} from "../../types/activity-invitations";
import type { ActivityReviewRecord } from "../../types/activity-review";
import "./ManagerActivityReviewPage.css";

/** Resolve which invitation row to show for this employee (handles id shape + duplicate rows). */
function latestInvitationForEmployee(
  invitations: ActivityInvitationItem[],
  employeeId: string
): ActivityInvitationItem | undefined {
  const sid = String(employeeId).trim();
  const list = invitations.filter((i) => String(i.employeeId).trim() === sid);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];

  /** If multiple rows ever exist, prefer meaningful status over "pending" (e.g. REPLACED over stale INVITED). */
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
      new Date(b.invitedAt || 0).getTime() - new Date(a.invitedAt || 0).getTime()
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

  const [staffingStatus, setStaffingStatus] = useState<ActivityStaffingStatusResponse | null>(
    null
  );
  const [staffingReplaceSuccess, setStaffingReplaceSuccess] = useState("");
  const [sendingRosterToHr, setSendingRosterToHr] = useState(false);
  const [pickEmployeeByDeclined, setPickEmployeeByDeclined] = useState<Record<string, string>>({});
  const [submittingReplaceId, setSubmittingReplaceId] = useState<string | null>(null);

  type BackupOpt = Awaited<ReturnType<typeof getNextBackupCandidates>>["availableBackups"][number];
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

  const resolveName = (employeeId: string) =>
    candidateById.get(employeeId)?.name || `Employee ${employeeId.slice(-6)}`;

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
      /* ignore */
    }
  }, [activityId]);

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
  }, [activityId, reloadStaffing]);

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
    return (
      staffingStatus.accepted >= seats &&
      staffingStatus.invited === 0
    );
  }, [staffingStatus, activity]);

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
      setStaffingReplaceSuccess("");
      setSubmittingReplaceId(invId);
      try {
        await replaceDeclinedInvitation({
          declinedInvitationId: invId,
          replacementEmployeeId,
          replacementResponseDays: managerReplacementResponseDays,
        });
        setStaffingReplaceSuccess("Replacement invitation sent.");
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
    setStaffingReplaceSuccess("");
    setSendingRosterToHr(true);
    try {
      await markRosterReadyForHr(activityId);
      setStaffingReplaceSuccess("Roster sent to HR. They will run final validation to start the activity.");
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
    let cls = "manager-invite-badge";
    let label: string;
    if (!inv) {
      cls += " manager-invite-badge--muted";
      label = "Not invited";
    } else {
      switch (inv.status) {
        case "INVITED":
          cls += " manager-invite-badge--pending";
          label = "Pending";
          break;
        case "ACCEPTED":
          cls += " manager-invite-badge--ok";
          label = "Accepted";
          break;
        case "DECLINED":
          cls += " manager-invite-badge--bad";
          label = "Declined";
          break;
        case "REPLACED":
          cls += " manager-invite-badge--muted";
          label = "Replaced";
          break;
        case "CANCELLED":
          cls += " manager-invite-badge--muted";
          label = "Cancelled";
          break;
        default:
          cls += " manager-invite-badge--muted";
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
      <div className="manager-invite-replace">
        <p className="manager-invite-replace__meta">
          {missed ? "Missed deadline" : "Declined"}
          {inv.declineReason && !missed ? ` · ${inv.declineReason}` : ""}
          {" · Invited "}
          {formatInviteDate(inv.invitedAt)}
          {" · Respond by "}
          {formatInviteDate(inv.responseDeadlineAt)}
        </p>
        <div className="manager-invite-replace__row">
          <select
            value={pickEmployeeByDeclined[invId] || ""}
            onChange={(e) =>
              setPickEmployeeByDeclined((prev) => ({
                ...prev,
                [invId]: e.target.value,
              }))
            }
            className="manager-invite-replace__select"
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
            className="manager-invite-replace__btn"
            disabled={submittingReplaceId === invId || !pickEmployeeByDeclined[invId]}
            onClick={() => void handleReplaceDeclined(inv)}
          >
            {submittingReplaceId === invId ? "…" : "Send replacement invite"}
          </button>
        </div>
        {backupReplaceOptions.length === 0 ? (
          <p className="manager-invite-replace__warn">No backups left in the pool for this activity.</p>
        ) : null}
      </div>
    );
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
        {staffingReplaceSuccess ? (
          <div className="manager-review-success-banner" role="status">
            {staffingReplaceSuccess}
          </div>
        ) : null}

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

        {showInviteColumn && staffingStatus ? (
          <section className="manager-review-panel manager-staffing-overview">
            <div className="section-head">
              <h2>Invitation status</h2>
              <p className="manager-staffing-overview__hint">
                Live responses after invitations go out. Replace declined or overdue slots from backups.
              </p>
            </div>
            <div className="manager-staffing-stat-grid">
              <div className="manager-staffing-stat-card">
                <span>Seats</span>
                <strong>{staffingStatus.seatsRequired}</strong>
              </div>
              <div className="manager-staffing-stat-card manager-staffing-stat-card--ok">
                <span>Accepted</span>
                <strong>{staffingStatus.accepted}</strong>
              </div>
              <div className="manager-staffing-stat-card manager-staffing-stat-card--pending">
                <span>Pending</span>
                <strong>{staffingStatus.invited}</strong>
              </div>
              <div className="manager-staffing-stat-card manager-staffing-stat-card--bad">
                <span>Declined / overdue</span>
                <strong>{staffingStatus.declined}</strong>
              </div>
            </div>
            <p className="manager-staffing-stat-footnote">
              Counts are <strong>unique people</strong> (not raw invitation records), so the same person
              is not double-counted.
            </p>
            {(staffingStatus.overOpenInvites ?? 0) > 0 ? (
              <p className="manager-staffing-capacity-note" role="status">
                There are more people with a pending or accepted invite than this activity has seats
                (by {staffingStatus.overOpenInvites}). This can happen after a seat reduction,
                replacements, or multiple overlapping invites — coordinate with HR if needed.
              </p>
            ) : null}

            {canSendRosterToHr ? (
              <div className="manager-roster-hr-actions">
                <p className="manager-roster-hr-actions__text">
                  Every seat has accepted. Notify HR so they can open the manager list and run{" "}
                  <strong>final validation</strong> to start the activity.
                </p>
                <button
                  type="button"
                  className="manager-roster-hr-actions__btn"
                  disabled={sendingRosterToHr}
                  onClick={() => void handleSendRosterToHr()}
                >
                  {sendingRosterToHr ? "Sending…" : "Send to HR"}
                </button>
              </div>
            ) : null}
            {activity?.rosterReadyForHrAt && !activity.hrFinalLaunchAt ? (
              <p className="manager-roster-hr-waiting" role="status">
                Sent to HR — waiting for final validation. You will see &quot;In progress&quot; here once HR
                starts the activity.
              </p>
            ) : null}
            {activity?.hrFinalLaunchAt || activity?.status === "IN_PROGRESS" ? (
              <p className="manager-roster-hr-live" role="status">
                This activity is <strong>in progress</strong>.
              </p>
            ) : null}
          </section>
        ) : null}

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
                const invForRow = staffingStatus
                  ? latestInvitationForEmployee(
                      staffingStatus.invitations || [],
                      candidate.employeeId
                    )
                  : undefined;

                return (
                  <div key={candidate.employeeId} className="manager-candidate-wrap">
                    <div className="manager-candidate-row">
                      <div className="manager-candidate-row__avatar">
                        {candidate.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="manager-candidate-row__body">
                        <div className="manager-candidate-row__top">
                          <h3 className="manager-candidate-row__name">{candidate.name}</h3>
                          <div className="manager-candidate-row__badges">
                            {renderInviteBadge(invForRow)}
                            <span className="manager-candidate-row__score">
                              {candidate.finalScore}/100
                            </span>
                          </div>
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
                    {renderDeclinedReplacement(invForRow)}
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
                const invForRow = staffingStatus
                  ? latestInvitationForEmployee(
                      staffingStatus.invitations || [],
                      candidate.employeeId
                    )
                  : undefined;
                return (
                  <div key={candidate.employeeId} className="manager-candidate-wrap">
                    <div className="manager-candidate-row">
                      <div className="manager-candidate-row__avatar manager-candidate-row__avatar--backup">
                        {candidate.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="manager-candidate-row__body">
                        <div className="manager-candidate-row__top">
                          <h3 className="manager-candidate-row__name">{candidate.name}</h3>
                          <div className="manager-candidate-row__badges">
                            {renderInviteBadge(invForRow)}
                            <span className="manager-candidate-row__score">
                              {candidate.finalScore}/100
                            </span>
                          </div>
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
                    {renderDeclinedReplacement(invForRow)}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {invitationsOnlyRows.length > 0 ? (
          <section className="manager-review-panel">
            <div className="section-head">
              <h2>Other invited participants</h2>
              <p>Backup or replacement invites not shown in the lists above.</p>
            </div>
            <div className="candidate-list">
              {invitationsOnlyRows.map((inv) => {
                const invId = inv._id || inv.id || inv.employeeId;
                const displayName = inv.employeeName || `Employee ${inv.employeeId.slice(-6)}`;
                return (
                  <div key={invId} className="manager-candidate-wrap">
                    <div className="manager-candidate-row manager-candidate-row--readonly">
                      <div className="manager-candidate-row__avatar manager-candidate-row__avatar--backup">
                        {displayName.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="manager-candidate-row__body">
                        <div className="manager-candidate-row__top">
                          <h3 className="manager-candidate-row__name">{displayName}</h3>
                          <div className="manager-candidate-row__badges">
                            {renderInviteBadge(inv)}
                          </div>
                        </div>
                        <p className="manager-candidate-row__reason">
                          Invitation · respond by {formatInviteDate(inv.responseDeadlineAt)}
                        </p>
                      </div>
                    </div>
                    {renderDeclinedReplacement(inv)}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

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
