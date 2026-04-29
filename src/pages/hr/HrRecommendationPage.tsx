import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getActivityById,
  type ActivityRecord,
} from "../../services/activities.service";
import {
  getFinalRecommendations,
  type RecommendationDecision,
  type RecommendationFinalResponse,
  type RecommendationItem,
} from "../../services/recommendations.service";
import {
  getActivityReview,
  saveHrShortlist,
  submitHrShortlistToManager,
} from "../../services/activityReviews.service";
import "./HrRecommendationPage.css";

type ViewMode = "table" | "cards";
type FilterMode = "ALL" | RecommendationDecision;

type UiRecommendationItem = RecommendationItem & {
  reviewEmployeeId?: string;
};

type UiRecommendationFinalResponse = RecommendationFinalResponse & {
  primaryCandidates: UiRecommendationItem[];
  backupCandidates: UiRecommendationItem[];
  notRecommendedCandidates: UiRecommendationItem[];
};



function percent(value: number) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function decisionLabel(decision: RecommendationDecision | "ALL") {
  if (decision === "ALL") return "All";
  if (decision === "POSSIBLE_WITH_GAP") return "Possible with gap";
  if (decision === "NOT_RECOMMENDED") return "Not recommended";
  return "Recommended";
}



function isMongoId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

function getCandidateKey(candidate: UiRecommendationItem) {
  return String(candidate.reviewEmployeeId || candidate.employeeId);
}

function normalizeFinalResponse(
  result: RecommendationFinalResponse
): UiRecommendationFinalResponse {
  const attachCandidate = (
    candidate: RecommendationItem
  ): UiRecommendationItem => {
    const employeeId = String(candidate.employeeId);

    return {
      ...candidate,
      employeeId,
      reviewEmployeeId: employeeId,
    };
  };

  return {
    ...result,
    primaryCandidates: result.primaryCandidates.map(attachCandidate),
    backupCandidates: result.backupCandidates.map(attachCandidate),
    notRecommendedCandidates:
      result.notRecommendedCandidates.map(attachCandidate),
  };
}

