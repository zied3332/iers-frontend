import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getActivityStaffingStatus,
  getNextBackupCandidates,
  replaceDeclinedInvitation,
} from "../../services/activityInvitations.service";
import type {
  ActivityInvitationItem,
  ActivityStaffingStatusResponse,
} from "../../types/activity-invitations";
import "../hr/ActivityStaffingPage.css";

function formatDate(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function ManagerActivityStaffingPage() {
  const { activityId = "" } = useParams();
  const [status, setStatus] = useState<ActivityStaffingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [replacementDays, setReplacementDays] = useState(3);
  const [pickEmployeeByDeclined, setPickEmployeeByDeclined] = useState<
    Record<string, string>
  >({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    setError("");
    try {
      const staffing = await getActivityStaffingStatus(activityId);
      setStatus(staffing);
      setReplacementDays(staffing.managerReplacementResponseDays ?? 3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load staffing.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const declinedInvitations = useMemo(() => {
    const list = status?.invitations || [];
    return list.filter((i) => i.status === "DECLINED");
  }, [status?.invitations]);

  type BackupRow = Awaited<ReturnType<typeof getNextBackupCandidates>>["availableBackups"][number];

  const [backupOptions, setBackupOptions] = useState<Record<string, BackupRow[]>>({});

  useEffect(() => {
    if (!activityId || declinedInvitations.length === 0) {
      setBackupOptions({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getNextBackupCandidates(activityId, 30);
        if (cancelled) return;
        const opts = data.availableBackups || [];
        const next: Record<string, BackupRow[]> = {};
        for (const inv of declinedInvitations) {
          const id = inv._id || inv.id || "";
          if (id) next[id] = opts;
        }
        setBackupOptions(next);
      } catch {
        if (!cancelled) setBackupOptions({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, declinedInvitations]);

  const handleReplace = async (inv: ActivityInvitationItem) => {
    const invId = inv._id || inv.id || "";
    if (!invId || !activityId) return;
    const replacementEmployeeId = pickEmployeeByDeclined[invId];
    if (!replacementEmployeeId) {
      setError("Choose a replacement candidate.");
      return;
    }
    setError("");
    setSuccess("");
    setSubmittingId(invId);
    try {
      await replaceDeclinedInvitation({
        declinedInvitationId: invId,
        replacementEmployeeId,
        replacementResponseDays: replacementDays,
      });
      setSuccess("Replacement invitation sent.");
      setPickEmployeeByDeclined((prev) => {
        const next = { ...prev };
        delete next[invId];
        return next;
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Replacement failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="activity-staffing-page">
      <div className="staffing-shell">
        <div className="staffing-header">
          <div>
            <span className="staffing-kicker">Manager staffing</span>
            <h1>{status?.activityTitle || "Activity staffing"}</h1>
            <p>
              Handle declined or overdue invitations: pick someone from backups. New invites use your
              replacement response deadline (calendar days).
            </p>
            <Link to={`/manager/activities`} className="secondary-staffing-btn" style={{ display: "inline-block", marginTop: 8 }}>
              ← Back to activities
            </Link>
          </div>
        </div>

        {error ? <div className="staffing-error">{error}</div> : null}
        {success ? <div className="staffing-success">{success}</div> : null}

        {loading ? (
          <div className="staffing-loading-card">Loading…</div>
        ) : !status ? (
          <div className="staffing-loading-card">No data.</div>
        ) : (
          <>
            <div className="staffing-stats-grid">
              <div className="staffing-stat-card">
                <span>Seats</span>
                <strong>{status.seatsRequired}</strong>
              </div>
              <div className="staffing-stat-card accepted">
                <span>Accepted</span>
                <strong>{status.accepted}</strong>
              </div>
              <div className="staffing-stat-card invited">
                <span>Pending</span>
                <strong>{status.invited}</strong>
              </div>
              <div className="staffing-stat-card declined">
                <span>Declined / overdue</span>
                <strong>{status.declined}</strong>
              </div>
            </div>

            <div className="staffing-panel" style={{ marginTop: 16 }}>
              <div className="section-head">
                <h2>Replacement response deadline</h2>
                <p>Applies to invitations you send after a decline or missed HR deadline.</p>
              </div>
              <label className="select-checkbox" style={{ alignItems: "center", gap: 12 }}>
                <span>Days for replacement to respond</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={replacementDays}
                  onChange={(e) => setReplacementDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                  style={{ width: 80 }}
                />
              </label>
            </div>

            <div className="staffing-panel" style={{ marginTop: 24 }}>
              <div className="section-head">
                <h2>Needs replacement</h2>
                <p>Each row is a declined slot (including automatic decline after the HR deadline).</p>
              </div>

              {declinedInvitations.length === 0 ? (
                <div className="staffing-loading-card">No declined invitations right now.</div>
              ) : (
                <div className="candidate-list">
                  {declinedInvitations.map((inv) => {
                    const invId = inv._id || inv.id || "";
                    const options = backupOptions[invId] || [];
                    const missed = inv.declineReason === "Missed the response deadline";
                    return (
                      <div key={invId} className="staffing-candidate-card">
                        <div className="candidate-main-row">
                          <div className="candidate-info">
                            <h3>{inv.employeeName || inv.employeeId}</h3>
                            <p className="mini-chip-row">
                              <span>{missed ? "Missed deadline" : "Declined"}</span>
                              {inv.declineReason ? <span>{inv.declineReason}</span> : null}
                            </p>
                            <p style={{ fontSize: 13, opacity: 0.85 }}>
                              Invited {formatDate(inv.invitedAt)} · Deadline{" "}
                              {formatDate(inv.responseDeadlineAt)}
                            </p>
                          </div>
                        </div>
                        <div className="candidate-actions-row" style={{ flexWrap: "wrap", gap: 12 }}>
                          <select
                            value={pickEmployeeByDeclined[invId] || ""}
                            onChange={(e) =>
                              setPickEmployeeByDeclined((prev) => ({
                                ...prev,
                                [invId]: e.target.value,
                              }))
                            }
                            style={{ minWidth: 220, padding: 8 }}
                          >
                            <option value="">Select backup…</option>
                            {options.map((b) => (
                              <option key={b.employeeId} value={b.employeeId}>
                                {b.name} · {b.finalScore}/100
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="primary-staffing-btn"
                            disabled={submittingId === invId || !pickEmployeeByDeclined[invId]}
                            onClick={() => handleReplace(inv)}
                          >
                            {submittingId === invId ? "…" : "Send replacement invite"}
                          </button>
                        </div>
                        {options.length === 0 ? (
                          <p style={{ fontSize: 13, color: "#b45309" }}>No backups left in the pool for this activity.</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="staffing-panel" style={{ marginTop: 24 }}>
              <div className="section-head">
                <h2>All invitations</h2>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(status.invitations || []).map((inv) => (
                  <li
                    key={inv._id || inv.id || inv.employeeId}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {inv.employeeName || inv.employeeId} · {inv.status}
                    </span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>
                      deadline {formatDate(inv.responseDeadlineAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
