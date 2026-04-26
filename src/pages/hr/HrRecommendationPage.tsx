import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getActivityById,
  type ActivityRecord,
} from "../../services/activities.service";
import { getCandidates } from "../../services/hrCopilot.service";
import {
  getFinalRecommendations,
  type RecommendationDecision,
  type RecommendationFinalResponse,
  type RecommendationItem,
} from "../../services/recommendations.service";
import {
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

function getReviewEmployeeId(candidate: UiRecommendationItem) {
  return String(candidate.reviewEmployeeId || candidate.employeeId);
}

function normalizeFinalResponse(
  result: RecommendationFinalResponse,
  oldRecommendations: any
): UiRecommendationFinalResponse {
  const oldPrimary = oldRecommendations?.primaryCandidates || [];
  const oldBackup = oldRecommendations?.backupCandidates || [];

  const attachPrimary = (
    candidate: RecommendationItem,
    index: number
  ): UiRecommendationItem => {
    const oldId = String(oldPrimary[index]?.employeeId || "");

    const finalId = isMongoId(oldId) ? oldId : String(candidate.employeeId);

    return {
      ...candidate,
      employeeId: finalId,
      reviewEmployeeId: finalId,
    };
  };

  const attachBackup = (
    candidate: RecommendationItem,
    index: number
  ): UiRecommendationItem => {
    const oldId = String(oldBackup[index]?.employeeId || "");

    const finalId = isMongoId(oldId) ? oldId : String(candidate.employeeId);

    return {
      ...candidate,
      employeeId: finalId,
      reviewEmployeeId: finalId,
    };
  };

  const attachNotRecommended = (
    candidate: RecommendationItem
  ): UiRecommendationItem => ({
    ...candidate,
    reviewEmployeeId: String(candidate.employeeId),
  });

  return {
    ...result,
    primaryCandidates: result.primaryCandidates.map(attachPrimary),
    backupCandidates: result.backupCandidates.map(attachBackup),
    notRecommendedCandidates: result.notRecommendedCandidates.map(
      attachNotRecommended
    ),
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

  const [showPipeline, setShowPipeline] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [view, setView] = useState<ViewMode>("table");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] =
    useState<UiRecommendationItem | null>(null);

  useEffect(() => {
    if (!activityId) return;

    async function loadActivity() {
      try {
        setActivityLoading(true);
        setError("");
        const result = await getActivityById(activityId);
        setActivity(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load activity details.");
      } finally {
        setActivityLoading(false);
      }
    }

    loadActivity();
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
    if (!activityId || loading || sendingToManager) return;

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
        await wait(650);
        setCompletedSteps((prev) => [...prev, i]);
      }

      await wait(250);

      const [newResult, oldResult] = await Promise.all([
        getFinalRecommendations(activityId),
        getCandidates(activityId),
      ]);

      const fixedResult = normalizeFinalResponse(newResult, oldResult);

      console.log("NEW PRIMARY IDS:", newResult.primaryCandidates.map((c) => c.employeeId));
      console.log("OLD VALID PRIMARY IDS:", oldResult.primaryCandidates?.map((c: any) => c.employeeId));
      console.log("FINAL IDS USED:", fixedResult.primaryCandidates.map((c) => c.employeeId));

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
    if (sentToManager || sendingToManager) return;

    setSelectedIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  }

  function selectTopSeats() {
    if (!data || sentToManager || sendingToManager) return;

    setSelectedIds(
      data.primaryCandidates
        .slice(0, data.seats)
        .map((candidate) => getCandidateKey(candidate))
    );
  }

  function clearSelection() {
    if (sentToManager || sendingToManager) return;
    setSelectedIds([]);
  }

  async function handleSendToManager() {
    if (!activityId || !data || sendingToManager) return;

    if (selectedIds.length === 0) {
      setError("Select at least one employee before sending to manager.");
      return;
    }

    try {
      setSendingToManager(true);
      setError("");
      setSuccess("");

      const employeeIds = selectedIds.filter(isMongoId);

      console.log("========== SEND DEBUG ==========");
      console.log("EMPLOYEE IDS SENT TO BACKEND:", employeeIds);

      await saveHrShortlist(activityId, {
        employeeIds,
        hrNote: `Sent to manager for approval on ${new Date().toLocaleDateString()}`,
        hrInvitationResponseDays: 3,
      });

      await submitHrShortlistToManager(activityId);

      setSentToManager(true);
      setSuccess("Shortlist sent to manager successfully.");
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
      <div className="hr-rec-topbar">
        <div>
          <div className="hr-rec-eyebrow">HR recommendation engine</div>
          <h1>{activity?.title || "Activity Staffing Recommendation"}</h1>
          <p>
            Generate a shortlist, inspect skill gaps, and prepare staffing seats
            for manager review.
          </p>
        </div>

        <button
          className="hr-rec-btn hr-rec-btn-primary"
          onClick={runRecommendation}
          disabled={loading || sendingToManager || activityLoading}
        >
          {loading
            ? "Analyzing..."
            : data
            ? "Regenerate Recommendation"
            : "Generate Recommendation"}
        </button>
      </div>

      {error ? <div className="hr-rec-error">{error}</div> : null}
      {success ? <div className="hr-rec-success">{success}</div> : null}

      <div className="hr-rec-layout">
        <aside className="hr-rec-card">
          <div className="hr-rec-card-body">
            <h2 className="hr-rec-activity-title">
              {activityLoading
                ? "Loading activity..."
                : activity?.title || "Activity details"}
            </h2>

            <div className="hr-rec-meta-grid">
              <div>
                <span>Type</span>
                <strong>{activity?.type || "—"}</strong>
              </div>

              <div>
                <span>Context</span>
                <strong>{activity?.priorityContext || "—"}</strong>
              </div>

              <div>
                <span>Seats</span>
                <strong>{data?.seats ?? activity?.availableSlots ?? "—"}</strong>
              </div>

              <div>
                <span>Backup</span>
                <strong>{data?.backupCount ?? "—"}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{(activity as any)?.departmentName || "—"}</strong>
              </div>

              <div>
                <span>Duration</span>
                <strong>{activity?.duration || "—"}</strong>
              </div>
            </div>

            <h3>Required skills</h3>

            {activity?.requiredSkills?.length ? (
              activity.requiredSkills.map((skill) => (
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
              ))
            ) : (
              <p className="hr-rec-muted">
                {activityLoading
                  ? "Loading required skills..."
                  : "No required skills found for this activity."}
              </p>
            )}
          </div>
        </aside>

        <section className="hr-rec-main">
          {!data && !showPipeline ? (
            <div className="hr-rec-card hr-rec-empty">
              <div>
                <div className="hr-rec-empty-icon">◎</div>
                <h2>No recommendation generated yet</h2>
                <p>Click “Generate Recommendation” to run staffing analysis.</p>
              </div>
            </div>
          ) : null}

          {showPipeline ? (
            <PipelineCard
              activeStep={activeStep}
              completedSteps={completedSteps}
            />
          ) : null}

          {data ? (
            <div className="hr-rec-results">
              <div className="hr-rec-warning">
                {data.summary.primaryCount < data.seats
                  ? `Only ${data.summary.primaryCount} of ${data.seats} seats can be safely filled.`
                  : "Shortlist coverage is ready for manager review."}
              </div>

              <div className="hr-rec-kpi-grid">
                <div>
                  <span>Seats</span>
                  <strong>{data.seats}</strong>
                </div>

                <div>
                  <span>Primary</span>
                  <strong>{data.summary.primaryCount}</strong>
                </div>

                <div>
                  <span>Backup</span>
                  <strong>{data.summary.backupCount}</strong>
                </div>

                <div>
                  <span>Selected</span>
                  <strong>{selectedIds.length}</strong>
                </div>
              </div>

              <SeatPlanning data={data} selectedCandidates={selectedCandidates} />

              <div className="hr-rec-card">
                <div className="hr-rec-tools">
                  <div>
                    <h2>Candidate ranking</h2>
                    <p>Select candidates, then send the shortlist to manager.</p>
                  </div>

                  <div className="hr-rec-toggle">
                    <button
                      className={view === "table" ? "active" : ""}
                      onClick={() => setView("table")}
                    >
                      List view
                    </button>

                    <button
                      className={view === "cards" ? "active" : ""}
                      onClick={() => setView("cards")}
                    >
                      Card view
                    </button>
                  </div>

                  <div className="hr-rec-toggle">
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
                </div>

                <div className="hr-rec-shortlist-actions">
                  <div>
                    <strong>{selectedIds.length}</strong> selected for manager
                    review
                  </div>

                  <div>
                    <button
                      className="hr-rec-btn hr-rec-btn-outline"
                      onClick={selectTopSeats}
                      disabled={sentToManager || sendingToManager}
                    >
                      Select top seats
                    </button>

                    <button
                      className="hr-rec-btn hr-rec-btn-outline"
                      onClick={clearSelection}
                      disabled={sentToManager || sendingToManager}
                    >
                      Clear
                    </button>

                    {sentToManager ? (
                      <button
                        className="hr-rec-btn hr-rec-btn-primary"
                        onClick={() =>
                          navigate(
                            `/hr/activities/${activityId}/manager-decisions`
                          )
                        }
                      >
                        Open manager list
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
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="hr-rec-no-results">
                    No candidates match this filter.
                  </div>
                ) : view === "table" ? (
                  <CandidateTable
                    candidates={filteredCandidates}
                    selectedIds={selectedIds}
                    sentToManager={sentToManager}
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
                        selected={selectedIds.includes(getCandidateKey(candidate))}
                        sentToManager={sentToManager}
                        sendingToManager={sendingToManager}
                        onToggle={() => toggleCandidate(getCandidateKey(candidate))}
                        onView={() => setActiveCandidate(candidate)}
                      />
                    ))}
                  </div>
                )}
              </div>
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

function PipelineCard({
  activeStep,
  completedSteps,
}: {
  activeStep: number;
  completedSteps: number[];
}) {
  return (
    <div className="hr-rec-card hr-rec-pipeline-card">
      <div className="hr-rec-card-body">
        <div className="hr-rec-eyebrow">Recommendation pipeline</div>
        <h2>Analyzing activity and employee profiles</h2>
        <p className="hr-rec-muted">
          Reading requirements, matching skills, detecting gaps, ranking
          employees, and preparing the HR shortlist.
        </p>

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
                    {index === 2 && "Finding missing mandatory/preferred skills."}
                    {index === 3 && "Applying scoring and scenario rules."}
                    {index === 4 && "Preparing primary and backup groups."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeatPlanning({
  data,
  selectedCandidates,
}: {
  data: UiRecommendationFinalResponse;
  selectedCandidates: UiRecommendationItem[];
}) {
  return (
    <div className="hr-rec-card">
      <div className="hr-rec-card-body">
        <div className="hr-rec-section-header">
          <div>
            <h2>Seat planning</h2>
            <p>Selected candidates prepared for manager review.</p>
          </div>

          <span className="hr-rec-pill">Manager review ready</span>
        </div>

        <div className="hr-rec-seat-map">
          {Array.from({ length: data.seats }).map((_, index) => {
            const candidate = selectedCandidates[index];

            return (
              <div
                key={index}
                className={`hr-rec-seat ${candidate ? "filled" : ""}`}
              >
                <div>Seat {index + 1}</div>
                <strong>{candidate?.fullName ?? "Open"}</strong>
                <p>
                  {candidate
                    ? `${percent(candidate.finalScore)} · ${decisionLabel(
                        candidate.decision
                      )}`
                    : "Needs HR decision"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
                    View details
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
    <div className={`hr-rec-candidate-card ${selected ? "selected" : ""}`}>
      <div className="hr-rec-candidate-top">
        <div className="hr-rec-candidate-left">
          <div className="hr-rec-rank">#{candidate.rank}</div>

          <div>
            <h3>{candidate.fullName}</h3>
            <p>{candidate.email}</p>
          </div>
        </div>

        <div className="hr-rec-candidate-score-box">
          <div className="hr-rec-card-score">{percent(candidate.finalScore)}</div>
          <DecisionPill decision={candidate.decision} />
        </div>
      </div>

      <div className="hr-rec-breakdown">
        <Bar label="Skill match" value={candidate.breakdown.skillMatch} />
        <Bar label="Context fit" value={candidate.breakdown.contextFit} />
        <Bar label="Experience" value={candidate.breakdown.experienceFit} />
        <Bar label="History fit" value={candidate.breakdown.historyFit} />
      </div>

      <div className="hr-rec-notes">
        <strong>Strengths</strong>
        <p>{candidate.strengths.join(" · ") || "No strengths found."}</p>
      </div>

      <div className="hr-rec-notes">
        <strong>Warnings / risks</strong>
        <p>{candidate.risks.join(" · ") || "No risks found."}</p>
      </div>

      <div className="hr-rec-card-actions">
        <button className="hr-rec-btn hr-rec-btn-outline" onClick={onView}>
          View details
        </button>

        <button
          className={selected ? "hr-rec-btn" : "hr-rec-btn hr-rec-btn-primary"}
          onClick={onToggle}
          disabled={sentToManager || sendingToManager}
        >
          {selected ? "Remove" : "Add to shortlist"}
        </button>

        <button className="hr-rec-btn" disabled={sentToManager || sendingToManager}>
          Replace
        </button>
      </div>
    </div>
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
  children: React.ReactNode;
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