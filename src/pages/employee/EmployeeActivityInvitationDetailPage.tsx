import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getMyInvitationDetail,
  respondToInvitation,
} from "../../services/activityInvitations.service";
import { getActivitySkills, type ActivitySkillRecord } from "../../services/activities.service";
import type { EmployeeInvitationDetailResponse } from "../../types/activity-invitations";
import "./employee-activity-invitations.css";

function formatDate(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function EmployeeActivityInvitationDetailPage() {
  const { invitationId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeInvitationDetailResponse | null>(null);
  const [skills, setSkills] = useState<ActivitySkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (!invitationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await getMyInvitationDetail(invitationId);
        if (cancelled) return;
        setData(d);
        try {
          const sk = await getActivitySkills(d.activity._id);
          if (!cancelled) setSkills(Array.isArray(sk) ? sk : []);
        } catch {
          if (!cancelled) setSkills([]);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load invitation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const inv = data?.invitation;
  const act = data?.activity;
  const canRespond = inv?.status === "INVITED";

  const onAccept = async () => {
    if (!invitationId || !canRespond) return;
    setError("");
    setSubmitting(true);
    try {
      await respondToInvitation(invitationId, { status: "ACCEPTED" });
      navigate("/me/activity-invitations", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save response.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDecline = async () => {
    if (!invitationId || !canRespond) return;
    const reason = declineReason.trim();
    if (!reason) {
      setError("Please explain why you decline.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await respondToInvitation(invitationId, {
        status: "DECLINED",
        declineReason: reason,
      });
      navigate("/me/activity-invitations", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save response.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="emp-inv-page">
        <div className="emp-inv-shell">
          <div className="emp-inv-loading">Loading…</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="emp-inv-page">
        <div className="emp-inv-shell">
          <div className="emp-inv-banner emp-inv-banner--error">{error}</div>
        </div>
      </div>
    );
  }

  if (!act || !inv) return null;

  return (
    <div className="emp-inv-page">
      <div className="emp-inv-shell emp-inv-shell--narrow">
        {error ? <div className="emp-inv-banner emp-inv-banner--error">{error}</div> : null}

        <section className="emp-inv-detail-card">
          <div className="emp-inv-detail-head">
            <h1 className="emp-inv-detail-title">{act.title}</h1>
            <span className={`emp-inv-status emp-inv-status--${inv.status.toLowerCase()}`}>
              {inv.status}
            </span>
          </div>

          <div className="emp-inv-detail-grid">
            <div>
              <span className="emp-inv-label">Type</span>
              <p className="emp-inv-value">{act.type}</p>
            </div>
            <div>
              <span className="emp-inv-label">Location</span>
              <p className="emp-inv-value">{act.location || "—"}</p>
            </div>
            <div>
              <span className="emp-inv-label">Start</span>
              <p className="emp-inv-value">{formatDate(act.startDate)}</p>
            </div>
            <div>
              <span className="emp-inv-label">End</span>
              <p className="emp-inv-value">{formatDate(act.endDate)}</p>
            </div>
            <div>
              <span className="emp-inv-label">Duration</span>
              <p className="emp-inv-value">{act.duration || "—"}</p>
            </div>
            <div>
              <span className="emp-inv-label">Seats</span>
              <p className="emp-inv-value">{act.seats}</p>
            </div>
            <div>
              <span className="emp-inv-label">Context</span>
              <p className="emp-inv-value">{act.context}</p>
            </div>
            <div>
              <span className="emp-inv-label">Priority</span>
              <p className="emp-inv-value">{act.priority_level}</p>
            </div>
            {inv.responseDeadlineAt ? (
              <div className="emp-inv-detail-wide">
                <span className="emp-inv-label">Respond by</span>
                <p className="emp-inv-value">{formatDate(inv.responseDeadlineAt)}</p>
              </div>
            ) : null}
            <div className="emp-inv-detail-wide">
              <span className="emp-inv-label">Description</span>
              <p className="emp-inv-value emp-inv-desc">{act.description || "—"}</p>
            </div>
          </div>

          {inv.hrNote ? (
            <div className="emp-inv-note">
              <span className="emp-inv-label">Note</span>
              <p className="emp-inv-value">{inv.hrNote}</p>
            </div>
          ) : null}

          {skills.length > 0 ? (
            <div className="emp-inv-skills">
              <span className="emp-inv-label">Required skills</span>
              <ul>
                {skills.map((s) => (
                  <li key={s._id}>
                    {s.skill_id?.name || s.skill_id?._id}
                    {s.required_level ? ` · ${s.required_level}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {inv.status === "DECLINED" && inv.declineReason ? (
            <div className="emp-inv-note emp-inv-note--muted">
              <span className="emp-inv-label">
                {inv.declineReason === "Missed the response deadline" ? "Outcome" : "Your reason"}
              </span>
              <p className="emp-inv-value">{inv.declineReason}</p>
            </div>
          ) : null}
        </section>

        {canRespond ? (
          <div className="emp-inv-actions">
            <button
              type="button"
              className="emp-inv-btn emp-inv-btn--primary"
              disabled={submitting}
              onClick={onAccept}
            >
              {submitting ? "…" : "Accept"}
            </button>
            {!declineMode ? (
              <button
                type="button"
                className="emp-inv-btn emp-inv-btn--secondary"
                disabled={submitting}
                onClick={() => {
                  setDeclineMode(true);
                  setError("");
                }}
              >
                Decline
              </button>
            ) : (
              <div className="emp-inv-decline">
                <label className="emp-inv-label" htmlFor="decline-reason">
                  Why are you declining?
                </label>
                <textarea
                  id="decline-reason"
                  className="emp-inv-textarea"
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Required"
                  disabled={submitting}
                />
                <div className="emp-inv-actions-row">
                  <button
                    type="button"
                    className="emp-inv-btn emp-inv-btn--ghost"
                    disabled={submitting}
                    onClick={() => {
                      setDeclineMode(false);
                      setDeclineReason("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="emp-inv-btn emp-inv-btn--danger"
                    disabled={submitting}
                    onClick={onDecline}
                  >
                    {submitting ? "…" : "Confirm decline"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
