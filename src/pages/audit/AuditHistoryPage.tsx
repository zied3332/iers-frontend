import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMyAuditHistory,
  type AuditHistoryRow,
  type HistoryPeriod,
} from "../../services/auditHistory.service";
import "./audit-history-page.css";

const ACTION_LABELS: Record<string, string> = {
  PROFILE_UPDATED: "Profile updated",
  SKILL_ASSIGNED: "Skill assigned",
  SKILL_REMOVED: "Skill removed",
  SKILL_LEVEL_UPDATED: "Skill level updated",
  ACTIVITY_INVITATION_ACCEPTED: "Invitation accepted",
  ACTIVITY_INVITATION_DECLINED: "Invitation declined",
  ACTIVITY_INVITATION_MISSED_DEADLINE: "Missed deadline",
};

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

function formatWhen(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

function formatFullTimestamp(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/** Visual group for badge color */
function actionTone(action: string): string {
  if (action.includes("PROFILE")) return "audit-history-card__badge--profile";
  if (action.includes("SKILL")) return "audit-history-card__badge--skill";
  if (action.includes("ACCEPTED")) return "audit-history-card__badge--success";
  if (action.includes("DECLINED") || action.includes("MISSED"))
    return "audit-history-card__badge--muted";
  return "audit-history-card__badge--default";
}

/** Strip Mongo-style id fields from metadata — not shown to users. */
function isHiddenMetadataKey(key: string): boolean {
  const compact = key.replace(/\s+/g, "").toLowerCase();
  if (compact === "id" || compact.endsWith("_id")) return true;
  return /^(invitation|activity|employee|subject|actor|user)id$/.test(compact);
}

function filterPublicMetadata(
  meta?: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (k && !isHiddenMetadataKey(k)) out[k] = v;
  }
  return out;
}

function MetadataBlock({ meta }: { meta?: Record<string, unknown> }) {
  const entries = Object.entries(filterPublicMetadata(meta)).filter(([k]) => k !== "");
  if (entries.length === 0) {
    return <p className="audit-history-modal__empty-meta">No extra fields stored for this event.</p>;
  }
  return (
    <dl className="audit-history-modal__meta">
      {entries.map(([key, raw]) => (
        <div key={key} className="audit-history-modal__meta-row">
          <dt>{humanizeKey(key)}</dt>
          <dd>
            {raw !== null &&
            typeof raw === "object" &&
            !(raw instanceof Date) &&
            !Array.isArray(raw) ? (
              <pre className="audit-history-modal__pre">{JSON.stringify(raw, null, 2)}</pre>
            ) : (
              String(raw ?? "—")
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditHistoryPage() {
  const [rows, setRows] = useState<AuditHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AuditHistoryRow | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [period, setPeriod] = useState<HistoryPeriod>("all");

  const subtitle = useMemo(
    () =>
      "Profile changes, skills, and activity responses — kept for traceability and internal audits.",
    []
  );

  const closeModal = useCallback(() => setDetail(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (detail) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [detail, closeModal]);

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
        const data = await fetchMyAuditHistory({
          limit: 200,
          skip: 0,
          q: debouncedSearch || undefined,
          period,
        });
        if (cancelled) return;
        setRows(Array.isArray(data.items) ? data.items : []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load history.");
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

  const detailLabel = detail
    ? ACTION_LABELS[detail.action] || detail.action.replace(/_/g, " ")
    : "";

  const detailPublicMeta = detail ? filterPublicMetadata(detail.metadata) : {};
  const hasPublicMeta = Object.keys(detailPublicMeta).length > 0;

  return (
    <div className="audit-history-page">
      <header className="audit-history-page__header">
        <h1 className="audit-history-page__title">My history</h1>
        <p className="audit-history-page__subtitle">{subtitle}</p>
      </header>

      <div className="audit-history-toolbar" role="search">
        <label className="audit-history-toolbar__search-label">
          <span className="visually-hidden">Search history</span>
          <input
            type="search"
            className="audit-history-toolbar__search"
            placeholder="Search summary or event type…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="audit-history-toolbar__filters" aria-label="Date range">
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
                  ? "audit-history-toolbar__chip audit-history-toolbar__chip--active"
                  : "audit-history-toolbar__chip"
              }
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="audit-history-page__body">
        {error ? (
          <div className="audit-history-page__banner audit-history-page__banner--error" role="alert">
            <strong>Something went wrong.</strong> {error}
          </div>
        ) : null}

        {loading ? (
          <div className="audit-history-page__loading">
            <span className="audit-history-page__loading-dot" aria-hidden />
            Loading your activity…
          </div>
        ) : rows.length === 0 ? (
          <div className="audit-history-page__empty-card">
            <p className="audit-history-page__empty-title">
              {filtersActive ? "No matching events" : "Nothing here yet"}
            </p>
            <p className="audit-history-page__empty-copy">
              {filtersActive
                ? "Try another search term or switch the date filter. Events outside this week or month are hidden when those filters are on."
                : "When you update your profile, change skills, or respond to invitations, entries will show up here. Click an entry to see full audit details."}
            </p>
          </div>
        ) : (
          <ul className="audit-history-page__grid" aria-label="Audit timeline">
            {rows.map((r) => {
              const when = formatWhen(r.createdAt);
              const label = ACTION_LABELS[r.action] || r.action.replace(/_/g, " ");
              return (
                <li key={r._id}>
                  <button
                    type="button"
                    className="audit-history-card"
                    onClick={() => setDetail(r)}
                    aria-label={`Open details: ${label}, ${r.summary}`}
                  >
                    <div className="audit-history-card__top">
                      <span className={`audit-history-card__badge ${actionTone(r.action)}`}>
                        {label}
                      </span>
                      <div className="audit-history-card__when">
                        <span className="audit-history-card__date">{when.date}</span>
                        {when.time ? (
                          <span className="audit-history-card__time">{when.time}</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="audit-history-card__summary">{r.summary}</p>
                    <span className="audit-history-card__hint">Click for details</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detail ? (
        <div
          className="audit-history-modal__backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="audit-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-history-modal-title"
          >
            <div className="audit-history-modal__head">
              <div>
                <p className="audit-history-modal__eyebrow">Event details</p>
                <h2 id="audit-history-modal-title" className="audit-history-modal__title">
                  {detailLabel}
                </h2>
              </div>
              <button
                type="button"
                className="audit-history-modal__close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="audit-history-modal__section">
              <h3 className="audit-history-modal__label">Summary</h3>
              <p className="audit-history-modal__text">{detail.summary}</p>
            </div>

            <div className="audit-history-modal__section">
              <h3 className="audit-history-modal__label">When</h3>
              <p className="audit-history-modal__text">{formatFullTimestamp(detail.createdAt)}</p>
            </div>

            {detail.subjectUserId !== detail.actorUserId ? (
              <div className="audit-history-modal__section">
                <p className="audit-history-modal__note" style={{ margin: 0 }}>
                  This action was performed by another account on your behalf.
                </p>
              </div>
            ) : null}

            {hasPublicMeta ? (
              <div className="audit-history-modal__section">
                <h3 className="audit-history-modal__label">Details</h3>
                <MetadataBlock meta={detail.metadata} />
              </div>
            ) : null}

            <div className="audit-history-modal__footer">
              <button type="button" className="audit-history-modal__btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
