import { useMemo, useState } from "react";
import type { ActivityRecord } from "../../../services/activities.service";

type ActivitiesCalendarProps = {
  activities: ActivityRecord[];
  loading?: boolean;
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const jsDay = firstOfMonth.getDay();
  const mondayStartOffset = jsDay === 0 ? 6 : jsDay - 1;

  const cells: Array<Date | null> = [
    ...Array.from({ length: mondayStartOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, idx) => new Date(year, month, idx + 1)),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function ActivitiesCalendar({
  activities,
  loading = false,
}: ActivitiesCalendarProps) {
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const today = new Date();

  const calendarMonthLabel = useMemo(
    () =>
      calendarDate.toLocaleString("en", {
        month: "long",
        year: "numeric",
      }),
    [calendarDate]
  );

  const calendarCells = useMemo(() => getMonthGrid(calendarDate), [calendarDate]);

  const dayInfo = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const info = new Map<
      number,
      {
        startCount: number;
        endCount: number;
      }
    >();

    for (let i = 1; i <= 31; i++) {
      info.set(i, { startCount: 0, endCount: 0 });
    }

    activities.forEach((activity) => {
      const start = new Date(activity.startDate || activity.createdAt || "");
      const end = new Date(
        activity.endDate || activity.startDate || activity.createdAt || ""
      );

      if (!Number.isNaN(start.getTime()) && start.getFullYear() === year && start.getMonth() === month) {
        const entry = info.get(start.getDate());
        if (entry) entry.startCount += 1;
      }

      if (!Number.isNaN(end.getTime()) && end.getFullYear() === year && end.getMonth() === month) {
        const entry = info.get(end.getDate());
        if (entry) entry.endCount += 1;
      }
    });

    return info;
  }, [activities, calendarDate]);

  const monthlyHighlights = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    return [...activities]
      .filter((activity) => {
        const start = new Date(activity.startDate || activity.createdAt || "");
        return (
          !Number.isNaN(start.getTime()) &&
          start.getFullYear() === year &&
          start.getMonth() === month
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startDate || a.createdAt || 0).getTime() -
          new Date(b.startDate || b.createdAt || 0).getTime()
      )
      .slice(0, 4);
  }, [activities, calendarDate]);

  const stats = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    let started = 0;
    let ended = 0;

    activities.forEach((activity) => {
      const start = new Date(activity.startDate || activity.createdAt || "");
      const end = new Date(
        activity.endDate || activity.startDate || activity.createdAt || ""
      );

      if (!Number.isNaN(start.getTime()) && start.getFullYear() === year && start.getMonth() === month) {
        started += 1;
      }

      if (!Number.isNaN(end.getTime()) && end.getFullYear() === year && end.getMonth() === month) {
        ended += 1;
      }
    });

    return { started, ended };
  }, [activities, calendarDate]);

  return (
    <section
      style={{
        background: "var(--card)",
        borderRadius: "28px",
        padding: "24px",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 900,
              color: "var(--text)",
            }}
          >
            {calendarMonthLabel}
          </div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: "13px",
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            Activities overview
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setCalendarDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            style={navBtnStyle}
          >
            ←
          </button>

          <button
            type="button"
            onClick={() =>
              setCalendarDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
            style={navBtnStyle}
          >
            →
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.04em",
              paddingBottom: "2px",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {calendarCells.map((cell, index) => {
          const isEmpty = !cell;
          const isToday = cell ? sameDay(cell, today) : false;

          const info = cell
            ? dayInfo.get(cell.getDate()) || { startCount: 0, endCount: 0 }
            : { startCount: 0, endCount: 0 };

          const hasStart = info.startCount > 0;
          const hasEnd = info.endCount > 0;
          const hasAny = hasStart || hasEnd;

          return (
            <div
              key={`${cell ? cell.toISOString() : "empty"}-${index}`}
              style={{
                height: "46px",
                borderRadius: "14px",
                border: isEmpty
                  ? "1px solid transparent"
                  : isToday
                  ? "1px solid #93c5fd"
                  : hasAny
                  ? "1px solid #d7dee8"
                  : "1px solid var(--border)",
                background: isEmpty ? "transparent" : "var(--surface-2)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEmpty ? "transparent" : "var(--text)",
                fontWeight: 800,
                fontSize: "14px",
              }}
            >
              {cell ? cell.getDate() : ""}

              {!isEmpty && hasStart && (
                <div
                  style={{
                    position: "absolute",
                    left: "8px",
                    bottom: "7px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "#1faa72",
                    }}
                  />
                  {info.startCount > 1 ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#1faa72",
                        lineHeight: 1,
                      }}
                    >
                      {info.startCount}
                    </span>
                  ) : null}
                </div>
              )}

              {!isEmpty && hasEnd && (
                <div
                  style={{
                    position: "absolute",
                    right: "8px",
                    bottom: "7px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {info.endCount > 1 ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#f59e0b",
                        lineHeight: 1,
                      }}
                    >
                      {info.endCount}
                    </span>
                  ) : null}
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "#f59e0b",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: "14px",
          color: "var(--muted)",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        <LegendDot color="#1faa72" label="Activity start" />
        <LegendDot color="#f59e0b" label="Activity end" />

        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "var(--muted)",
            fontWeight: 700,
          }}
        >
          {stats.started} starts • {stats.ended} ends
        </span>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gap: "10px",
        }}
      >
        {loading ? (
          <div style={emptyStateStyle}>Loading activities...</div>
        ) : monthlyHighlights.length === 0 ? (
          <div style={emptyStateStyle}>No activities in this month.</div>
        ) : (
          monthlyHighlights.map((activity) => {
            const start = new Date(activity.startDate || activity.createdAt || "");
            const end = new Date(
              activity.endDate || activity.startDate || activity.createdAt || ""
            );

            const startLabel = Number.isNaN(start.getTime())
              ? "—"
              : start.toLocaleDateString("en", {
                  day: "2-digit",
                  month: "short",
                });

            const endLabel = Number.isNaN(end.getTime())
              ? "—"
              : end.toLocaleDateString("en", {
                  day: "2-digit",
                  month: "short",
                });

            return (
              <div
                key={activity._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  background: "var(--surface-2)",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "14px",
                    }}
                  >
                    {activity.title}
                  </span>

                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {startLabel} → {endLabel}
                  </span>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    color: "var(--muted)",
                    fontWeight: 800,
                    fontSize: "13px",
                  }}
                >
                  {endLabel}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "999px",
          background: color,
        }}
      />
      {label}
    </span>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  cursor: "pointer",
  fontWeight: 800,
};

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed var(--border)",
  borderRadius: "14px",
  padding: "14px",
  background: "var(--surface-2)",
  color: "var(--muted)",
  fontSize: "13px",
  fontWeight: 700,
};