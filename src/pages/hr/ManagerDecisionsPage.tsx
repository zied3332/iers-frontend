import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getActivityById, type ActivityRecord } from "../../services/activities.service";
import {
  getActivityInvitations,
  hrFinalLaunch,
} from "../../services/activityInvitations.service";
import type { ActivityInvitationItem } from "../../types/activity-invitations";
import { getActivityReview } from "../../services/activityReviews.service";
import type { ActivityReviewRecord } from "../../types/activity-review";
import { FiArrowLeft, FiCheckCircle, FiLock, FiUsers } from "react-icons/fi";
import "./ManagerDecisionsPage.css";

export default function ManagerDecisionsPage() {
  const { activityId = "" } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [invitations, setInvitations] = useState<ActivityInvitationItem[]>([]);
  const [review, setReview] = useState<ActivityReviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!activityId) return;
      setLoading(true);
      setError("");
      try {
        const [activityData, invitationsData, reviewData] = await Promise.all([
          getActivityById(activityId),
          getActivityInvitations(activityId),
          getActivityReview(activityId).catch(() => null),
        ]);
        setActivity(activityData);
        setInvitations(invitationsData);
        setReview(reviewData);
      } catch (e: unknown) {
        console.error("Failed to load data:", e);
        setError(e instanceof Error ? e.message : "Failed to load manager list.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activityId]);

  const acceptedCandidates = useMemo(
    () => invitations.filter((inv) => inv.status === "ACCEPTED"),
    [invitations]
  );
  const declinedCandidates = useMemo(
    () => invitations.filter((inv) => inv.status === "DECLINED"),
    [invitations]
  );
  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invitations) {
      if (inv.employeeId && inv.employeeName) {
        map.set(String(inv.employeeId), String(inv.employeeName));
      }
    }
    return map;
  }, [invitations]);
  const managerRefusedCandidates = useMemo(() => {
    const hrSelected = Array.isArray(review?.hrSelectedEmployeeIds)
      ? review.hrSelectedEmployeeIds
      : [];
    const managerSelected = new Set(
      Array.isArray(review?.managerSelectedEmployeeIds)
        ? review.managerSelectedEmployeeIds
        : []
    );
    return hrSelected
      .filter((employeeId) => !managerSelected.has(employeeId))
      .map((employeeId) => ({
        employeeId,
        employeeName: employeeNameById.get(employeeId) || `Employee ID: ${employeeId}`,
      }));
  }, [review, employeeNameById]);

  const launched = Boolean(
    activity?.hrFinalLaunchAt ||
      activity?.status === "IN_PROGRESS" ||
      activity?.workflowStatus === "IN_PROGRESS"
  );

  const canFinalValidation =
    Boolean(activity?.rosterReadyForHrAt) && !launched && !activity?.hrFinalLaunchAt;

  const handleFinalValidation = async () => {
    if (!activityId) return;
    setError("");
    setFinalizing(true);
    try {
      await hrFinalLaunch(activityId);
      const [activityData, invitationsData, reviewData] = await Promise.all([
        getActivityById(activityId),
        getActivityInvitations(activityId),
        getActivityReview(activityId).catch(() => null),
      ]);
      setActivity(activityData);
      setInvitations(invitationsData);
      setReview(reviewData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Final validation failed.");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="manager-decisions-page">
        <div className="decisions-shell decisions-shell--wide">
          <div className="decisions-shell-state decisions-shell-state--loading">
            <p>Loading manager list…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="manager-decisions-page">
        <div className="decisions-shell decisions-shell--wide">
          <div className="decisions-shell-state decisions-shell-state--error">
            <p>{error}</p>
            <button type="button" className="decisions-secondary-btn" onClick={() => navigate(-1)}>
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="manager-decisions-page">
        <div className="decisions-shell decisions-shell--wide">
          <div className="decisions-shell-state decisions-shell-state--muted">
            <p>Activity not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-decisions-page">
      <div className="decisions-shell decisions-shell--wide">
        <div className="decisions-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(`/hr/activities/${activityId}/staffing`)}
          >
            <FiArrowLeft /> Back to staffing
          </button>
          <div className="decisions-header__lead">
            <span className="decisions-kicker">Manager list</span>
            <h1>{activity.title}</h1>
            <p>
              {launched
                ? "Final participant list — read-only."
                : "Participants and invitation outcomes for this activity."}
            </p>
          </div>
        </div>

        {error ? <div className="decisions-error">{error}</div> : null}

        {canFinalValidation ? (
          <div className="manager-decisions-final-banner">
            <div>
              <strong>Final validation</strong>
              <p>
                The manager confirmed every seat is accepted. Validate once to move the activity to{" "}
                <strong>In progress</strong> and lock staffing.
              </p>
            </div>
            <button
              type="button"
              className="manager-decisions-final-btn"
              disabled={finalizing}
              onClick={() => void handleFinalValidation()}
            >
              {finalizing ? "…" : "Final validation"}
            </button>
          </div>
        ) : null}

        {!activity.rosterReadyForHrAt && !launched ? (
          <div className="manager-decisions-hint-banner">
            <FiUsers />
            <span>
              The manager must send the roster from their review page (<strong>Send to HR</strong>)
              once everyone has accepted. Then final validation unlocks here.
            </span>
          </div>
        ) : null}

        {launched ? (
          <section className="decisions-section decisions-section--final">
            <div className="section-header accepted">
              <FiLock />
              <h2>Final participant list ({acceptedCandidates.length})</h2>
            </div>
            <p className="decisions-final-note">
              Activity status: <strong>In progress</strong>. Staffing choices are closed.
            </p>
          </section>
        ) : null}

        <div className="decisions-stats-grid">
          <div className="decisions-stat-card accepted">
            <FiCheckCircle size={24} />
            <div>
              <span>Accepted</span>
              <strong>{acceptedCandidates.length}</strong>
            </div>
          </div>
          <div className="decisions-stat-card rejected">
            <FiUsers size={24} />
            <div>
              <span>Declined</span>
              <strong>{declinedCandidates.length}</strong>
            </div>
          </div>
          <div className="decisions-stat-card pending">
            <FiUsers size={24} />
            <div>
              <span>Manager refused</span>
              <strong>{managerRefusedCandidates.length}</strong>
            </div>
          </div>
          <div className="decisions-stat-card total">
            <FiUsers size={24} />
            <div>
              <span>All invitations</span>
              <strong>{invitations.length}</strong>
            </div>
          </div>
        </div>

        {acceptedCandidates.length > 0 && (
          <section className="decisions-section">
            <div className="section-header accepted">
              <FiCheckCircle />
              <h2>Accepted ({acceptedCandidates.length})</h2>
            </div>
            <div className="candidates-list">
              {acceptedCandidates.map((invitation) => (
                <div key={invitation._id || invitation.id} className="candidate-card accepted">
                  <div className="candidate-info">
                    <div className="candidate-name">
                      <FiCheckCircle className="candidate-check-icon" aria-hidden />
                      <h3>{invitation.employeeName || `Employee ID: ${invitation.employeeId}`}</h3>
                      <span className="status-badge status-accepted">ACCEPTED</span>
                    </div>
                    <p className="invited-date">
                      {invitation.respondedAt ? "Accepted: " : "Invited: "}
                      {invitation.respondedAt
                        ? new Date(invitation.respondedAt).toLocaleString()
                        : invitation.invitedAt
                          ? new Date(invitation.invitedAt).toLocaleDateString()
                          : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {declinedCandidates.length > 0 && (
          <section className="decisions-section">
            <div className="section-header rejected">
              <FiUsers />
              <h2>Declined by employees ({declinedCandidates.length})</h2>
            </div>
            <div className="candidates-list">
              {declinedCandidates.map((invitation) => (
                <div key={invitation._id || invitation.id} className="candidate-card rejected">
                  <div className="candidate-info">
                    <div className="candidate-name">
                      <h3>{invitation.employeeName || `Employee ID: ${invitation.employeeId}`}</h3>
                      <span className="status-badge status-rejected">DECLINED</span>
                    </div>
                    <p className="invited-date">
                      Declined:{" "}
                      {invitation.respondedAt
                        ? new Date(invitation.respondedAt).toLocaleString()
                        : "—"}
                    </p>
                    <p className="decline-reason">
                      <strong>Reason:</strong> {invitation.declineReason || "No reason provided."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {managerRefusedCandidates.length > 0 && (
          <section className="decisions-section">
            <div className="section-header pending">
              <FiUsers />
              <h2>Manager refused from shortlist ({managerRefusedCandidates.length})</h2>
            </div>
            <div className="candidates-list">
              {managerRefusedCandidates.map((employee) => (
                <div key={employee.employeeId} className="candidate-card pending">
                  <div className="candidate-info">
                    <div className="candidate-name">
                      <h3>{employee.employeeName}</h3>
                      <span className="status-badge status-pending">REFUSED BY MANAGER</span>
                    </div>
                    <p className="manager-note">
                      <strong>Manager reason:</strong>{" "}
                      {review?.managerNote?.trim()
                        ? review.managerNote
                        : "No manager reason provided."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {invitations.length === 0 && (
          <div className="empty-state">
            <FiUsers size={48} />
            <p>No invitations yet.</p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate(`/hr/activities/${activityId}/staffing`)}
            >
              Go to staffing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
