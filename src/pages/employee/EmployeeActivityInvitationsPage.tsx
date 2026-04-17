import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyInvitations } from "../../services/activityInvitations.service";
import type { EmployeeInvitationListItem } from "../../types/activity-invitations";
import "./employee-activity-invitations.css";

function formatDate(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function EmployeeActivityInvitationsPage() {
  const [items, setItems] = useState<EmployeeInvitationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyInvitations();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load invitations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="emp-inv-page">
      <div className="emp-inv-shell">
        <header className="emp-inv-header">
          <h1 className="emp-inv-title">Activity invitations</h1>
          <p className="emp-inv-sub">Open an activity to view details and respond.</p>
        </header>

        {error ? <div className="emp-inv-banner emp-inv-banner--error">{error}</div> : null}

        {loading ? (
          <div className="emp-inv-loading">Loading…</div>
        ) : items.length === 0 ? (
          <div className="emp-inv-empty">No invitations yet.</div>
        ) : (
          <ul className="emp-inv-card-list">
            {items.map((inv) => (
              <li key={inv._id}>
                <Link className="emp-inv-card" to={`/me/activity-invitations/${inv._id}`}>
                  <div className="emp-inv-card__main">
                    <h2 className="emp-inv-card__title">
                      {inv.activityTitle || "Activity"}
                    </h2>
                    <p className="emp-inv-card__meta">
                      {inv.activityType} · {inv.activityLocation || "—"}
                    </p>
                    <p className="emp-inv-card__dates">
                      {formatDate(inv.activityStartDate)} → {formatDate(inv.activityEndDate)}
                    </p>
                    {inv.status === "INVITED" && inv.responseDeadlineAt ? (
                      <p className="emp-inv-card__dates" style={{ fontSize: 13 }}>
                        Respond by {formatDate(inv.responseDeadlineAt)}
                      </p>
                    ) : null}
                  </div>
                  <span className={`emp-inv-status emp-inv-status--${inv.status.toLowerCase()}`}>
                    {inv.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
