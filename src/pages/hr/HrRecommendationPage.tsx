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

const PIPELINE_STEPS = [
  "Activity parsed",
  "Skills matched",
  "Gaps detected",
  "Ranking completed",
  "Shortlist prepared",
];

function percent(value: number) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function decisionLabel(decision: RecommendationDecision | "ALL") {
  if (decision === "ALL") return "All";
  if (decision === "POSSIBLE_WITH_GAP") return "Possible with gap";
  if (decision === "NOT_RECOMMENDED") return "Not recommended";
  return "Recommended";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const [data, setData] = useState<UiRecommendationFinalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingToManager, setSendingToManager] = useState(false);
  const [sentToManager, setSentToManager] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>("");

  const [showPipeline, setShowPipeline] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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
      setShowPipeline(true);
      setActiveStep(-1);
      setCompletedSteps([]);

      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        setActiveStep(i);
        await wait(450);
        setCompletedSteps((prev) => [...prev, i]);
      }

      await wait(200);

      const result = await getFinalRecommendations(activityId);
      const fixedResult = normalizeFinalResponse(result);

      setData(fixedResult);
      setSelectedIds(
        fixedResult.primaryCandidates.map((candidate) =>
          getCandidateKey(candidate)
        )
      );

      setShowPipeline(false);
      setActiveStep(-1);
    } catch (err: any) {
      setError(err?.message || "Failed to generate recommendations.");
      setShowPipeline(false);
    } finally {
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
          {!data && !showPipeline ? (
            <EmptyState
              reviewAlreadySent={reviewAlreadySent}
              onManagerList={goToManagerList}
            />
          ) : null}

          {showPipeline ? (
            <PipelineCard
              activeStep={activeStep}
              completedSteps={completedSteps}
            />
          ) : null}

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

function PipelineCard({
  activeStep,
  completedSteps,
}: {
  activeStep: number;
  completedSteps: number[];
}) {
  return (
    <section className="hr-rec-card">
      <div className="hr-rec-card-head">
        <div>
          <div className="hr-rec-eyebrow">Recommendation pipeline</div>
          <h2>Analyzing employee profiles</h2>
          <p>
            Reading activity requirements, matching skills, detecting gaps, and
            preparing the shortlist.
          </p>
        </div>
      </div>

      <div className="hr-rec-pipeline">
        {PIPELINE_STEPS.map((step, index) => {
          const done = completedSteps.includes(index);
          const active = activeStep === index && !done;

          return (
            <div
              className={`hr-rec-step ${active ? "active" : ""} ${
                done ? "done" : ""
              }`}
              key={step}
            >
              <div className="hr-rec-step-icon">{done ? "✓" : index + 1}</div>

              <div>
                <strong>{step}</strong>
                <p>
                  {index === 0 && "Extracting activity context and seats."}
                  {index === 1 && "Comparing employee skills and levels."}
                  {index === 2 && "Finding missing mandatory skills."}
                  {index === 3 && "Applying scoring rules."}
                  {index === 4 && "Preparing primary and backup groups."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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