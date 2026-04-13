import { useEffect, useMemo, useState } from "react";
import { listActivities, type ActivityRecord } from "../../services/activities.service";

type CalendarEvent = {
  id: string;
  title: string;
  type?: string;
  status?: string;
  description?: string;
  start: Date;
  end: Date;
  raw: ActivityRecord;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM -> 7 PM

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getStatusColor(status?: string) {
  switch (status) {
    case "PLANNED":
      return {
        bg: "#dbeafe",
        border: "#60a5fa",
        text: "#1e3a8a",
      };
    case "IN_PROGRESS":
      return {
        bg: "#fef3c7",
        border: "#f59e0b",
        text: "#92400e",
      };
    case "COMPLETED":
      return {
        bg: "#dcfce7",
        border: "#22c55e",
        text: "#166534",
      };
    case "CANCELLED":
      return {
        bg: "#fee2e2",
        border: "#ef4444",
        text: "#991b1b",
      };
    default:
      return {
        bg: "#ede9fe",
        border: "#8b5cf6",
        text: "#5b21b6",
      };
  }
}

export default function HrCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listActivities();
        if (!cancelled) {
          setActivities(Array.isArray(data) ? data : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load calendar activities.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString("en", {
      day: "2-digit",
      month: "short",
    })} - ${end.toLocaleDateString("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }, [weekStart]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return activities
      .map((activity) => {
        const start = new Date(activity.startDate || activity.createdAt || "");
        const end = new Date(activity.endDate || activity.startDate || activity.createdAt || "");

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }

        return {
          id: activity._id,
          title: activity.title,
          type: activity.type,
          status: activity.status,
          description: activity.description,
          start,
          end,
          raw: activity,
        };
      })
      .filter(Boolean) as CalendarEvent[];
  }, [activities]);

  const weekEvents = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);

    return calendarEvents.filter((event) => {
      return event.start < weekEnd && event.end >= weekStart;
    });
  }, [calendarEvents, weekStart]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto", display: "grid", gap: "20px" }}>
        <section
          style={{
            background: "var(--card)",
            borderRadius: "24px",
            border: "1px solid var(--border)",
            padding: "22px 24px",
            boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                HR Calendar
              </div>
              <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
                Activities Calendar
              </h1>
              <div style={{ marginTop: "8px", color: "var(--muted)", fontSize: "14px" }}>
                Track activity timing, review schedules, and inspect details.
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                style={toolbarBtnStyle}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
                style={toolbarBtnStyle}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
                style={toolbarBtnStyle}
              >
                →
              </button>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontWeight: 700,
                  color: "var(--text)",
                  fontSize: "14px",
                }}
              >
                {weekLabel}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "14px 16px",
              borderRadius: "14px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedActivity ? "minmax(0, 1fr) 340px" : "1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "var(--card)",
              borderRadius: "24px",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "90px repeat(7, 1fr)",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div style={{ padding: "16px", borderRight: "1px solid var(--border)" }} />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{
                    padding: "16px 12px",
                    borderRight: "1px solid var(--border)",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "var(--text)",
                    background:
                      day.toDateString() === new Date().toDateString()
                        ? "color-mix(in srgb, var(--surface-2) 72%, #dbeafe)"
                        : "transparent",
                  }}
                >
                  {formatDayLabel(day)}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: "30px", color: "var(--muted)" }}>Loading calendar...</div>
            ) : (
              <div style={{ position: "relative" }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px repeat(7, 1fr)",
                      minHeight: "88px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRight: "1px solid var(--border)",
                        color: "var(--muted)",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {formatHour(hour)}
                    </div>

                    {weekDays.map((day) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        style={{
                          borderRight: "1px solid var(--border)",
                          background: "transparent",
                          position: "relative",
                        }}
                      />
                    ))}
                  </div>
                ))}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: "90px repeat(7, 1fr)",
                    pointerEvents: "none",
                  }}
                >
                  <div />

                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = weekEvents.filter((event) => {
                      return event.start.toDateString() === day.toDateString();
                    });

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          position: "relative",
                          borderRight: dayIndex < 6 ? "1px solid var(--border)" : "none",
                          minHeight: `${HOURS.length * 88}px`,
                        }}
                      >
                        {dayEvents.map((event, index) => {
                          const startHour = event.start.getHours() + event.start.getMinutes() / 60;
                          const endHour = event.end.getHours() + event.end.getMinutes() / 60;

                          const top = Math.max(0, (startHour - 8) * 88);
                          const height = Math.max(54, (endHour - startHour) * 88);

                          const color = getStatusColor(event.status);

                          return (
                            <button
                              key={`${event.id}-${index}`}
                              type="button"
                              onClick={() => setSelectedActivity(event.raw)}
                              style={{
                                position: "absolute",
                                left: "8px",
                                right: "8px",
                                top: `${top}px`,
                                height: `${height}px`,
                                borderRadius: "14px",
                                border: `1px solid ${color.border}`,
                                background: color.bg,
                                color: color.text,
                                padding: "10px",
                                textAlign: "left",
                                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                                pointerEvents: "auto",
                                cursor: "pointer",
                                overflow: "hidden",
                              }}
                            >
                              <div style={{ fontSize: "11px", fontWeight: 800, marginBottom: "6px" }}>
                                {formatTime(event.start)} - {formatTime(event.end)}
                              </div>
                              <div style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1.3 }}>
                                {event.title}
                              </div>
                              <div style={{ fontSize: "11px", marginTop: "6px", opacity: 0.85 }}>
                                {event.type || event.status || "Activity"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {selectedActivity ? (
            <aside
              style={{
                background: "var(--card)",
                borderRadius: "24px",
                border: "1px solid var(--border)",
                padding: "22px",
                boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
                position: "sticky",
                top: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                    }}
                  >
                    Activity Details
                  </div>
                  <h2 style={{ margin: 0, fontSize: "22px", lineHeight: 1.25 }}>
                    {selectedActivity.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  style={closeBtnStyle}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <DetailRow label="Type" value={selectedActivity.type || "—"} />
                <DetailRow label="Status" value={selectedActivity.status || "—"} />
                <DetailRow
                  label="Start"
                  value={selectedActivity.startDate
                    ? new Date(selectedActivity.startDate).toLocaleString()
                    : "—"}
                />
                <DetailRow
                  label="End"
                  value={selectedActivity.endDate
                    ? new Date(selectedActivity.endDate).toLocaleString()
                    : "—"}
                />
                <DetailRow
                  label="Description"
                  value={selectedActivity.description || "No description available."}
                />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "14px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--muted)",
          textTransform: "uppercase",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  height: "40px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};

const closeBtnStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: "22px",
  lineHeight: 1,
  cursor: "pointer",
};