import { useMemo, useState } from "react";
import type { ActivityRecord } from "../../../services/activities.service";

type ActivitiesCalendarProps = {
  activities: ActivityRecord[];
  loading?: boolean;
};

export default function ActivitiesCalendar({
  activities,
  loading = false,
}: ActivitiesCalendarProps) {
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const calendarMonthLabel = useMemo(
    () => calendarDate.toLocaleString("en", { month: "long", year: "numeric" }),
    [calendarDate]
  );

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: Array<number | null> = [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, idx) => idx + 1),
    ];

    while (grid.length % 7 !== 0) {
      grid.push(null);
    }

    return grid;
  }, [calendarDate]);

  const calendarMarkers = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const startDays = new Set<number>();
    const endDays = new Set<number>();

    activities.forEach((activity) => {
      const start = new Date(activity.startDate || activity.createdAt || "");
      const end = new Date(
        activity.endDate || activity.startDate || activity.createdAt || ""
      );

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      if (start.getFullYear() === year && start.getMonth() === month) {
        startDays.add(start.getDate());
      }

      if (end.getFullYear() === year && end.getMonth() === month) {
        endDays.add(end.getDate());
      }
    });

    return { startDays, endDays };
  }, [activities, calendarDate]);

  const monthlyHighlights = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    return [...activities]
      .filter((activity) => {
        const dt = new Date(activity.startDate || activity.createdAt || "");
        return (
          !Number.isNaN(dt.getTime()) &&
          dt.getFullYear() === year &&
          dt.getMonth() === month
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startDate || a.createdAt || 0).getTime() -
          new Date(b.startDate || b.createdAt || 0).getTime()
      )
      .slice(0, 2);
  }, [activities, calendarDate]);

  return (
    <section
      style={{
        background: "var(--card)",
        borderRadius: "26px",
        padding: "24px",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
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
            }}
          >
            All activities calendar
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() =>
              setCalendarDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              cursor: "pointer",
            }}
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
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              cursor: "pointer",
            }}
          >
            →
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
          fontSize: "13px",
          textAlign: "center",
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            style={{
              color: "var(--muted)",
              fontWeight: 800,
              paddingBottom: "6px",
            }}
          >
            {d}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const isStart = day ? calendarMarkers.startDays.has(day) : false;
          const isEnd = day ? calendarMarkers.endDays.has(day) : false;
          const isBoth = isStart && isEnd;
          const isEmpty = !day;

          return (
            <div
              key={`${day}-${index}`}
              style={{
                height: "40px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: isEmpty
                  ? "transparent"
                  : isBoth
                  ? "linear-gradient(135deg, #1ea672 0%, #f59e0b 100%)"
                  : isStart
                  ? "#1ea672"
                  : isEnd
                  ? "#f59e0b"
                  : "var(--surface-2)",
                color: isEmpty
                  ? "transparent"
                  : isStart || isEnd
                  ? "#ffffff"
                  : "var(--text)",
                fontWeight: isStart || isEnd ? 800 : 700,
                border: isEmpty ? "none" : "1px solid var(--border)",
                fontSize: "14px",
              }}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: "14px",
          marginTop: "12px",
          fontSize: "12px",
          color: "var(--muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: "#1ea672",
            }}
          />
          Start
        </span>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: "#f59e0b",
            }}
          />
          End
        </span>
      </div>

      <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
        {loading ? (
          <span className="muted">Loading...</span>
        ) : monthlyHighlights.length === 0 ? (
          <span className="muted">No activities in this month.</span>
        ) : (
          monthlyHighlights.map((activity) => {
            const start = new Date(activity.startDate || activity.createdAt || "");
            const when = Number.isNaN(start.getTime())
              ? "Date unavailable"
              : start.toLocaleDateString("en", {
                  day: "2-digit",
                  month: "short",
                });

            return (
              <div
                key={activity._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: "var(--surface-2)",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity.title}
                </span>

                <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                  {when}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}