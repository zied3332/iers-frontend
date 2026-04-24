import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getActivityById,
  type ActivityRecord,
} from "../../services/activities.service";
import {
  getActivityStaffingStatus,
  getNextBackupCandidates,
} from "../../services/activityInvitations.service";
import {
  getActivityReview,
  saveHrShortlist,
  submitHrShortlistToManager,
} from "../../services/activityReviews.service";
import { getCandidates } from "../../services/hrCopilot.service";
import type { CandidateItem } from "../../types/hr-copilot";
import type { ActivityReviewRecord } from "../../types/activity-review";
import type {
  ActivityInvitationItem,
  ActivityStaffingStatusResponse,
} from "../../types/activity-invitations";
import "./ActivityStaffingPage.css";

type CandidateInsight = {
  availability: "Available" | "Busy soon" | "Overloaded";
  workload: "Low" | "Medium" | "High";
  acceptanceChance: number;
  matchedSkills: string[];
  missingSkills: string[];
  previousActivityCount: number;
  managerFit: "Strong" | "Good" | "Average";
  riskLevel: "Low" | "Medium" | "High";
};

type SortOption =
  | "score-desc"
  | "acceptance-desc"
  | "risk-asc"
  | "availability"
  | "name-asc";

const SKILL_BANK = [
  "React",
  "Node.js",
  "TypeScript",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "Communication",
  "Leadership",
  "SQL",
  "Cloud",
  "Problem Solving",
  "Project Delivery",
];

function createSeededNumber(seed: string, min: number, max: number) {
  const seedValue = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const value = Math.abs(Math.sin(seedValue) * 10000);
  return Math.floor(min + (value % (max - min + 1)));
}

function getDummyCandidateInsight(candidate: CandidateItem): CandidateInsight {
  const seed = candidate.employeeId || candidate.name || "candidate";
  const availabilityIndex = createSeededNumber(seed + "a", 0, 2);
  const workloadIndex = createSeededNumber(seed + "w", 0, 2);
  const managerFitIndex = createSeededNumber(seed + "m", 0, 2);
  const riskIndex = createSeededNumber(seed + "r", 0, 2);

  const availabilityValues: CandidateInsight["availability"][] = [
    "Available",
    "Busy soon",
    "Overloaded",
  ];
  const workloadValues: CandidateInsight["workload"][] = ["Low", "Medium", "High"];
  const managerFitValues: CandidateInsight["managerFit"][] = [
    "Strong",
    "Good",
    "Average",
  ];
  const riskValues: CandidateInsight["riskLevel"][] = ["Low", "Medium", "High"];

  const matchedSkillsStart = createSeededNumber(seed + "s1", 0, 5);
  const missingSkillsStart = createSeededNumber(seed + "s2", 3, 8);

  return {
    availability: availabilityValues[availabilityIndex],
    workload: workloadValues[workloadIndex],
    acceptanceChance: createSeededNumber(seed + "acc", 55, 96),
    matchedSkills: [
      SKILL_BANK[matchedSkillsStart % SKILL_BANK.length],
      SKILL_BANK[(matchedSkillsStart + 1) % SKILL_BANK.length],
      SKILL_BANK[(matchedSkillsStart + 2) % SKILL_BANK.length],
    ],
    missingSkills: [
      SKILL_BANK[missingSkillsStart % SKILL_BANK.length],
      SKILL_BANK[(missingSkillsStart + 1) % SKILL_BANK.length],
    ],
    previousActivityCount: createSeededNumber(seed + "p", 0, 7),
    managerFit: managerFitValues[managerFitIndex],
    riskLevel: riskValues[riskIndex],
  };
}

function getRiskOrder(risk: CandidateInsight["riskLevel"]) {
  if (risk === "Low") return 0;
  if (risk === "Medium") return 1;
  return 2;
}

function getAvailabilityOrder(availability: CandidateInsight["availability"]) {
  if (availability === "Available") return 0;
  if (availability === "Busy soon") return 1;
  return 2;
}

