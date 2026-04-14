import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import type { CandidateItem } from "../../types/hr-copilot";
import "./ManagerActivityReviewPage.css";

type ManagerReviewState = {
  activityId: string;
  activityTitle: string;
  seatsRequired: number;
  hrSelectedCandidates: CandidateItem[];
  backupCandidates: CandidateItem[];
};

export default function ManagerActivityReviewPage() {
  const { activityId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as Partial<ManagerReviewState>;

  const activityTitle = state.activityTitle || "Activity review";
  const seatsRequired = state.seatsRequired || 0;
  const hrSelectedCandidates = state.hrSelectedCandidates || [];
  const backupCandidates = state.backupCandidates || [];

  const [selectedFinalIds, setSelectedFinalIds] = useState<string[]>(
    hrSelectedCandidates.map((candidate) => candidate.employeeId)
  );
  const [feedback, setFeedback] = useState("");

  const finalSelected = useMemo(() => {
    return hrSelectedCandidates.filter((candidate) =>
      selectedFinalIds.includes(candidate.employeeId)
    );
  }, [hrSelectedCandidates, selectedFinalIds]);

  const toggleCandidate = (employeeId: string) => {
    setSelectedFinalIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleApprove = () => {
    window.alert(
      `Manager approved ${finalSelected.length} participants for "${activityTitle}". Backend endpoint comes next.`
    );
  };

  const handleReject = () => {
    window.alert(
      `Manager rejected or requested changes for "${activityTitle}". Backend endpoint comes next.`
    );
  };

  return (
    <div className="manager-review-page">
      <div className="manager-review-shell">
        <div className="manager-review-header">
          <div>
            <span className="manager-review-kicker">Manager review</span>
            <h1>{activityTitle}</h1>
            <p>
              Review the HR shortlist, adjust participants, and confirm the final list before employees are notified.
            </p>
          </div>
        </div>

        <div className="manager-review-stats">
          <div className="manager-review-stat-card">
            <span>Seats required</span>
            <strong>{seatsRequired}</strong>
          </div>
          <div className="manager-review-stat-card">
            <span>HR selected</span>
            <strong>{hrSelectedCandidates.length}</strong>
          </div>
          <div className="manager-review-stat-card">
            <span>Manager final</span>
            <strong>{finalSelected.length}</strong>
          </div>
          <div className="manager-review-stat-card">
            <span>Backup options</span>
            <strong>{backupCandidates.length}</strong>
          </div>
        </div>

        <div className="manager-review-layout">
          <section className="manager-review-panel">
            <div className="section-head">
              <h2>HR shortlisted employees</h2>
              <p>Manager can keep or remove participants from the shortlist.</p>
            </div>

            <div className="candidate-list">
              {hrSelectedCandidates.map((candidate) => {
                const selected = selectedFinalIds.includes(candidate.employeeId);

                return (
                  <div key={candidate.employeeId} className="manager-candidate-card">
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
                          <span>Rank #{candidate.rank}</span>
                          <span>{candidate.recommendationType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="candidate-actions-row">
                      <label className="select-checkbox">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCandidate(candidate.employeeId)}
                        />
                        <span>
                          {selected ? "Included in final list" : "Excluded from final list"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="manager-review-panel">
            <div className="section-head">
              <h2>Backup employees</h2>
              <p>Manager can use these later when backend support is added.</p>
            </div>

            <div className="candidate-list">
              {backupCandidates.length === 0 ? (
                <div className="empty-state-card">No backup candidates available.</div>
              ) : (
                backupCandidates.map((candidate) => (
                  <div key={candidate.employeeId} className="manager-candidate-card">
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
                          <span>Rank #{candidate.rank}</span>
                          <span>{candidate.recommendationType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="manager-review-panel">
          <div className="section-head">
            <h2>Manager feedback</h2>
            <p>Add notes before approval or rejection.</p>
          </div>

          <textarea
            className="manager-review-textarea"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write manager review notes here..."
          />

          <div className="manager-review-actions">
            <button
              type="button"
              className="secondary-staffing-btn"
              onClick={() => navigate(-1)}
            >
              Back
            </button>

            <button
              type="button"
              className="danger-staffing-btn"
              onClick={handleReject}
            >
              Reject / Request changes
            </button>

            <button
              type="button"
              className="primary-staffing-btn"
              onClick={handleApprove}
            >
              Approve final participants
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}