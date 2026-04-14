import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createInvitations,
  getActivityStaffingStatus,
  getNextBackupCandidates,
  replaceDeclinedInvitation,
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

  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState("");

  const [statusData, setStatusData] =
    useState<ActivityStaffingStatusResponse | null>(null);

  const [primaryCandidates, setPrimaryCandidates] = useState<CandidateItem[]>([]);
  const [backupCandidates, setBackupCandidates] = useState<CandidateItem[]>([]);
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState<string[]>([]);

  const [availableBackups, setAvailableBackups] = useState<CandidateItem[]>([]);
  const [declinedInvitationId, setDeclinedInvitationId] = useState("");
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");

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

  const invitedEmployeeIds = useMemo(() => {
    return new Set((statusData?.invitations || []).map((inv) => inv.employeeId));
  }, [statusData]);

  const declinedInvitations = useMemo(() => {
    return (statusData?.invitations || []).filter(
      (inv) => inv.status === "DECLINED"
    );
  }, [statusData]);

  const togglePrimarySelection = (employeeId: string) => {
    setSelectedPrimaryIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleInviteSelected = async () => {
    if (!activityId || selectedPrimaryIds.length === 0) return;

    try {
      setInviting(true);
      setError("");

      await createInvitations({
        activityId,
        employeeIds: selectedPrimaryIds,
        hrNote: "Selected from AI recommendation workflow.",
      });

      setSelectedPrimaryIds([]);
      await loadPage();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to send invitations.");
    } finally {
      setInviting(false);
    }
  };

  const handleReplaceDeclined = async () => {
    if (!declinedInvitationId || !replacementEmployeeId) {
      setError("Please select both a declined invitation and a backup employee.");
      return;
    }

    try {
      setReplacing(true);
      setError("");

      await replaceDeclinedInvitation({
        declinedInvitationId,
        replacementEmployeeId,
      });

      setDeclinedInvitationId("");
      setReplacementEmployeeId("");
      await loadPage();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to replace declined invitation."
      );
    } finally {
      setReplacing(false);
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
            <span className="staffing-kicker">Activity staffing</span>
            <h1>{statusData?.activityTitle || "Loading activity..."}</h1>
            <p>
              Invite employees, monitor responses, and replace declined seats
              with backup recommendations.
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
                <span>Accepted</span>
                <strong>{statusData.accepted}</strong>
              </div>
              <div className="staffing-stat-card invited">
                <span>Pending / Invited</span>
                <strong>{statusData.invited}</strong>
              </div>
              <div className="staffing-stat-card declined">
                <span>Declined</span>
                <strong>{statusData.declined}</strong>
              </div>
              <div className="staffing-stat-card empty">
                <span>Empty seats</span>
                <strong>{statusData.emptySeats}</strong>
              </div>
            </div>

            <div className="staffing-seat-board">
              <div className="section-head">
                <h2>Seat board</h2>
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
                  <h2>Primary recommendations</h2>
                  <p>Select people to invite for this activity.</p>
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
                              {alreadyInvited ? "Already invited" : "Select for invite"}
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
                  onClick={handleInviteSelected}
                  disabled={inviting || selectedPrimaryIds.length === 0}
                >
                  {inviting ? "Sending invitations..." : "Invite selected"}
                </button>
              </section>

              <section className="staffing-panel">
                <div className="section-head">
                  <h2>Backup recommendations</h2>
                  <p>Use these when a selected employee declines.</p>
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

            <div className="staffing-layout">
              <section className="staffing-panel">
                <div className="section-head">
                  <h2>Current invitations</h2>
                  <p>Track invitation state and decline reasons.</p>
                </div>

                <div className="invitation-list">
                  {statusData.invitations.length === 0 ? (
                    <div className="empty-state-card">No invitations sent yet.</div>
                  ) : (
                    statusData.invitations.map((invitation: ActivityInvitationItem, index) => (
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
                    ))
                  )}
                </div>
              </section>

              <section className="staffing-panel">
                <div className="section-head">
                  <h2>Replace declined invitation</h2>
                  <p>Quickly fill empty seats using the next backup candidates.</p>
                </div>

                <div className="replace-form">
                  <label>
                    <span>Declined invitation</span>
                    <select
                      value={declinedInvitationId}
                      onChange={(e) => setDeclinedInvitationId(e.target.value)}
                    >
                      <option value="">Select declined invitation</option>
                      {declinedInvitations.map((inv, index) => (
                        <option
                          key={inv._id || inv.id || index}
                          value={inv._id || inv.id || ""}
                        >
                          {inv.employeeId} {inv.declineReason ? `- ${inv.declineReason}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Replacement employee</span>
                    <select
                      value={replacementEmployeeId}
                      onChange={(e) => setReplacementEmployeeId(e.target.value)}
                    >
                      <option value="">Select backup employee</option>
                      {availableBackups.map((candidate) => (
                        <option key={candidate.employeeId} value={candidate.employeeId}>
                          {candidate.name} - score {candidate.finalScore}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className="primary-staffing-btn"
                    onClick={handleReplaceDeclined}
                    disabled={replacing || !declinedInvitationId || !replacementEmployeeId}
                  >
                    {replacing ? "Replacing..." : "Replace with backup"}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}