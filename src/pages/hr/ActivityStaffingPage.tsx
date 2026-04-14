import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getActivityStaffingStatus,
  getNextBackupCandidates,
} from "../../services/activityInvitations.service";
import { getCandidates } from "../../services/hrCopilot.service";
import type { CandidateItem } from "../../types/hr-copilot";
import type {
  ActivityInvitationItem,
  ActivityStaffingStatusResponse,
} from "../../types/activity-invitations";
import "./ActivityStaffingPage.css";

export default function ActivityStaffingPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sendingToManager, setSendingToManager] = useState(false);
  const [error, setError] = useState("");

  const [statusData, setStatusData] =
    useState<ActivityStaffingStatusResponse | null>(null);

  const [primaryCandidates, setPrimaryCandidates] = useState<CandidateItem[]>([]);
  const [backupCandidates, setBackupCandidates] = useState<CandidateItem[]>([]);
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState<string[]>([]);

  const [availableBackups, setAvailableBackups] = useState<CandidateItem[]>([]);

  const loadPage = async () => {
    if (!activityId) return;

    try {
      setError("");
      setLoading(true);

      const [staffing, recommendations, nextBackups] = await Promise.all([
        getActivityStaffingStatus(activityId),
        getCandidates(activityId),
        getNextBackupCandidates(activityId, 10),
      ]);

      setStatusData(staffing);
      setPrimaryCandidates(recommendations.primaryCandidates || []);
      setBackupCandidates(recommendations.backupCandidates || []);
      setAvailableBackups(nextBackups.availableBackups || []);
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

  useEffect(() => {
    if (primaryCandidates.length > 0) {
      setSelectedPrimaryIds(primaryCandidates.map((candidate) => candidate.employeeId));
    }
  }, [primaryCandidates]);

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

  const handleSelectAll = () => {
    setSelectedPrimaryIds(primaryCandidates.map((candidate) => candidate.employeeId));
  };

  const handleClearSelection = () => {
    setSelectedPrimaryIds([]);
  };

  const handleSendToManager = async () => {
    if (!activityId || selectedPrimaryIds.length === 0) {
      setError("Select at least one employee before sending to manager.");
      return;
    }

    try {
      setSendingToManager(true);
      setError("");

      navigate(`/manager/activities/${activityId}/review`, {
        state: {
          activityId,
          activityTitle: statusData?.activityTitle || "Selected activity",
          seatsRequired: statusData?.seatsRequired || selectedPrimaryIds.length,
          hrSelectedCandidates: primaryCandidates.filter((candidate) =>
            selectedPrimaryIds.includes(candidate.employeeId)
          ),
          backupCandidates,
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to send data to manager review page.");
    } finally {
      setSendingToManager(false);
    }
  };

  const buildSeatItems = () => {
    if (!statusData) return [];

    const seatItems: Array<{
      label: string;
      state: "accepted" | "invited" | "declined" | "empty";
    }> = [];

    for (let i = 0; i < statusData.accepted; i++) {
      seatItems.push({ label: `A${i + 1}`, state: "accepted" });
    }

    for (let i = 0; i < statusData.invited; i++) {
      seatItems.push({ label: `P${i + 1}`, state: "invited" });
    }

    for (let i = 0; i < statusData.declined; i++) {
      seatItems.push({ label: `D${i + 1}`, state: "declined" });
    }

    for (let i = 0; i < statusData.emptySeats; i++) {
      seatItems.push({ label: `E${i + 1}`, state: "empty" });
    }

    return seatItems;
  };

  const seatItems = buildSeatItems();

  return (
    <div className="activity-staffing-page">
      <div className="staffing-shell">
        <div className="staffing-header">
          <div>
            <span className="staffing-kicker">HR validation</span>
            <h1>{statusData?.activityTitle || "Loading activity..."}</h1>
            <p>
              Review AI recommendations, select the shortlist, and forward the activity to the manager for final validation.
            </p>
          </div>
        </div>

        {error ? <div className="staffing-error">{error}</div> : null}

        {loading ? (
          <div className="staffing-loading-card">Loading staffing dashboard...</div>
        ) : !statusData ? (
          <div className="staffing-loading-card">No activity data found.</div>
        ) : (
          <>
            <div className="staffing-stats-grid">
              <div className="staffing-stat-card">
                <span>Seats required</span>
                <strong>{statusData.seatsRequired}</strong>
              </div>
              <div className="staffing-stat-card accepted">
                <span>Already accepted</span>
                <strong>{statusData.accepted}</strong>
              </div>
              <div className="staffing-stat-card invited">
                <span>Pending / invited</span>
                <strong>{statusData.invited}</strong>
              </div>
              <div className="staffing-stat-card declined">
                <span>Declined</span>
                <strong>{statusData.declined}</strong>
              </div>
              <div className="staffing-stat-card empty">
                <span>Currently selected</span>
                <strong>{selectedPrimaryIds.length}</strong>
              </div>
            </div>

            <div className="staffing-seat-board">
              <div className="section-head">
                <h2>Current seat board</h2>
                <p>Green accepted, yellow pending, red declined, gray empty.</p>
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

            <div className="staffing-layout">
              <section className="staffing-panel">
                <div className="section-head">
                  <div>
                    <h2>HR shortlisted candidates</h2>
                    <p>Select the employees you want to forward to the manager.</p>
                  </div>

                  <div className="selection-actions">
                    <button
                      type="button"
                      className="secondary-staffing-btn"
                      onClick={handleSelectAll}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="secondary-staffing-btn"
                      onClick={handleClearSelection}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="candidate-list">
                  {primaryCandidates.map((candidate) => {
                    const alreadyInvited = invitedEmployeeIds.has(
                      candidate.employeeId
                    );
                    const selected = selectedPrimaryIds.includes(
                      candidate.employeeId
                    );

                    return (
                      <div key={candidate.employeeId} className="staffing-candidate-card">
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
                              disabled={alreadyInvited}
                              onChange={() =>
                                togglePrimarySelection(candidate.employeeId)
                              }
                            />
                            <span>
                              {alreadyInvited ? "Already invited" : "Include in HR shortlist"}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="primary-staffing-btn"
                  onClick={handleSendToManager}
                  disabled={sendingToManager || selectedPrimaryIds.length === 0}
                >
                  {sendingToManager ? "Opening manager review..." : "Send to manager"}
                </button>
              </section>

              <section className="staffing-panel">
                <div className="section-head">
                  <h2>Backup recommendations</h2>
                  <p>These candidates can be used later if the manager wants adjustments.</p>
                </div>

                <div className="candidate-list">
                  {backupCandidates.map((candidate) => (
                    <div key={candidate.employeeId} className="staffing-candidate-card">
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
                  ))}
                </div>
              </section>
            </div>

            <div className="staffing-panel">
              <div className="section-head">
                <h2>Available backup pool</h2>
                <p>This gives the manager a wider view of replacement options later.</p>
              </div>

              <div className="candidate-list">
                {availableBackups.length === 0 ? (
                  <div className="empty-state-card">No backup pool available.</div>
                ) : (
                  availableBackups.map((candidate) => (
                    <div key={candidate.employeeId} className="staffing-candidate-card">
                      <div className="candidate-main-row">
                        <div className="candidate-avatar">
                          {candidate.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="candidate-info">
                          <div className="candidate-title-row">
                            <h3>{candidate.name}</h3>
                            <span className="score-badge">{candidate.finalScore}/100</span>
                          </div>
                          <p>{candidate.shortReason}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {statusData.invitations.length > 0 ? (
              <section className="staffing-panel">
                <div className="section-head">
                  <h2>Current invitations</h2>
                  <p>These are existing invitation records already stored in the system.</p>
                </div>

                <div className="invitation-list">
                  {statusData.invitations.map((invitation: ActivityInvitationItem, index) => (
                    <div key={invitation._id || invitation.id || index} className="invitation-card">
                      <div className="candidate-title-row">
                        <h3>Employee ID: {invitation.employeeId}</h3>
                        <span className={`status-badge ${invitation.status.toLowerCase()}`}>
                          {invitation.status}
                        </span>
                      </div>

                      <p>
                        Invited at:{" "}
                        {invitation.invitedAt
                          ? new Date(invitation.invitedAt).toLocaleString()
                          : "—"}
                      </p>

                      {invitation.declineReason ? (
                        <p className="decline-reason">
                          Decline reason: {invitation.declineReason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}