export default function ActivityStaffingPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sendingToManager, setSendingToManager] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activityReview, setActivityReview] =
    useState<ActivityReviewRecord | null>(null);
  const [statusData, setStatusData] =
    useState<ActivityStaffingStatusResponse | null>(null);
  const [activityRecord, setActivityRecord] =
    useState<ActivityRecord | null>(null);

  const [primaryCandidates, setPrimaryCandidates] = useState<CandidateItem[]>([]);
  const [backupCandidates, setBackupCandidates] = useState<CandidateItem[]>([]);
  const [availableBackups, setAvailableBackups] = useState<CandidateItem[]>([]);
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState<string[]>([]);
  const [hrInvitationResponseDays, setHrInvitationResponseDays] = useState(3);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);

  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<CandidateItem | null>(null);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showLowRiskOnly, setShowLowRiskOnly] = useState(false);

  const loadPage = async () => {
    if (!activityId) return;

    try {
      setError("");
      setLoading(true);

      const [staffing, recommendations, nextBackups, review, activity] =
        await Promise.all([
          getActivityStaffingStatus(activityId),
          getCandidates(activityId),
          getNextBackupCandidates(activityId, 10),
          getActivityReview(activityId),
          getActivityById(activityId),
        ]);

      setStatusData(staffing);
      setActivityRecord(activity);
      setActivityReview(review);
      setHrInvitationResponseDays(staffing.hrInvitationResponseDays ?? 3);

      const primaries = recommendations.primaryCandidates || [];
      setPrimaryCandidates(primaries);
      setBackupCandidates(recommendations.backupCandidates || []);
      setAvailableBackups(nextBackups.availableBackups || []);

      if (review?.hrSelectedEmployeeIds?.length) {
        setSelectedPrimaryIds(review.hrSelectedEmployeeIds);
      } else if (primaries.length > 0) {
        setSelectedPrimaryIds(primaries.map((c) => c.employeeId));
      } else {
        setSelectedPrimaryIds([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to load staffing dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [activityId]);

  const listSentToManager = useMemo(() => {
    const s = activityReview?.status;
    return s === "SUBMITTED_TO_MANAGER" || s === "APPROVED_BY_MANAGER";
  }, [activityReview?.status]);

  const staffingLocked = useMemo(() => {
    if (!activityRecord) return false;
    return Boolean(
      activityRecord.hrFinalLaunchAt ||
        activityRecord.status === "IN_PROGRESS" ||
        activityRecord.workflowStatus === "IN_PROGRESS"
    );
  }, [activityRecord]);

  const rosterReadyAwaitingHr = Boolean(
    activityRecord?.rosterReadyForHrAt && !activityRecord?.hrFinalLaunchAt
  );

  const invitedEmployeeIds = useMemo(() => {
    return new Set((statusData?.invitations || []).map((inv) => inv.employeeId));
  }, [statusData]);

  const togglePrimarySelection = (employeeId: string) => {
    setSelectedPrimaryIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleCompareSelection = (employeeId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), employeeId];
      }
      return [...prev, employeeId];
    });
  };

  const openCandidateInsights = (candidate: CandidateItem) => {
    setActiveCandidate(candidate);
    setShowInsightsModal(true);
  };

  const handleSelectAll = () => {
    setSelectedPrimaryIds(primaryCandidates.map((c) => c.employeeId));
  };

  const handleSelectTopSeats = () => {
    if (!statusData) return;
    const topIds = [...primaryCandidates]
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
      .slice(0, statusData.seatsRequired)
      .map((c) => c.employeeId);
    setSelectedPrimaryIds(topIds);
  };

  const handleClearSelection = () => {
    setSelectedPrimaryIds([]);
  };

  const handleClearCompare = () => {
    setCompareIds([]);
  };

  const handleSendToManager = async () => {
    if (staffingLocked) return;

    if (!activityId || selectedPrimaryIds.length === 0) {
      setError("Select at least one employee before sending to manager.");
      return;
    }

    if (listSentToManager) return;

    if (qualityCheckIssues.length > 0) {
     console.warn("Sending with warnings:", qualityCheckIssues);
    
    }

    try {
      setSendingToManager(true);
      setError("");
      setSuccess("");

      const hrNote = `Sent to manager for approval on ${new Date().toLocaleDateString()}`;

      await saveHrShortlist(activityId, {
        employeeIds: selectedPrimaryIds,
        hrNote,
        hrInvitationResponseDays,
      });

      const submitResult = await submitHrShortlistToManager(activityId);

      if (submitResult?.review) {
        setActivityReview(submitResult.review);
      }

      setSuccess("Shortlist sent to manager successfully.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to send candidates to manager.");
    } finally {
      setSendingToManager(false);
    }
  };

  const seatItems = useMemo(() => {
    if (!statusData) return [];

    const items: Array<{
      label: string;
      state: "accepted" | "invited" | "declined" | "replaced" | "empty";
    }> = [];

    for (let i = 0; i < statusData.accepted; i++) {
      items.push({ label: `A${i + 1}`, state: "accepted" });
    }

    for (let i = 0; i < statusData.invited; i++) {
      items.push({ label: `P${i + 1}`, state: "invited" });
    }

    for (let i = 0; i < statusData.declined; i++) {
      items.push({ label: `D${i + 1}`, state: "declined" });
    }

    for (let i = 0; i < (statusData.replaced ?? 0); i++) {
      items.push({ label: `R${i + 1}`, state: "replaced" });
    }

    for (let i = 0; i < statusData.emptySeats; i++) {
      items.push({ label: `E${i + 1}`, state: "empty" });
    }

    return items;
  }, [statusData]);

  const topPrimaryCandidates = primaryCandidates.slice(0, 3);

  const compareCandidates = useMemo(() => {
    return primaryCandidates.filter((candidate) =>
      compareIds.includes(candidate.employeeId)
    );
  }, [compareIds, primaryCandidates]);

  const activeCandidateInsight = useMemo(() => {
    if (!activeCandidate) return null;
    return getDummyCandidateInsight(activeCandidate);
  }, [activeCandidate]);

  const qualityCheckIssues = useMemo(() => {
    if (!statusData) return [];

    const issues: string[] = [];

    if (selectedPrimaryIds.length === 0) {
      issues.push("No candidate selected.");
    }

    if (selectedPrimaryIds.length < statusData.seatsRequired) {
      issues.push(
        `Selected candidates are fewer than required seats (${statusData.seatsRequired}).`
      );
    }

    const selectedCandidates = primaryCandidates.filter((candidate) =>
      selectedPrimaryIds.includes(candidate.employeeId)
    );

    const overloadedCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.availability === "Overloaded" || insight.workload === "High";
    }).length;

    if (overloadedCount > 0) {
      issues.push(`${overloadedCount} selected candidate(s) show high workload risk.`);
    }

    const lowAcceptanceCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.acceptanceChance < 65;
    }).length;

    if (lowAcceptanceCount > 0) {
      issues.push(
        `${lowAcceptanceCount} selected candidate(s) have low acceptance probability.`
      );
    }

    if (backupCandidates.length === 0 && statusData.emptySeats > 0) {
      issues.push("No backup recommendations available for open seats.");
    }

    return issues;
  }, [backupCandidates.length, primaryCandidates, selectedPrimaryIds, statusData]);

  const qualityCheckOk = qualityCheckIssues.length === 0;

  const recommendedAction = useMemo(() => {
    if (!statusData) return "Review the shortlist before sending.";
    if (selectedPrimaryIds.length === 0) {
      return "Select candidates to start building the shortlist.";
    }
    if (selectedPrimaryIds.length < statusData.seatsRequired) {
      return `Add ${statusData.seatsRequired - selectedPrimaryIds.length} more candidate(s) to cover all seats.`;
    }

    const selectedCandidates = primaryCandidates.filter((candidate) =>
      selectedPrimaryIds.includes(candidate.employeeId)
    );

    const highRiskCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.riskLevel === "High";
    }).length;

    if (highRiskCount > 0) {
      return `Consider replacing ${highRiskCount} high-risk selected candidate(s).`;
    }

    const lowAcceptanceCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.acceptanceChance < 65;
    }).length;

    if (lowAcceptanceCount > 0) {
      return "Consider adding one stronger backup because acceptance confidence is low.";
    }

    return "Shortlist looks strong and ready for manager review.";
  }, [primaryCandidates, selectedPrimaryIds, statusData]);

  const selectedCandidates = useMemo(() => {
    return primaryCandidates.filter((candidate) =>
      selectedPrimaryIds.includes(candidate.employeeId)
    );
  }, [primaryCandidates, selectedPrimaryIds]);

  const shortlistSummary = useMemo(() => {
    const avgScore =
      selectedCandidates.length > 0
        ? Math.round(
            selectedCandidates.reduce((sum, candidate) => sum + (candidate.finalScore ?? 0), 0) /
              selectedCandidates.length
          )
        : 0;

    const availableCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.availability === "Available";
    }).length;

    const lowRiskCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.riskLevel === "Low";
    }).length;

    const likelyAcceptCount = selectedCandidates.filter((candidate) => {
      const insight = getDummyCandidateInsight(candidate);
      return insight.acceptanceChance >= 75;
    }).length;

    return {
      selectedCount: selectedCandidates.length,
      avgScore,
      availableCount,
      lowRiskCount,
      likelyAcceptCount,
      missingSeats: Math.max(0, (statusData?.seatsRequired ?? 0) - selectedCandidates.length),
    };
  }, [selectedCandidates, statusData?.seatsRequired]);

  const filteredPrimaryCandidates = useMemo(() => {
    let candidates = [...primaryCandidates];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      candidates = candidates.filter((candidate) =>
        candidate.name?.toLowerCase().includes(q)
      );
    }

    if (showSelectedOnly) {
      candidates = candidates.filter((candidate) =>
        selectedPrimaryIds.includes(candidate.employeeId)
      );
    }

    if (showAvailableOnly) {
      candidates = candidates.filter((candidate) => {
        const insight = getDummyCandidateInsight(candidate);
        return insight.availability === "Available";
      });
    }

    if (showLowRiskOnly) {
      candidates = candidates.filter((candidate) => {
        const insight = getDummyCandidateInsight(candidate);
        return insight.riskLevel === "Low";
      });
    }

    candidates.sort((a, b) => {
      const insightA = getDummyCandidateInsight(a);
      const insightB = getDummyCandidateInsight(b);

      switch (sortBy) {
        case "acceptance-desc":
          return insightB.acceptanceChance - insightA.acceptanceChance;
        case "risk-asc":
          return getRiskOrder(insightA.riskLevel) - getRiskOrder(insightB.riskLevel);
        case "availability":
          return getAvailabilityOrder(insightA.availability) - getAvailabilityOrder(insightB.availability);
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "score-desc":
        default:
          return (b.finalScore ?? 0) - (a.finalScore ?? 0);
      }
    });

    return candidates;
  }, [
    primaryCandidates,
    searchTerm,
    selectedPrimaryIds,
    showAvailableOnly,
    showLowRiskOnly,
    showSelectedOnly,
    sortBy,
  ]);

  const formatDateTime = (value?: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  };

  const modalCardStyle: React.CSSProperties = {
    width: "min(920px, 100%)",
    maxHeight: "85vh",
    overflow: "auto",
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
    padding: 24,
  };

  const modalHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  };

  const closeBtnStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
  };

  const getAvailabilityTone = (candidate: CandidateItem) => {
    const insight = getDummyCandidateInsight(candidate);
    if (insight.availability === "Available") return "#166534";
    if (insight.availability === "Busy soon") return "#b45309";
    return "#b91c1c";
  };

  const getRiskBadgeStyles = (risk: CandidateInsight["riskLevel"]) => {
    if (risk === "Low") {
      return { background: "#ecfdf3", color: "#166534" };
    }
    if (risk === "Medium") {
      return { background: "#fff7ed", color: "#b45309" };
    }
    return { background: "#fef2f2", color: "#b91c1c" };
  };

  return (
    <div className="activity-staffing-page">
      <div className="staffing-shell">
        <div className="staffing-header">
          <div>
            <span className="staffing-kicker">HR staffing</span>
            <h1>{statusData?.activityTitle || "Loading activity..."}</h1>
            {!loading && statusData ? (
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14 }}>
                {selectedPrimaryIds.length} selected • {compareCandidates.length} in compare •{" "}
                {qualityCheckOk ? "Ready to send" : "Needs attention"}
              </p>
            ) : null}
          </div>

          {!loading && statusData ? (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => setShowBackupModal(true)}
              >
                Backups ({backupCandidates.length})
              </button>

              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => setShowPoolModal(true)}
              >
                Pool ({availableBackups.length})
              </button>

              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => setShowInvitationsModal(true)}
              >
                Invitations ({statusData.invitations.length})
              </button>

              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => setShowCompareModal(true)}
                disabled={compareCandidates.length < 2}
              >
                Compare ({compareCandidates.length})
              </button>
            </div>
          ) : null}
        </div>

        {error ? <div className="staffing-error">{error}</div> : null}
        {success ? <div className="staffing-success">{success}</div> : null}

        {staffingLocked ? (
          <div className="staffing-locked-banner" role="status">
            <strong>Activity in progress</strong>
            <p>
              Staffing is closed. Open{" "}
              <Link
                to={`/hr/activities/${activityId}/manager-decisions`}
                className="staffing-inline-link"
              >
                Manager list
              </Link>
              .
            </p>
          </div>
        ) : null}

        {!staffingLocked && rosterReadyAwaitingHr ? (
          <div className="staffing-roster-ready-banner" role="status">
            <strong>Roster ready</strong>
            <p>
              Open{" "}
              <Link
                to={`/hr/activities/${activityId}/manager-decisions`}
                className="staffing-inline-link"
              >
                Manager list
              </Link>{" "}
              and run final validation.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="staffing-loading-card">Loading staffing dashboard...</div>
        ) : !statusData ? (
          <div className="staffing-loading-card">No activity data found.</div>
        ) : (
          <>
            <div
              className="staffing-stats-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
            >
              <div className="staffing-stat-card">
                <span>Seats</span>
                <strong>{statusData.seatsRequired}</strong>
              </div>
              <div className="staffing-stat-card accepted">
                <span>Accepted</span>
                <strong>{statusData.accepted}</strong>
              </div>
              <div className="staffing-stat-card invited">
                <span>Pending</span>
                <strong>{statusData.invited}</strong>
              </div>
              <div className="staffing-stat-card declined">
                <span>Declined</span>
                <strong>{statusData.declined}</strong>
              </div>
              <div className="staffing-stat-card empty">
                <span>Selected</span>
                <strong>{selectedPrimaryIds.length}</strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                marginBottom: 18,
                border: qualityCheckOk
                  ? "1px solid rgba(34,197,94,0.22)"
                  : "1px solid rgba(245,158,11,0.28)",
                background: qualityCheckOk
                  ? "color-mix(in srgb, var(--surface-2) 88%, #22c55e)"
                  : "color-mix(in srgb, var(--surface-2) 88%, #f59e0b)",
                borderRadius: 20,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Shortlist quality check</h2>
                  <p style={{ margin: "6px 0 0", opacity: 0.76, fontSize: 14 }}>
                    Review risks before sending the shortlist to the manager.
                  </p>
                </div>

                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  background: qualityCheckOk
                    ? "color-mix(in srgb, var(--surface-2) 85%, #22c55e)"
                    : "color-mix(in srgb, var(--surface-2) 85%, #f59e0b)",
                  color: "var(--text)",
                  }}
                >
                  {qualityCheckOk ? "Ready to send" : `${qualityCheckIssues.length} warning(s)`}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  background: "var(--card)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: "var(--text)",
                  border: qualityCheckOk
                    ? "1px solid rgba(34,197,94,0.14)"
                    : "1px solid rgba(245,158,11,0.16)",
                }}
              >
                <strong>Recommended action:</strong> {recommendedAction}
              </div>

              {qualityCheckIssues.length > 0 ? (
                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {qualityCheckIssues.map((issue, index) => (
                    <div
                      key={index}
                      style={{
                        background: "var(--card)",
                        border: "1px solid rgba(245,158,11,0.18)",
                        borderRadius: 14,
                        padding: "10px 12px",
                        fontSize: 14,
                        color: "var(--text)",
                      }}
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    background: "var(--card)",
                    border: "1px solid rgba(34,197,94,0.16)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    fontSize: 14,
                    color: "var(--text)",
                  }}
                >
                  The current shortlist looks balanced and ready for manager review.
                </div>
              )}
            </div>

            <div
              className="staffing-layout"
              style={{
                alignItems: "start",
                gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.95fr)",
              }}
            >
              <section className="staffing-panel">
                <div className="section-head">
                  <div>
                    <h2>Shortlist</h2>
                    <p>Choose who goes to the manager.</p>
                  </div>

                  <div className="selection-actions">
                    <button
                      type="button"
                      className="secondary-staffing-btn"
                      onClick={handleSelectTopSeats}
                      disabled={listSentToManager || staffingLocked}
                    >
                      Select top seats
                    </button>
                    <button
                      type="button"
                      className="secondary-staffing-btn"
                      onClick={handleSelectAll}
                      disabled={listSentToManager || staffingLocked}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="secondary-staffing-btn"
                      onClick={handleClearSelection}
                      disabled={listSentToManager || staffingLocked}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginBottom: 16,
                    gridTemplateColumns: "1.2fr repeat(2, minmax(140px, 1fr))",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search candidate..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      fontSize: 14,
                      outline: "none",
                      background: "var(--card)",
                      color: "var(--text)",
                    }}
                  />

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      fontSize: 14,
                      background: "var(--card)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="score-desc">Sort: Score</option>
                    <option value="acceptance-desc">Sort: Acceptance</option>
                    <option value="risk-asc">Sort: Risk</option>
                    <option value="availability">Sort: Availability</option>
                    <option value="name-asc">Sort: Name</option>
                  </select>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                      padding: "8px 0",
                    }}
                  >
                    <label className="select-checkbox" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={showSelectedOnly}
                        onChange={() => setShowSelectedOnly((prev) => !prev)}
                      />
                      <span>Selected</span>
                    </label>

                    <label className="select-checkbox" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={() => setShowAvailableOnly((prev) => !prev)}
                      />
                      <span>Available</span>
                    </label>

                    <label className="select-checkbox" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={showLowRiskOnly}
                        onChange={() => setShowLowRiskOnly((prev) => !prev)}
                      />
                      <span>Low risk</span>
                    </label>
                  </div>
                </div>

                <div className="candidate-list">
                  {filteredPrimaryCandidates.length === 0 ? (
                    <div className="empty-state-card">
                      No candidates match your current search or filters.
                    </div>
                  ) : (
                    filteredPrimaryCandidates.map((candidate) => {
                      const alreadyInvited = invitedEmployeeIds.has(
                        candidate.employeeId
                      );
                      const selected = selectedPrimaryIds.includes(
                        candidate.employeeId
                      );
                      const compareSelected = compareIds.includes(candidate.employeeId);
                      const selectionLocked =
                        listSentToManager || alreadyInvited || staffingLocked;

                      const insight = getDummyCandidateInsight(candidate);
                      const riskStyles = getRiskBadgeStyles(insight.riskLevel);

                      return (
                        <div
                          key={candidate.employeeId}
                          className="staffing-candidate-card"
                        >
                          <div className="candidate-main-row">
                            <div className="candidate-avatar">
                              {candidate.name?.charAt(0).toUpperCase() || "U"}
                            </div>

                            <div className="candidate-info">
                              <div className="candidate-title-row">
                                <h3>{candidate.name}</h3>
                                <span className="score-badge">
                                  {candidate.finalScore}/100
                                </span>
                              </div>

                              <p>{candidate.shortReason}</p>

                              <div className="mini-chip-row">
                                <span
                                  style={{
                                    background: "#f8fafc",
                                    color: getAvailabilityTone(candidate),
                                    borderRadius: 999,
                                    padding: "4px 8px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {insight.availability}
                                </span>
                                <span
                                  style={{
                                    background: riskStyles.background,
                                    color: riskStyles.color,
                                    borderRadius: 999,
                                    padding: "4px 8px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Risk {insight.riskLevel}
                                </span>
                                <span
                                  style={{
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: 999,
                                    padding: "4px 8px",
                                    fontWeight: 700,
                                  }}
                                >
                                  {insight.acceptanceChance}% accept
                                </span>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  flexWrap: "wrap",
                                  marginTop: 10,
                                  color: "var(--muted)",
                                  fontSize: 13,
                                }}
                              >
                                <span>Rank #{candidate.rank}</span>
                                <span>{candidate.recommendationType}</span>
                                <span>{insight.workload} workload</span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="candidate-actions-row"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <label className="select-checkbox">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={selectionLocked}
                                onChange={() =>
                                  togglePrimarySelection(candidate.employeeId)
                                }
                              />
                              <span>
                                {listSentToManager
                                  ? "Already sent"
                                  : alreadyInvited
                                  ? "Already invited"
                                  : "Select"}
                              </span>
                            </label>

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                className="secondary-staffing-btn"
                                onClick={() => toggleCompareSelection(candidate.employeeId)}
                              >
                                {compareSelected ? "Compared" : "Compare"}
                              </button>

                              <button
                                type="button"
                                className="secondary-staffing-btn"
                                onClick={() => openCandidateInsights(candidate)}
                              >
                                Insights
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {staffingLocked ? (
                  <button
                    type="button"
                    className="primary-staffing-btn"
                    onClick={() =>
                      navigate(`/hr/activities/${activityId}/manager-decisions`)
                    }
                  >
                    View manager list
                  </button>
                ) : listSentToManager ? (
                  <button
                    type="button"
                    className="primary-staffing-btn"
                    onClick={() =>
                      navigate(`/hr/activities/${activityId}/manager-decisions`)
                    }
                  >
                    Open manager list
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-staffing-btn"
                    onClick={handleSendToManager}
                    disabled={
                      sendingToManager || selectedPrimaryIds.length === 0 
                    }
                  >
                    {sendingToManager ? "Sending..." : "Send to manager"}
                  </button>
                )}
              </section>

              <aside
                className="staffing-panel"
                style={{ display: "grid", gap: 16, alignSelf: "start" }}
              >
                <div>
                  <div className="section-head" style={{ marginBottom: 10 }}>
                    <h2>Overview</h2>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 18,
                        padding: 16,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                      >
                        Response deadline
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="number"
                          min={1}
                          max={365}
                          disabled={listSentToManager || staffingLocked}
                          value={hrInvitationResponseDays}
                          onChange={(e) =>
                            setHrInvitationResponseDays(
                              Math.max(1, Math.min(365, Number(e.target.value) || 1))
                            )
                          }
                          style={{
                            width: 86,
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            padding: "10px 12px",
                            fontSize: 14,
                            background: "var(--surface-2)",
                            color: "var(--text)",
                          }}
                        />
                        <span style={{ fontSize: 14, opacity: 0.7 }}>days</span>
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 18,
                        padding: 16,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          opacity: 0.7,
                          marginBottom: 10,
                        }}
                      >
                        Shortlist summary
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Selected</div>
                          <strong>{shortlistSummary.selectedCount}</strong>
                        </div>
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Avg score</div>
                          <strong>{shortlistSummary.avgScore}</strong>
                        </div>
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Available</div>
                          <strong>{shortlistSummary.availableCount}</strong>
                        </div>
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Low risk</div>
                          <strong>{shortlistSummary.lowRiskCount}</strong>
                        </div>
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Likely accept</div>
                          <strong>{shortlistSummary.likelyAcceptCount}</strong>
                        </div>
                        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Missing seats</div>
                          <strong>{shortlistSummary.missingSeats}</strong>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 18,
                        padding: 16,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          opacity: 0.7,
                          marginBottom: 10,
                        }}
                      >
                        Seat board
                      </div>

                      <div className="seat-grid">
                        {seatItems.map((seat) => (
                          <div
                            key={seat.label}
                            className={`seat-box ${seat.state}`}
                            title={seat.state}
                          >
                            {seat.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 18,
                        padding: 16,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          opacity: 0.7,
                          marginBottom: 10,
                        }}
                      >
                        Top matches
                      </div>

                      {topPrimaryCandidates.length === 0 ? (
                        <div style={{ fontSize: 14, opacity: 0.7 }}>
                          No candidates.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {topPrimaryCandidates.map((candidate) => {
                            const insight = getDummyCandidateInsight(candidate);

                            return (
                              <div
                                key={candidate.employeeId}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  alignItems: "center",
                                  border: "1px solid var(--border)",
                                  borderRadius: 14,
                                  padding: "12px 14px",
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 14,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {candidate.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.7,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    Rank #{candidate.rank} • {insight.acceptanceChance}% accept
                                  </div>
                                </div>
                                <span className="score-badge">
                                  {candidate.finalScore}/100
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.22)",
                        borderRadius: 18,
                        padding: 16,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            opacity: 0.7,
                          }}
                        >
                          Compare queue
                        </div>

                        {compareCandidates.length > 0 ? (
                          <button
                            type="button"
                            className="secondary-staffing-btn"
                            onClick={handleClearCompare}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>

                      {compareCandidates.length === 0 ? (
                        <div style={{ fontSize: 14, opacity: 0.7 }}>
                          Select 2 or 3 candidates to compare.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {compareCandidates.map((candidate) => (
                            <div
                              key={candidate.employeeId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: "10px 12px",
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {candidate.name}
                              </div>
                              <button
                                type="button"
                                className="secondary-staffing-btn"
                                onClick={() => setShowCompareModal(true)}
                              >
                                Open
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {showBackupModal ? (
        <div style={modalOverlayStyle} onClick={() => setShowBackupModal(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Backup recommendations</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                  Extra candidates for manager adjustments.
                </p>
              </div>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={() => setShowBackupModal(false)}
              >
                Close
              </button>
            </div>

            <div className="candidate-list">
              {backupCandidates.length === 0 ? (
                <div className="empty-state-card">No backup recommendations.</div>
              ) : (
                backupCandidates.map((candidate) => {
                  const insight = getDummyCandidateInsight(candidate);

                  return (
                    <div
                      key={candidate.employeeId}
                      className="staffing-candidate-card"
                    >
                      <div className="candidate-main-row">
                        <div className="candidate-avatar">
                          {candidate.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="candidate-info">
                          <div className="candidate-title-row">
                            <h3>{candidate.name}</h3>
                            <span className="score-badge">
                              {candidate.finalScore}/100
                            </span>
                          </div>

                          <p>{candidate.shortReason}</p>

                          <div className="mini-chip-row">
                            <span>#{candidate.rank}</span>
                            <span>{candidate.recommendationType}</span>
                            <span>{insight.availability}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showPoolModal ? (
        <div style={modalOverlayStyle} onClick={() => setShowPoolModal(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Available backup pool</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                  Wider replacement options.
                </p>
              </div>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={() => setShowPoolModal(false)}
              >
                Close
              </button>
            </div>

            <div className="candidate-list">
              {availableBackups.length === 0 ? (
                <div className="empty-state-card">No backup pool available.</div>
              ) : (
                availableBackups.map((candidate) => {
                  const insight = getDummyCandidateInsight(candidate);

                  return (
                    <div
                      key={candidate.employeeId}
                      className="staffing-candidate-card"
                    >
                      <div className="candidate-main-row">
                        <div className="candidate-avatar">
                          {candidate.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="candidate-info">
                          <div className="candidate-title-row">
                            <h3>{candidate.name}</h3>
                            <span className="score-badge">
                              {candidate.finalScore}/100
                            </span>
                          </div>

                          <p>{candidate.shortReason}</p>

                          <div className="mini-chip-row">
                            <span>{insight.workload} workload</span>
                            <span>{insight.acceptanceChance}% accept</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showInvitationsModal ? (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowInvitationsModal(false)}
        >
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Current invitations</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                  Existing invitation records in the system.
                </p>
              </div>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={() => setShowInvitationsModal(false)}
              >
                Close
              </button>
            </div>

            {statusData?.invitations?.length ? (
              <div className="invitation-list">
                {statusData.invitations.map(
                  (invitation: ActivityInvitationItem, index) => (
                    <div
                      key={invitation._id || invitation.id || index}
                      className="invitation-card"
                    >
                      <div className="candidate-title-row">
                        <h3>
                          {invitation.employeeName ||
                            `Employee ID: ${invitation.employeeId}`}
                        </h3>
                        <span
                          className={`status-badge ${invitation.status.toLowerCase()}`}
                        >
                          {invitation.status}
                        </span>
                      </div>

                      <p>Invited at: {formatDateTime(invitation.invitedAt)}</p>

                      {invitation.declineReason ? (
                        <p className="decline-reason">
                          Decline reason: {invitation.declineReason}
                        </p>
                      ) : null}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="empty-state-card">No invitations yet.</div>
            )}
          </div>
        </div>
      ) : null}

      {showInsightsModal && activeCandidate && activeCandidateInsight ? (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowInsightsModal(false)}
        >
          <div
            style={{ ...modalCardStyle, width: "min(760px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>{activeCandidate.name}</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                  AI explanation panel
                </p>
              </div>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={() => setShowInsightsModal(false)}
              >
                Close
              </button>
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--surface-2)",
                color: "var(--text)",
                fontSize: 14,
                border: "1px solid var(--border)",
              }}
            >
              Good fit with <strong>{activeCandidateInsight.managerFit.toLowerCase()}</strong> manager alignment,{" "}
              <strong>{activeCandidateInsight.acceptanceChance}%</strong> acceptance chance, and{" "}
              <strong>{activeCandidateInsight.workload.toLowerCase()}</strong> workload pressure.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>Availability</div>
                <strong>{activeCandidateInsight.availability}</strong>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>Workload</div>
                <strong>{activeCandidateInsight.workload}</strong>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>Acceptance chance</div>
                <strong>{activeCandidateInsight.acceptanceChance}%</strong>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>Manager fit</div>
                <strong>{activeCandidateInsight.managerFit}</strong>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 10 }}>Matched skills</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activeCandidateInsight.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: "#ecfdf3",
                        color: "#166534",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 10 }}>Skill gaps</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activeCandidateInsight.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        background: "#fff7ed",
                        color: "#b45309",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Activity history</h3>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Participated in {activeCandidateInsight.previousActivityCount} similar
                activity{activeCandidateInsight.previousActivityCount === 1 ? "" : "ies"}.
              </p>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => {
                  if (activeCandidate) {
                    setSelectedPrimaryIds((prev) =>
                      prev.includes(activeCandidate.employeeId)
                        ? prev
                        : [...prev, activeCandidate.employeeId]
                    );
                  }
                }}
              >
                Select candidate
              </button>

              <button
                type="button"
                className="secondary-staffing-btn"
                onClick={() => {
                  if (activeCandidate) {
                    toggleCompareSelection(activeCandidate.employeeId);
                  }
                }}
              >
                Add to compare
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCompareModal ? (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowCompareModal(false)}
        >
          <div
            style={{ ...modalCardStyle, width: "min(1100px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0 }}>Candidate comparison</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                  Compare shortlist candidates side by side.
                </p>
              </div>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={() => setShowCompareModal(false)}
              >
                Close
              </button>
            </div>

            {compareCandidates.length < 2 ? (
              <div className="empty-state-card">
                Select at least 2 candidates from the shortlist to compare.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${compareCandidates.length}, minmax(0, 1fr))`,
                  gap: 16,
                }}
              >
                {compareCandidates.map((candidate) => {
                  const insight = getDummyCandidateInsight(candidate);

                  return (
                    <div
                      key={candidate.employeeId}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        padding: 18,
                        background: "var(--card)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <h3 style={{ margin: 0 }}>{candidate.name}</h3>
                          <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
                            Rank #{candidate.rank}
                          </p>
                        </div>
                        <span className="score-badge">{candidate.finalScore}/100</span>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Availability:</strong> {insight.availability}
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Workload:</strong> {insight.workload}
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Acceptance chance:</strong> {insight.acceptanceChance}%
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Manager fit:</strong> {insight.managerFit}
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Risk:</strong> {insight.riskLevel}
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Matched skills:</strong>
                          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {insight.matchedSkills.map((skill) => (
                              <span
                                key={skill}
                                style={{
                                  background: "#ecfdf3",
                                  color: "#166534",
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          <strong>Missing skills:</strong>
                          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {insight.missingSkills.map((skill) => (
                              <span
                                key={skill}
                                style={{
                                  background: "#fff7ed",
                                  color: "#b45309",
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}