import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyInvitations,
  type InvitationsPeriod,
} from "../../services/activityInvitations.service";
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
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [period, setPeriod] = useState<InvitationsPeriod>("all");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyInvitations({
          q: debouncedSearch || undefined,
          period,
        });
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
  }, [debouncedSearch, period]);

  const filtersActive = period !== "all" || debouncedSearch.length > 0;

  return (
    <div className="emp-inv-page">
      <div className="emp-inv-shell">
        <header className="emp-inv-header">
          <h1 className="emp-inv-title">Activity invitations</h1>
          <p className="emp-inv-sub">Open an activity to view details and respond.</p>
        </header>

        <div className="emp-inv-toolbar" role="search">
          <label className="emp-inv-toolbar__search-label">
            <span className="emp-inv-visually-hidden">Search invitations</span>
            <input
              type="search"
              className="emp-inv-toolbar__search"
              placeholder="Search by title, type, location, status…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="emp-inv-toolbar__filters" aria-label="Invitation date">
            {(
              [
                ["all", "All dates"],
                ["week", "This week"],
                ["month", "This month"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={
                  period === key
                    ? "emp-inv-toolbar__chip emp-inv-toolbar__chip--active"
                    : "emp-inv-toolbar__chip"
                }
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="emp-inv-banner emp-inv-banner--error">{error}</div> : null}

        {loading ? (
          <div className="emp-inv-loading">Loading…</div>
        ) : items.length === 0 ? (
          <div className="emp-inv-empty">
            {filtersActive
              ? "No invitations match your search or date filter."
              : "No invitations yet."}
          </div>
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
