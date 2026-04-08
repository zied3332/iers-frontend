import { useState } from "react";
import "./HrCopilotPage.css";
import type { ActivityItem, CandidateItem } from "../../types/hr-copilot";
import {
  explainCandidate,
  getCandidates,
  searchActivities,
} from "../../services/hrCopilot.service";

export default function HrCopilotPage() {
  const [query, setQuery] = useState("List it activities");
  const [sessionId, setSessionId] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null
  );
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateItem | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    try {
      setError("");
      setLoadingSearch(true);
      setSelectedActivity(null);
      setCandidates([]);
      setSelectedCandidate(null);
      setExplanation([]);

      const response = await searchActivities(query, sessionId || undefined);

      console.log("Search response:", response);

      const nextSessionId =
        response.sessionId || response.sessionState?.sessionId || "";
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }

      const rawActivities = Array.isArray(response.data?.activities)
        ? response.data.activities
        : Array.isArray(response.data)
        ? response.data
        : [];

      const normalizedActivities: ActivityItem[] = rawActivities.map(
        (activity: any) => ({
          id: activity.id || activity._id || "",
          title: activity.title || "Untitled activity",
          type: activity.type || "",
          domain: activity.domain || activity.category || "",
          description: activity.description || activity.objective || "",
          score: activity.score,
        })
      );

      setActivities(normalizedActivities);
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err?.response?.data?.message || "Failed to search activities.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectActivity = async (activity: ActivityItem) => {
    try {
      setError("");
      setLoadingCandidates(true);
      setSelectedActivity(activity);
      setSelectedCandidate(null);
      setExplanation([]);

      const data = await getCandidates(activity.id, 5);
      setCandidates(data.candidates || []);
    } catch (err: any) {
      console.error("Candidates error:", err);
      setError(err?.response?.data?.message || "Failed to load candidates.");
    } finally {
      setLoadingCandidates(false);
    }
  };

 const handleExplain = async (candidate: CandidateItem) => {
  if (!selectedActivity) {
    setError("Please select an activity before asking for an explanation.");
    return;
  }

  try {
    setError("");
    setLoadingExplanation(true);
    setSelectedCandidate(candidate);

    const data = await explainCandidate(
      selectedActivity.id,
      candidate.employeeId
    );

    setExplanation(data.explanation || []);
  } catch (err: any) {
    console.error("Explanation error:", err);
    setError(err?.response?.data?.message || "Failed to load explanation.");
  } finally {
    setLoadingExplanation(false);
  }
};

  return (
    <div className="hr-copilot-page">
      <div className="copilot-hero">
        <div className="copilot-hero-text">
          <span className="copilot-tag">AI Recommendation Module</span>
          <h1>HR Copilot Workspace</h1>
          <p>
            Search activities, select one, and get AI-powered employee
            recommendations with ranking explanations.
          </p>
        </div>
      </div>

      <div className="copilot-search-card">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an HR request..."
          />
        </div>

        <button
          type="button"
          className="search-btn"
          onClick={handleSearch}
          disabled={loadingSearch}
        >
          {loadingSearch ? "Searching..." : "Search"}
        </button>
      </div>

      {error ? <div className="copilot-error">{error}</div> : null}

      <div className="copilot-summary">
        <div className="summary-card">
          <span className="summary-label">Activities Found</span>
          <strong>{activities.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Recommended Candidates</span>
          <strong>{candidates.length}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Current Session</span>
          <strong>{sessionId ? "Active" : "Not started"}</strong>
        </div>
      </div>

      <div className="copilot-grid">
        <section className="copilot-panel">
          <div className="panel-header">
            <div>
              <h2>Activities</h2>
              <p>Matching training and activity results</p>
            </div>
            <span className="panel-count">{activities.length}</span>
          </div>

          <div className="panel-content scrollable-panel">
            {loadingSearch ? (
              <div className="empty-state">Searching activities...</div>
            ) : activities.length === 0 ? (
              <div className="empty-state">
                No activities yet. Try a query like “backend training”.
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`activity-card ${
                    selectedActivity?.id === activity.id ? "active-card" : ""
                  }`}
                >
                  <div className="card-top">
                    <h3>{activity.title}</h3>
                    {activity.type ? (
                      <span className="badge">{activity.type}</span>
                    ) : null}
                  </div>

                  <p>{activity.description || "No description available."}</p>

                  <div className="card-meta">
                    {activity.domain ? (
                      <span className="meta-pill">{activity.domain}</span>
                    ) : null}
                    {typeof activity.score === "number" ? (
                      <span className="meta-pill">Score: {activity.score}</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="card-btn"
                    onClick={() => handleSelectActivity(activity)}
                  >
                    Select activity
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="copilot-panel">
          <div className="panel-header">
            <div>
              <h2>Recommended Candidates</h2>
              <p>Top ranked employee profiles</p>
            </div>
            <span className="panel-count">{candidates.length}</span>
          </div>

          <div className="panel-content scrollable-panel">
            {!selectedActivity ? (
              <div className="empty-state">Select an activity first.</div>
            ) : loadingCandidates ? (
              <div className="empty-state">Loading candidates...</div>
            ) : candidates.length === 0 ? (
              <div className="empty-state">No candidates found.</div>
            ) : (
              candidates.map((candidate, index) => (
                <div
                  key={candidate.employeeId}
                  className={`candidate-card ${
                    selectedCandidate?.employeeId === candidate.employeeId
                      ? "active-card"
                      : ""
                  }`}
                >
                  <div className="card-top">
                    <div>
                      <h3>{candidate.name}</h3>
                      <span className="candidate-rank">Rank #{index + 1}</span>
                    </div>
                    <span className="score-badge">
                      {candidate.finalScore}/100
                    </span>
                  </div>

                  <p>{candidate.shortReason}</p>

                  <div className="score-grid">
                    <div className="score-item">
                      <span>Semantic</span>
                      <strong>{candidate.semanticScore}</strong>
                    </div>
                    <div className="score-item">
                      <span>Skills</span>
                      <strong>{candidate.skillScore}</strong>
                    </div>
                    <div className="score-item">
                      <span>Progression</span>
                      <strong>{candidate.progressionScore}</strong>
                    </div>
                    <div className="score-item">
                      <span>Experience</span>
                      <strong>{candidate.experienceScore}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="card-btn"
                    onClick={() => handleExplain(candidate)}
                  >
                    Explain ranking
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="copilot-panel explanation-panel">
          <div className="panel-header">
            <div>
              <h2>Explanation</h2>
              <p>Why this recommendation was made</p>
            </div>
          </div>

          <div className="panel-content">
            {loadingExplanation ? (
              <div className="empty-state">Generating explanation...</div>
            ) : explanation.length === 0 ? (
              <div className="empty-state">
                Select a candidate and click explain.
              </div>
            ) : (
              <div className="explanation-box">
                {selectedCandidate ? (
                  <div className="explanation-title">
                    <h3>{selectedCandidate.name}</h3>
                    <span>{selectedCandidate.finalScore}/100</span>
                  </div>
                ) : null}

                <ul>
                  {explanation.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}