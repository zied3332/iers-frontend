import { useEffect, useMemo, useState } from "react";
import { listActivities, type ActivityRecord } from "../../services/activities.service";

type ViewMode = "week" | "month";

type CalendarEvent = {
  id: string;
  title: string;
  type?: string;
  status?: string;
  context?: string;
  description?: string;
  location?: string;
  duration?: string;
  seats?: number;
  start: Date;
  end: Date;
  raw: ActivityRecord;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(day: Date, start: Date, end: Date) {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);

  const s = new Date(start);
  s.setHours(0, 0, 0, 0);

  const e = new Date(end);
  e.setHours(23, 59, 59, 999);

  return d >= s && d <= e;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
  });
}

function formatDateOnly(date?: string | Date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusColor(status?: string) {
  switch (status) {
    case "PLANNED":
      return {
        bg: "#dbeafe",
        border: "#60a5fa",
        text: "#1e3a8a",
        soft: "#eff6ff",
      };
    case "IN_PROGRESS":
      return {
        bg: "#fef3c7",
        border: "#f59e0b",
        text: "#92400e",
        soft: "#fffbeb",
      };
    case "COMPLETED":
      return {
        bg: "#dcfce7",
        border: "var(--primary)",
        text: "var(--primary-soft-text)",
        soft: "#f0fdf4",
      };
    case "CANCELLED":
      return {
        bg: "#fee2e2",
        border: "#ef4444",
        text: "#991b1b",
        soft: "#fef2f2",
      };
    default:
      return {
        bg: "#ede9fe",
        border: "#8b5cf6",
        text: "#5b21b6",
        soft: "#f5f3ff",
      };
  }
}

function getWeekRangeLabel(currentDate: Date) {
  const start = startOfWeek(currentDate);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
  })} - ${end.toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function getMonthRangeLabel(currentDate: Date) {
  return currentDate.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
}

export default function HrCalendarPage() {
  const role = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : {};
      return String(parsed?.role || "").toUpperCase();
    } catch {
      return "";
    }
  }, []);
  const calendarScopeLabel = role === "MANAGER" ? "Manager Calendar" : role === "SUPER_MANAGER" ? "Super Manager Calendar" : "HR Calendar";
  const calendarSubtitle =
    role === "MANAGER"
      ? "Follow activities assigned to you."
      : role === "SUPER_MANAGER"
      ? "Follow activities across all departments."
      : "Follow multi-day training activities, certifications, and internal programs.";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

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

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return activities
      .map((activity) => {
        const start = new Date(activity.startDate || activity.createdAt || "");
        const end = new Date(
          activity.endDate || activity.startDate || activity.createdAt || ""
        );

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }

        return {
          id: activity._id,
          title: activity.title,
          type: activity.type,
          status: activity.status,
          context: (activity as any).context,
          description: activity.description,
          location: (activity as any).location,
          duration: (activity as any).duration,
          seats: (activity as any).seats,
          start,
          end,
          raw: activity,
        };
      })
      .filter(Boolean) as CalendarEvent[];
  }, [activities]);

  const availableTypes = useMemo(() => {
    return Array.from(
      new Set(calendarEvents.map((event) => event.type).filter(Boolean))
    ) as string[];
  }, [calendarEvents]);

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      const matchStatus = statusFilter === "ALL" || event.status === statusFilter;
      const matchType = typeFilter === "ALL" || event.type === typeFilter;
      return matchStatus && matchType;
    });
  }, [calendarEvents, statusFilter, typeFilter]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const weekEvents = useMemo(() => {
    const start = startOfWeek(currentDate);
    const end = addDays(start, 6);

    return filteredEvents.filter((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);

      const eventEnd = new Date(event.end);
      eventEnd.setHours(23, 59, 59, 999);

      return eventStart <= end && eventEnd >= start;
    });
  }, [filteredEvents, currentDate]);

  const monthGridDays = useMemo(() => {
    const first = startOfMonth(currentDate);
    const last = endOfMonth(currentDate);

    const firstGridDay = startOfWeek(first);
    const days: Date[] = [];

    for (let i = 0; i < 42; i++) {
      days.push(addDays(firstGridDay, i));
    }

    return {
      days,
      monthStart: first,
      monthEnd: last,
    };
  }, [currentDate]);

  const monthEvents = useMemo(() => {
    const { monthStart, monthEnd } = monthGridDays;

    return filteredEvents.filter((event) => {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);

      const eventEnd = new Date(event.end);
      eventEnd.setHours(23, 59, 59, 999);

      return eventStart <= monthEnd && eventEnd >= monthStart;
    });
  }, [filteredEvents, monthGridDays]);

  const visibleCount = viewMode === "week" ? weekEvents.length : monthEvents.length;

  const headerLabel =
    viewMode === "week"
      ? getWeekRangeLabel(currentDate)
      : getMonthRangeLabel(currentDate);

  const goPrevious = () => {
    if (viewMode === "week") {
      setCurrentDate((prev) => addDays(prev, -7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      );
    }
  };

  const goNext = () => {
    if (viewMode === "week") {
      setCurrentDate((prev) => addDays(prev, 7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      );
    }
  };

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
              alignItems: "flex-start",
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
                {calendarScopeLabel}
              </div>
              <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>
                Activities Calendar
              </h1>
              <div
                style={{
                  marginTop: "8px",
                  color: "var(--muted)",
                  fontSize: "14px",
                }}
              >
                {calendarSubtitle}
              </div>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button type="button" onClick={() => setCurrentDate(new Date())} style={toolbarBtnStyle}>
                  Today
                </button>
                <button type="button" onClick={goPrevious} style={toolbarBtnStyle}>
                  ←
                </button>
                <button type="button" onClick={goNext} style={toolbarBtnStyle}>
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
                    minWidth: "180px",
                    textAlign: "center",
                  }}
                >
                  {headerLabel}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <div style={segmentedWrapStyle}>
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    style={viewMode === "week" ? segmentedActiveStyle : segmentedBtnStyle}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    style={viewMode === "month" ? segmentedActiveStyle : segmentedBtnStyle}
                  >
                    Month
                  </button>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option value="ALL">All statuses</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option value="ALL">All types</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
            gridTemplateColumns: selectedActivity ? "minmax(0, 1fr) 360px" : "1fr",
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
                padding: "18px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>
                  {viewMode === "week" ? "Weekly activity view" : "Monthly activity view"}
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                  {loading ? "Loading activities..." : `${visibleCount} matching activities`}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <LegendItem color="#60a5fa" label="Planned" />
                <LegendItem color="#f59e0b" label="In Progress" />
                <LegendItem color="var(--primary)" label="Completed" />
                <LegendItem color="#ef4444" label="Cancelled" />
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "30px", color: "var(--muted)" }}>
                Loading calendar...
              </div>
            ) : viewMode === "week" ? (
              <div style={{ padding: "18px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  {weekDays.map((day) => {
                    const dayEvents = weekEvents.filter((event) =>
                      isWithinRange(day, event.start, event.end)
                    );

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "18px",
                          background:
                            sameDay(day, new Date())
                              ? "color-mix(in srgb, var(--surface-2) 80%, #dbeafe)"
                              : "var(--surface)",
                          minHeight: "260px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "14px 14px 12px",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "var(--text)",
                            }}
                          >
                            {formatShortDay(day)}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--muted)",
                              marginTop: "4px",
                            }}
                          >
                            {dayEvents.length} activities
                          </div>
                        </div>

                        <div style={{ padding: "12px", display: "grid", gap: "10px" }}>
                          {dayEvents.length === 0 ? (
                            <div
                              style={{
                                padding: "12px",
                                borderRadius: "14px",
                                background: "var(--surface-2)",
                                color: "var(--muted)",
                                fontSize: "13px",
                                border: "1px dashed var(--border)",
                              }}
                            >
                              No activities
                            </div>
                          ) : (
                            dayEvents.map((event) => {
                              const color = getStatusColor(event.status);
                              const isStart = sameDay(day, event.start);
                              const isEnd = sameDay(day, event.end);

                              return (
                                <button
                                  key={`${event.id}-${day.toISOString()}`}
                                  type="button"
                                  onClick={() => setSelectedActivity(event.raw)}
                                  style={{
                                    border: `1px solid ${color.border}`,
                                    borderRadius: "14px",
                                    background: color.soft,
                                    color: color.text,
                                    padding: "12px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: "8px",
                                      marginBottom: "8px",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        padding: "4px 8px",
                                        borderRadius: "999px",
                                        background: color.bg,
                                        border: `1px solid ${color.border}`,
                                      }}
                                    >
                                      {event.status || "Activity"}
                                    </span>

                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        opacity: 0.9,
                                      }}
                                    >
                                      {isStart && isEnd
                                        ? "Start & End"
                                        : isStart
                                        ? "Starts"
                                        : isEnd
                                        ? "Ends"
                                        : "Ongoing"}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: 800,
                                      lineHeight: 1.35,
                                      marginBottom: "6px",
                                    }}
                                  >
                                    {event.title}
                                  </div>

                                  <div
                                    style={{
                                      fontSize: "12px",
                                      opacity: 0.9,
                                      marginBottom: "6px",
                                    }}
                                  >
                                    {formatDateOnly(event.start)} → {formatDateOnly(event.end)}
                                  </div>

                                  <div
                                    style={{
                                      fontSize: "12px",
                                      opacity: 0.85,
                                    }}
                                  >
                                    {event.type || "Activity"} {event.duration ? `• ${event.duration}` : ""}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: "12px",
                    marginBottom: "10px",
                  }}
                >
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div
                      key={day}
                      style={{
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "var(--muted)",
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  {monthGridDays.days.map((day) => {
                    const dayEvents = monthEvents.filter((event) =>
                      isWithinRange(day, event.start, event.end)
                    );

                    const isCurrentMonth =
                      day.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          minHeight: "150px",
                          border: "1px solid var(--border)",
                          borderRadius: "18px",
                          padding: "12px",
                          background: sameDay(day, new Date())
                            ? "color-mix(in srgb, var(--surface-2) 80%, #dbeafe)"
                            : isCurrentMonth
                            ? "var(--surface)"
                            : "color-mix(in srgb, var(--surface) 70%, #f1f5f9)",
                          opacity: isCurrentMonth ? 1 : 0.72,
                          display: "grid",
                          alignContent: "start",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "var(--text)",
                          }}
                        >
                          {day.getDate()}
                        </div>

                        {dayEvents.slice(0, 3).map((event) => {
                          const color = getStatusColor(event.status);

                          return (
                            <button
                              key={`${event.id}-${day.toISOString()}`}
                              type="button"
                              onClick={() => setSelectedActivity(event.raw)}
                              style={{
                                width: "100%",
                                border: `1px solid ${color.border}`,
                                borderRadius: "12px",
                                background: color.soft,
                                color: color.text,
                                padding: "8px 10px",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: 1.35,
                                overflow: "hidden",
                              }}
                            >
                              {event.title}
                            </button>
                          );
                        })}

                        {dayEvents.length > 3 ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--muted)",
                              fontWeight: 700,
                            }}
                          >
                            +{dayEvents.length - 3} more
                          </div>
                        ) : null}
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
                <DetailRow label="Context" value={(selectedActivity as any).context || "—"} />
                <DetailRow label="Location" value={(selectedActivity as any).location || "—"} />
                <DetailRow label="Duration" value={(selectedActivity as any).duration || "—"} />
                <DetailRow
                  label="Seats"
                  value={
                    typeof (selectedActivity as any).seats === "number"
                      ? String((selectedActivity as any).seats)
                      : "—"
                  }
                />
                <DetailRow
                  label="Start date"
                  value={formatDateOnly(selectedActivity.startDate)}
                />
                <DetailRow
                  label="End date"
                  value={formatDateOnly(selectedActivity.endDate)}
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "12px",
        color: "var(--muted)",
        fontWeight: 700,
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

const selectStyle: React.CSSProperties = {
  height: "40px",
  padding: "0 12px",
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};

const segmentedWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  overflow: "hidden",
  background: "var(--surface-2)",
};

const segmentedBtnStyle: React.CSSProperties = {
  height: "40px",
  padding: "0 16px",
  border: "none",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 700,
  cursor: "pointer",
};

const segmentedActiveStyle: React.CSSProperties = {
  ...segmentedBtnStyle,
  background: "var(--card)",
  boxShadow: "inset 0 0 0 1px var(--border)",
};