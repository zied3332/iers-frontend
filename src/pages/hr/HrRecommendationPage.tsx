import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getFinalRecommendations,
  type RecommendationDecision,
  type RecommendationFinalResponse,
  type RecommendationItem,
} from "../../services/recommendations.service";
import "./HrRecommendationPage.css";

type ViewMode = "table" | "cards";
type FilterMode = "ALL" | RecommendationDecision;

const PIPELINE_STEPS = [
  "Activity parsed",
  "Skills matched",
  "Gaps detected",
  "Ranking completed",
  "Shortlist prepared",
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
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

export default function HrRecommendationPage() {
  const { activityId = "" } = useParams();

  const [data, setData] = useState<RecommendationFinalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [view, setView] = useState<ViewMode>("table");
  const [activeCandidate, setActiveCandidate] =
    useState<RecommendationItem | null>(null);

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

  async function runRecommendation() {
    if (!activityId || loading) return;

    try {
      setError("");
      setData(null);
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

      const result = await getFinalRecommendations(activityId);
      setData(result);
      setShowPipeline(false);
      setActiveStep(-1);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to generate recommendations."
      );
      setShowPipeline(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hr-rec-page">
      <div className="hr-rec-topbar">
        <div>
          <div className="hr-rec-eyebrow">HR recommendation engine</div>
          <h1>Activity Staffing Recommendation</h1>
          <p>
            Generate a shortlist, inspect skill gaps, and prepare staffing seats
            for manager review.
          </p>
        </div>

        <button
          className="hr-rec-btn hr-rec-btn-primary"
          onClick={runRecommendation}
          disabled={loading}
        >
          {loading
            ? "Analyzing..."
            : data
            ? "Regenerate Recommendation"
            : "Generate Recommendation"}
        </button>
      </div>

      {error ? <div className="hr-rec-error">{error}</div> : null}

      <div className="hr-rec-layout">
        <aside className="hr-rec-card">
          <div className="hr-rec-card-body">
            <h2 className="hr-rec-activity-title">
              React.js Frontend Development
            </h2>

            <div className="hr-rec-meta-grid">
              <div>
                <span>Type</span>
                <strong>TRAINING</strong>
              </div>
              <div>
                <span>Context</span>
                <strong>UPSKILLING</strong>
              </div>
              <div>
                <span>Seats</span>
                <strong>{data?.seats ?? "6"}</strong>
              </div>
              <div>
                <span>Backup</span>
                <strong>{data?.backupCount ?? "5"}</strong>
              </div>
            </div>

            <h3>Required skills</h3>

            <div className="hr-rec-skill">
              <div>
                <strong>React</strong>
                <p>Required level: HIGH</p>
              </div>
              <span className="hr-rec-pill">Mandatory</span>
            </div>

            <div className="hr-rec-skill">
              <div>
                <strong>Communication</strong>
                <p>Required level: MEDIUM</p>
              </div>
              <span className="hr-rec-pill warning">Preferred</span>
            </div>
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
                  <span>Not recommended</span>
                  <strong>{data.summary.notRecommendedCount}</strong>
                </div>
              </div>

              <SeatPlanning data={data} />

              <div className="hr-rec-card">
                <div className="hr-rec-tools">
                  <div>
                    <h2>Candidate ranking</h2>
                    <p>Switch between list view and card view.</p>
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

                {filteredCandidates.length === 0 ? (
                  <div className="hr-rec-no-results">
                    No candidates match this filter.
                  </div>
                ) : view === "table" ? (
                  <CandidateTable
                    candidates={filteredCandidates}
                    onView={setActiveCandidate}
                  />
                ) : (
                  <div className="hr-rec-cards-grid">
                    {filteredCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.employeeId}
                        candidate={candidate}
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
                <div className="hr-rec-step-icon">
                  {done ? "✓" : index + 1}
                </div>
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

function SeatPlanning({ data }: { data: RecommendationFinalResponse }) {
  return (
    <div className="hr-rec-card">
      <div className="hr-rec-card-body">
        <div className="hr-rec-section-header">
          <div>
            <h2>Seat planning</h2>
            <p>Primary seats prepared from the recommendation result.</p>
          </div>
          <span className="hr-rec-pill">Manager review ready</span>
        </div>

        <div className="hr-rec-seat-map">
          {Array.from({ length: data.seats }).map((_, index) => {
            const candidate = data.primaryCandidates[index];

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
  onView,
}: {
  candidates: RecommendationItem[];
  onView: (candidate: RecommendationItem) => void;
}) {
  return (
    <div className="hr-rec-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Employee</th>
            <th>Score</th>
            <th>Decision</th>
            <th>Group</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.employeeId}>
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
          ))}
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
  onView,
}: {
  candidate: RecommendationItem;
  onView: () => void;
}) {
  return (
    <div className="hr-rec-candidate-card">
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
        <button className="hr-rec-btn hr-rec-btn-primary">Add to shortlist</button>
        <button className="hr-rec-btn">Replace</button>
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="hr-rec-bar-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <strong>{percent(value)}</strong>
    </div>
  );
}

function CandidateDrawer({
  candidate,
  onClose,
}: {
  candidate: RecommendationItem;
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