export default function HrRecommendationPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAiLoader, setShowAiLoader] = useState(false);
  const [data, setData] = useState<UiRecommendationFinalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingToManager, setSendingToManager] = useState(false);
  const [sentToManager, setSentToManager] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>("");


  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [view, setView] = useState<ViewMode>("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] =
    useState<UiRecommendationItem | null>(null);

  const managerApproved = reviewStatus === "APPROVED_BY_MANAGER";

  const reviewAlreadySent =
    reviewStatus === "SUBMITTED_TO_MANAGER" ||
    reviewStatus === "APPROVED_BY_MANAGER";

  useEffect(() => {
    if (!activityId) return;

    async function loadInitialData() {
      try {
        setActivityLoading(true);
        setError("");

        const [activityResult, reviewResult] = await Promise.allSettled([
          getActivityById(activityId),
          getActivityReview(activityId),
        ]);

        if (activityResult.status === "fulfilled") {
          setActivity(activityResult.value);
        }

        if (reviewResult.status === "fulfilled" && reviewResult.value) {
          const status = String(reviewResult.value.status || "");
          setReviewStatus(status);

          if (
            status === "SUBMITTED_TO_MANAGER" ||
            status === "APPROVED_BY_MANAGER"
          ) {
            setSentToManager(true);
          }

          if (status === "APPROVED_BY_MANAGER") {
            setSuccess(
              "Manager approved this shortlist. Waiting for HR final acceptance."
            );
          } else if (status === "SUBMITTED_TO_MANAGER") {
            setSuccess("Shortlist sent. Waiting for manager review.");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load activity details.");
      } finally {
        setActivityLoading(false);
      }
    }

    loadInitialData();
  }, [activityId]);

  const allCandidates = useMemo(() => {
    if (!data) return [];

    return [
      ...data.primaryCandidates,
      ...data.backupCandidates,
      ...data.notRecommendedCandidates,
    ];
  }, [data]);

  const filteredCandidates = useMemo(() => {
    if (filter === "ALL") return allCandidates;
    return allCandidates.filter((candidate) => candidate.decision === filter);
  }, [allCandidates, filter]);

  const selectedCandidates = useMemo(() => {
    return allCandidates.filter((candidate) =>
      selectedIds.includes(getCandidateKey(candidate))
    );
  }, [allCandidates, selectedIds]);

async function runRecommendation() {
  if (
    !activityId ||
    loading ||
    sendingToManager ||
    sentToManager ||
    reviewAlreadySent
  ) {
    return;
  }

  try {
    setError("");
    setSuccess("");
    setData(null);
    setSelectedIds([]);
    setSentToManager(false);

    setLoading(true);
    setShowAiLoader(true); // ✅ ONLY loader now

    const result = await getFinalRecommendations(activityId);
    const fixedResult = normalizeFinalResponse(result);

    setData(fixedResult);

    setSelectedIds(
      fixedResult.primaryCandidates.map((candidate) =>
        getCandidateKey(candidate)
      )
    );
  } catch (err: any) {
    setError(err?.message || "Failed to generate recommendations.");
  } finally {
    setShowAiLoader(false); // ✅ stop loader
    setLoading(false);
  }
}

  function toggleCandidate(candidateId: string) {
    if (sentToManager || sendingToManager || reviewAlreadySent) return;

    setSelectedIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  }

  function selectTopSeats() {
    if (!data || sentToManager || sendingToManager || reviewAlreadySent) return;

    setSelectedIds(
      data.primaryCandidates
        .slice(0, data.seats)
        .map((candidate) => getCandidateKey(candidate))
    );
  }

  function clearSelection() {
    if (sentToManager || sendingToManager || reviewAlreadySent) return;
    setSelectedIds([]);
  }

  function goToManagerList() {
    navigate(`/hr/activities/${activityId}/manager-decisions`);
  }

  async function handleSendToManager() {
    if (!activityId || !data || sendingToManager || reviewAlreadySent) return;

    if (selectedIds.length === 0) {
      setError("Select at least one employee before sending to manager.");
      return;
    }

    try {
      setSendingToManager(true);
      setError("");
      setSuccess("");

      const employeeIds = selectedIds.filter(isMongoId);

 await saveHrShortlist(activityId, {
  employeeIds,
  candidateSnapshots: selectedCandidates.map((c) => ({
    employeeId: c.employeeId,
    fullName: c.fullName,
    email: c.email,
    finalScore: c.finalScore,
    decision: c.decision,
    rank: c.rank,
    breakdown: c.breakdown,
    strengths: c.strengths,
    risks: c.risks,
    explanation: c.explanation,
    nextAction: c.nextAction,
  })),
  hrNote: `Sent to manager for approval on ${new Date().toLocaleDateString()}`,
  hrInvitationResponseDays: 3,
});
      const submitResult = await submitHrShortlistToManager(activityId);

      setSentToManager(true);
      setReviewStatus(submitResult?.review?.status || "SUBMITTED_TO_MANAGER");
      setSuccess("Shortlist sent to manager. Waiting for manager review.");
    } catch (err: any) {
      console.error("SEND ERROR:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to send shortlist to manager."
      );
    } finally {
      setSendingToManager(false);
    }
  }

  return (
    <main className="hr-rec-page">
      <section className="hr-rec-hero">
        <div>
          <div className="hr-rec-eyebrow">HR Recommendation Engine</div>
          <h1>{activity?.title || "Activity Staffing Recommendation"}</h1>
          <p>
            {managerApproved
              ? "Manager approved this shortlist. HR can now review the manager list."
              : sentToManager
              ? "Shortlist is locked and waiting for manager review."
              : "Generate a shortlist, review candidate fit, and prepare seats for manager validation."}
          </p>
        </div>

        <div className="hr-rec-hero-actions">
          {reviewAlreadySent ? (
            <button
              className="hr-rec-btn hr-rec-btn-primary"
              onClick={goToManagerList}
            >
              See manager list
            </button>
          ) : (
            <button
              className="hr-rec-btn hr-rec-btn-primary"
              onClick={runRecommendation}
              disabled={loading || sendingToManager || activityLoading}
            >
              {loading
                ? "Analyzing..."
                : data
                ? "Regenerate"
                : "Generate recommendation"}
            </button>
          )}
        </div>
      </section>

      {error ? <div className="hr-rec-alert danger">{error}</div> : null}
      {success ? <div className="hr-rec-alert success">{success}</div> : null}

      {managerApproved ? (
        <div className="hr-rec-alert info">
          Manager approved the shortlist. The recommendation engine is locked.
          Open the manager list to continue final HR validation.
        </div>
      ) : sentToManager ? (
        <div className="hr-rec-alert info">
          Shortlist has been sent to manager. Candidate editing is disabled.
        </div>
      ) : null}

      <div className="hr-rec-layout">
        <aside className="hr-rec-side">
          <ActivityPanel
            activity={activity}
            activityLoading={activityLoading}
            data={data}
            sentToManager={sentToManager}
            managerApproved={managerApproved}
          />
        </aside>

        <section className="hr-rec-main">
      

        
{showAiLoader ? <AiRecommendationLoader /> : null}
          {data ? (
            <div className="hr-rec-results">
              <CoverageBanner
                data={data}
                sentToManager={sentToManager}
                managerApproved={managerApproved}
              />

              <KpiGrid
                data={data}
                selectedCount={selectedIds.length}
                sentToManager={sentToManager}
                managerApproved={managerApproved}
              />

              <SeatPlanning
                data={data}
                selectedCandidates={selectedCandidates}
                sentToManager={sentToManager}
                managerApproved={managerApproved}
              />

              <section className="hr-rec-card">
                <div className="hr-rec-card-head candidate-head">
                  <div>
                    <h2>Candidate ranking</h2>
                    <p>
                      {managerApproved
                        ? "Manager approved the shortlist. Candidate changes are locked."
                        : sentToManager
                        ? "Shortlist is locked while waiting for manager review."
                        : "Select the best candidates and submit the shortlist to the manager."}
                    </p>
                  </div>

                  <div className="hr-rec-view-toggle">
                    <button
                      className={view === "table" ? "active" : ""}
                      onClick={() => setView("table")}
                    >
                      List
                    </button>
                    <button
                      className={view === "cards" ? "active" : ""}
                      onClick={() => setView("cards")}
                    >
                      Cards
                    </button>
                  </div>
                </div>

                <div className="hr-rec-filter-row">
                  <div className="hr-rec-filter-tabs">
                    {(
                      [
                        "ALL",
                        "RECOMMENDED",
                        "POSSIBLE_WITH_GAP",
                        "NOT_RECOMMENDED",
                      ] as FilterMode[]
                    ).map((item) => (
                      <button
                        key={item}
                        className={filter === item ? "active" : ""}
                        onClick={() => setFilter(item)}
                      >
                        {decisionLabel(item)}
                      </button>
                    ))}
                  </div>

                  <div className="hr-rec-selection-text">
                    <strong>{selectedIds.length}</strong>{" "}
                    {managerApproved
                      ? "approved"
                      : sentToManager
                      ? "waiting"
                      : "selected"}
                  </div>
                </div>

                <div className="hr-rec-actionbar">
                  <button
                    className="hr-rec-btn hr-rec-btn-outline"
                    onClick={selectTopSeats}
                    disabled={reviewAlreadySent || sendingToManager}
                  >
                    Select top seats
                  </button>

                  <button
                    className="hr-rec-btn hr-rec-btn-outline"
                    onClick={clearSelection}
                    disabled={reviewAlreadySent || sendingToManager}
                  >
                    Clear
                  </button>

                  {reviewAlreadySent ? (
                    <button
                      className="hr-rec-btn hr-rec-btn-primary"
                      onClick={goToManagerList}
                    >
                      See manager list
                    </button>
                  ) : (
                    <button
                      className="hr-rec-btn hr-rec-btn-primary"
                      onClick={handleSendToManager}
                      disabled={sendingToManager || selectedIds.length === 0}
                    >
                      {sendingToManager ? "Sending..." : "Send to manager"}
                    </button>
                  )}
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="hr-rec-no-results">
                    No candidates match this filter.
                  </div>
                ) : view === "table" ? (
                  <CandidateTable
                    candidates={filteredCandidates}
                    selectedIds={selectedIds}
                    sentToManager={reviewAlreadySent}
                    sendingToManager={sendingToManager}
                    onToggle={toggleCandidate}
                    onView={setActiveCandidate}
                  />
                ) : (
                  <div className="hr-rec-cards-grid">
                    {filteredCandidates.map((candidate) => (
                      <CandidateCard
                        key={getCandidateKey(candidate)}
                        candidate={candidate}
                        selected={selectedIds.includes(
                          getCandidateKey(candidate)
                        )}
                        sentToManager={reviewAlreadySent}
                        sendingToManager={sendingToManager}
                        onToggle={() =>
                          toggleCandidate(getCandidateKey(candidate))
                        }
                        onView={() => setActiveCandidate(candidate)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </section>
      </div>

      {activeCandidate ? (
        <CandidateDrawer
          candidate={activeCandidate}
          onClose={() => setActiveCandidate(null)}
        />
      ) : null}
    </main>
  );
}

function ActivityPanel({
  activity,
  activityLoading,
  data,
  sentToManager,
  managerApproved,
}: {
  activity: ActivityRecord | null;
  activityLoading: boolean;
  data: UiRecommendationFinalResponse | null;
  sentToManager: boolean;
  managerApproved: boolean;
}) {
  return (
    <section className="hr-rec-card">
      <div className="hr-rec-card-head compact">
        <div>
          <div className="hr-rec-eyebrow">Activity</div>
          <h2>
            {activityLoading
              ? "Loading activity..."
              : activity?.title || "Activity details"}
          </h2>
        </div>
      </div>

      <div className="hr-rec-meta-grid">
        <Meta label="Type" value={activity?.type || "—"} />
        <Meta label="Context" value={activity?.priorityContext || "—"} />
        <Meta label="Seats" value={data?.seats ?? activity?.availableSlots ?? "—"} />
        <Meta
          label="Status"
          value={
            managerApproved
              ? "Approved"
              : sentToManager
              ? "Manager review"
              : "Draft"
          }
        />
        <Meta label="Department" value={(activity as any)?.departmentName || "—"} />
        <Meta label="Duration" value={activity?.duration || "—"} />
      </div>

      <div className="hr-rec-skills-section">
        <h3>Required skills</h3>

        {activity?.requiredSkills?.length ? (
          <div className="hr-rec-skill-list">
            {activity.requiredSkills.map((skill) => (
              <div
                className="hr-rec-skill"
                key={`${skill.name}-${skill.desiredLevel}`}
              >
                <div>
                  <strong>{skill.name}</strong>
                  <p>Required level: {skill.desiredLevel}</p>
                </div>

                <span
                  className={
                    skill.desiredLevel === "HIGH"
                      ? "hr-rec-pill"
                      : "hr-rec-pill warning"
                  }
                >
                  {skill.desiredLevel === "HIGH" ? "Mandatory" : "Preferred"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="hr-rec-muted">
            {activityLoading
              ? "Loading required skills..."
              : "No required skills found for this activity."}
          </p>
        )}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="hr-rec-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  reviewAlreadySent,
  onManagerList,
}: {
  reviewAlreadySent: boolean;
  onManagerList: () => void;
}) {
  return (
    <section className="hr-rec-card hr-rec-empty">
      <div className="hr-rec-empty-icon">◎</div>
      <h2>
        {reviewAlreadySent
          ? "Recommendation is locked"
          : "No recommendation generated yet"}
      </h2>
      <p>
        {reviewAlreadySent
          ? "This shortlist already entered the manager review workflow."
          : "Generate the recommendation to see ranked employees, seat coverage, and skill gaps."}
      </p>

      {reviewAlreadySent ? (
        <button className="hr-rec-btn hr-rec-btn-primary" onClick={onManagerList}>
          See manager list
        </button>
      ) : null}
    </section>
  );
}

function CoverageBanner({
  data,
  sentToManager,
  managerApproved,
}: {
  data: UiRecommendationFinalResponse;
  sentToManager: boolean;
  managerApproved: boolean;
}) {
  return (
    <div
      className={`hr-rec-coverage ${
        managerApproved || sentToManager ? "locked" : ""
      }`}
    >
      <strong>
        {managerApproved
          ? "Manager approved this shortlist."
          : sentToManager
          ? "Shortlist sent to manager."
          : data.summary.primaryCount < data.seats
          ? `Only ${data.summary.primaryCount} of ${data.seats} seats can be safely filled.`
          : "Seat coverage is ready for manager review."}
      </strong>
      <p>
        {managerApproved
          ? "Open the manager list to continue HR validation."
          : sentToManager
          ? "Candidate selection is locked until the manager completes the review."
          : "Review the candidate ranking below before submitting the shortlist."}
      </p>
    </div>
  );
}

function KpiGrid({
  data,
  selectedCount,
  sentToManager,
  managerApproved,
}: {
  data: UiRecommendationFinalResponse;
  selectedCount: number;
  sentToManager: boolean;
  managerApproved: boolean;
}) {
  return (
    <div className="hr-rec-kpi-grid">
      <Meta label="Seats" value={data.seats} />
      <Meta label="Primary" value={data.summary.primaryCount} />
      <Meta label="Backup" value={data.summary.backupCount} />
      <Meta
        label={managerApproved ? "Approved" : sentToManager ? "Waiting" : "Selected"}
        value={selectedCount}
      />
    </div>
  );
}



function SeatPlanning({
  data,
  selectedCandidates,
  sentToManager,
  managerApproved,
}: {
  data: UiRecommendationFinalResponse;
  selectedCandidates: UiRecommendationItem[];
  sentToManager: boolean;
  managerApproved: boolean;
}) {
  return (
    <section className="hr-rec-card">
      <div className="hr-rec-card-head">
        <div>
          <h2>Seat planning</h2>
          <p>
            {managerApproved
              ? "Selected seats have been approved by the manager."
              : sentToManager
              ? "Selected seats are waiting for manager validation."
              : "Selected employees prepared for manager review."}
          </p>
        </div>

        <span
          className={
            managerApproved
              ? "hr-rec-pill"
              : sentToManager
              ? "hr-rec-pill warning"
              : "hr-rec-pill"
          }
        >
          {managerApproved
            ? "Approved"
            : sentToManager
            ? "Waiting review"
            : "Ready"}
        </span>
      </div>

      <div className="hr-rec-seat-map">
        {Array.from({ length: data.seats }).map((_, index) => {
          const candidate = selectedCandidates[index];

          return (
            <div
              key={index}
              className={`hr-rec-seat ${
                candidate
                  ? managerApproved
                    ? "filled"
                    : sentToManager
                    ? "pending"
                    : "filled"
                  : ""
              }`}
            >
              <span>Seat {index + 1}</span>
              <strong>{candidate?.fullName ?? "Open"}</strong>
              <p>
                {candidate
                  ? managerApproved
                    ? "Approved by manager"
                    : sentToManager
                    ? "Waiting manager review"
                    : `${percent(candidate.finalScore)} · ${decisionLabel(
                        candidate.decision
                      )}`
                  : "Needs HR decision"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CandidateTable({
  candidates,
  selectedIds,
  sentToManager,
  sendingToManager,
  onToggle,
  onView,
}: {
  candidates: UiRecommendationItem[];
  selectedIds: string[];
  sentToManager: boolean;
  sendingToManager: boolean;
  onToggle: (candidateId: string) => void;
  onView: (candidate: UiRecommendationItem) => void;
}) {
  return (
    <div className="hr-rec-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Rank</th>
            <th>Employee</th>
            <th>Score</th>
            <th>Decision</th>
            <th>Group</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {candidates.map((candidate) => {
            const key = getCandidateKey(candidate);

            return (
              <tr key={key}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(key)}
                    disabled={sentToManager || sendingToManager}
                    onChange={() => onToggle(key)}
                  />
                </td>

                <td>#{candidate.rank}</td>

                <td>
                  <strong>{candidate.fullName}</strong>
                  <p>{candidate.email}</p>
                </td>

                <td className="hr-rec-score">{percent(candidate.finalScore)}</td>

                <td>
                  <DecisionPill decision={candidate.decision} />
                </td>

                <td>{candidate.selectionGroup}</td>

                <td>
                  <button
                    className="hr-rec-btn hr-rec-btn-outline"
                    onClick={() => onView(candidate)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DecisionPill({ decision }: { decision: RecommendationDecision }) {
  const cls =
    decision === "RECOMMENDED"
      ? ""
      : decision === "POSSIBLE_WITH_GAP"
      ? "warning"
      : "danger";

  return <span className={`hr-rec-pill ${cls}`}>{decisionLabel(decision)}</span>;
}

function CandidateCard({
  candidate,
  selected,
  sentToManager,
  sendingToManager,
  onToggle,
  onView,
}: {
  candidate: UiRecommendationItem;
  selected: boolean;
  sentToManager: boolean;
  sendingToManager: boolean;
  onToggle: () => void;
  onView: () => void;
}) {
  return (
    <article className={`hr-rec-candidate-card ${selected ? "selected" : ""}`}>
      <div className="hr-rec-candidate-top">
        <div className="hr-rec-candidate-left">
          <div className="hr-rec-rank">#{candidate.rank}</div>

          <div className="hr-rec-candidate-name">
            <h3>{candidate.fullName}</h3>
            <p>{candidate.email}</p>
          </div>
        </div>

        <div className="hr-rec-candidate-score-box">
          <strong>{percent(candidate.finalScore)}</strong>
          <DecisionPill decision={candidate.decision} />
        </div>
      </div>

      <div className="hr-rec-breakdown">
        <Bar label="Skill match" value={candidate.breakdown.skillMatch} />
        <Bar label="Context fit" value={candidate.breakdown.contextFit} />
        <Bar label="Experience" value={candidate.breakdown.experienceFit} />
        <Bar label="History fit" value={candidate.breakdown.historyFit} />
      </div>

      <div className="hr-rec-card-notes">
        <div>
          <strong>Strengths</strong>
          <p>{candidate.strengths.join(" · ") || "No strengths found."}</p>
        </div>

        <div>
          <strong>Risks</strong>
          <p>{candidate.risks.join(" · ") || "No risks found."}</p>
        </div>
      </div>

      <div className="hr-rec-card-actions">
        <button className="hr-rec-btn hr-rec-btn-outline" onClick={onView}>
          Details
        </button>

        <button
          className={selected ? "hr-rec-btn" : "hr-rec-btn hr-rec-btn-primary"}
          onClick={onToggle}
          disabled={sentToManager || sendingToManager}
        >
          {selected ? "Remove" : "Add"}
        </button>
      </div>
    </article>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="hr-rec-bar-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.round((Number(value) || 0) * 100)}%` }} />
      </div>
      <strong>{percent(value)}</strong>
    </div>
  );
}

function CandidateDrawer({
  candidate,
  onClose,
}: {
  candidate: UiRecommendationItem;
  onClose: () => void;
}) {
  return (
    <>
      <div className="hr-rec-backdrop" onClick={onClose} />

      <aside className="hr-rec-drawer">
        <div className="hr-rec-drawer-header">
          <div>
            <div className="hr-rec-eyebrow">Candidate explanation</div>
            <h2>{candidate.fullName}</h2>
            <p>
              {candidate.email} · Score {percent(candidate.finalScore)}
            </p>
          </div>

          <button onClick={onClose}>×</button>
        </div>

        <div className="hr-rec-drawer-body">
          <DrawerSection title="Decision">
            <DecisionPill decision={candidate.decision} />
          </DrawerSection>

          <DrawerSection title="Explanation">
            <p>{candidate.explanation || "No explanation available."}</p>
          </DrawerSection>

          <DrawerSection title="Strengths">
            <List items={candidate.strengths} empty="No strengths found." />
          </DrawerSection>

          <DrawerSection title="Risks / gaps">
            <List items={candidate.risks} empty="No risks found." />
          </DrawerSection>

          <DrawerSection title="Suggested HR action">
            <p>{candidate.nextAction || "Review manually before approval."}</p>
          </DrawerSection>
        </div>
      </aside>
    </>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="hr-rec-drawer-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p>{empty}</p>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
function AiRecommendationLoader() {
  const steps = [
    "Analyzing employee profiles",
    "Comparing skills with activity requirements",
    "Checking department and context fit",
    "Ranking strongest candidates",
    "Preparing recommendation explanation",
  ];

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="hr-rec-card hr-rec-empty hr-ai-loader-card">
      <div className="hr-ai-brain-box">
        <svg viewBox="0 0 340 245">
          <defs>
            <linearGradient id="brainGradientHr" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="55%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#bbf7d0" />
            </linearGradient>

            <path id="hrPath1" d="M75 118 C112 56, 160 48, 238 96" />
            <path id="hrPath2" d="M238 96 C278 122, 250 160, 205 164" />
            <path id="hrPath3" d="M75 118 C94 150, 125 166, 158 160" />
            <path id="hrPath5" d="M145 58 C150 94, 154 125, 158 160" />
          </defs>

          <path
            className="hr-ai-brain-shape"
            d="M88 178 C61 176 42 160 43 136 C22 123 25 88 52 78 C48 51 76 32 106 43 C123 18 166 19 185 44 C214 31 248 43 260 68 C287 72 303 98 292 123 C313 145 296 177 263 178 C260 200 232 215 205 202 C183 222 137 217 123 194 C106 201 91 194 88 178 Z"
          />

          <path className="hr-ai-fold" d="M73 82 C58 94 56 112 67 125" />
          <path className="hr-ai-fold" d="M102 45 C91 58 88 73 95 89" />
          <path className="hr-ai-fold" d="M184 45 C194 58 194 76 185 89" />
          <path className="hr-ai-fold" d="M258 70 C245 80 244 99 257 111" />
          <path className="hr-ai-fold" d="M123 194 C134 182 151 179 168 184" />

          <use href="#hrPath1" className="hr-ai-connection strong" />
          <use href="#hrPath2" className="hr-ai-connection strong" />
          <use href="#hrPath3" className="hr-ai-connection" />
          <use href="#hrPath5" className="hr-ai-connection" />

          <circle className="hr-ai-packet top" r="4.5">
            <animateMotion dur="1.4s" repeatCount="indefinite">
              <mpath href="#hrPath1" />
            </animateMotion>
          </circle>

          <circle className="hr-ai-packet" r="3.8">
            <animateMotion dur="1.9s" repeatCount="indefinite" begin="0.2s">
              <mpath href="#hrPath3" />
            </animateMotion>
          </circle>

          <circle className="hr-ai-packet top" r="4.3">
            <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.4s">
              <mpath href="#hrPath2" />
            </animateMotion>
          </circle>

          {[["75", "118"], ["145", "58"], ["238", "96"], ["158", "160"], ["205", "164"]].map(
            ([x, y]) => (
              <g key={`${x}-${y}`}>
                <circle className="hr-ai-node-glow" cx={x} cy={y} r="16" />
                <circle className="hr-ai-node" cx={x} cy={y} r="16" />
                <text className="hr-ai-employee" x={x} y={Number(y) + 1}>
                  👤
                </text>
              </g>
            )
          )}

          <circle className="hr-ai-spark" cx="125" cy="124" r="3.7" />
          <circle className="hr-ai-spark" cx="172" cy="112" r="3.2" />
          <circle className="hr-ai-spark" cx="215" cy="130" r="3.5" />
        </svg>
      </div>

      <h2>Generating AI recommendations</h2>
      <p>
        The AI is analyzing employee skills, department fit, activity history,
        availability, and requirements.
      </p>

      <div className="hr-ai-status-box">
        {steps[stepIndex]}
        <span className="hr-ai-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>

      <div className="hr-ai-progress">
        <span />
      </div>
    </section>
  );
}