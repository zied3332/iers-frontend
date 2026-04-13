import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listActivities, type ActivityRecord } from "../../services/activities.service";
import { getAllSkills } from "../../services/skills.service";
import ActivitiesCalendar from "./components/ActivitiesCalendar";

type Skill = {
  _id: string;
  name: string;
  category: "KNOWLEDGE" | "KNOW_HOW" | "SOFT";
  description?: string;
};

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const xc = (prev.x + current.x) / 2;
    const yc = (prev.y + current.y) / 2;
    path += ` Q ${prev.x} ${prev.y} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

export default function HrStatsDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [activitiesData, skillsData] = await Promise.all([
          listActivities(),
          getAllSkills(),
        ]);

        if (cancelled) return;
        setActivities(Array.isArray(activitiesData) ? activitiesData : []);
        setSkills(Array.isArray(skillsData) ? skillsData : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load HR dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activityStats = useMemo(() => {
    const byStatus = {
      PLANNED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    } as Record<string, number>;

    activities.forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });

    return {
      total: activities.length,
      planned: byStatus.PLANNED || 0,
      inProgress: byStatus.IN_PROGRESS || 0,
      completed: byStatus.COMPLETED || 0,
      cancelled: byStatus.CANCELLED || 0,
    };
  }, [activities]);

  const skillStats = useMemo(() => {
    const byCategory = {
      KNOWLEDGE: 0,
      KNOW_HOW: 0,
      SOFT: 0,
    } as Record<string, number>;

    skills.forEach((s) => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });

    return {
      total: skills.length,
      knowledge: byCategory.KNOWLEDGE || 0,
      knowHow: byCategory.KNOW_HOW || 0,
      soft: byCategory.SOFT || 0,
    };
  }, [skills]);

  const topRequiredSkills = useMemo(() => {
    const counter = new Map<string, number>();

    activities.forEach((a) => {
      (a.requiredSkills || []).forEach((s) => {
        const key = String(s?.name || "").trim();
        if (!key) return;
        counter.set(key, (counter.get(key) || 0) + 1);
      });
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [activities]);

  const recentActivities = useMemo(() => {
    return [...activities]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 6);
  }, [activities]);

  const monthTrend = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];

    const months = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const monthStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
      const monthEnd = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      labels.push(d.toLocaleString("en", { month: "short" }));
      return { monthStart, monthEnd };
    });

    const counts = months.map(({ monthStart, monthEnd }) => {
      return activities.filter((a) => {
        const start = new Date(a.startDate || "");
        const end = new Date(a.endDate || a.startDate || "");

        const hasValidRange =
          !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());

        if (hasValidRange) {
          return start <= monthEnd && end >= monthStart;
        }

        const fallback = new Date(a.createdAt || "");
        if (Number.isNaN(fallback.getTime())) return false;
        return fallback >= monthStart && fallback <= monthEnd;
      }).length;
    });

    return { labels, counts };
  }, [activities]);

  const chartData = useMemo(() => {
    const w = 520;
    const h = 180;
    const padX = 24;
    const padY = 18;
    const max = Math.max(...monthTrend.counts, 1);
    const step = (w - padX * 2) / Math.max(monthTrend.counts.length - 1, 1);

    const points = monthTrend.counts.map((v, i) => {
      const x = padX + i * step;
      const y = h - padY - (v / max) * (h - padY * 2);
      return { x, y };
    });

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${
      h - padY
    } L ${points[0]?.x || 0} ${h - padY} Z`;

    return { w, h, points, linePath, areaPath };
  }, [monthTrend]);

  const activityPie = useMemo(() => {
    const values = [
      { label: "Planned", value: activityStats.planned, color: "#3b82f6" },
      { label: "In Progress", value: activityStats.inProgress, color: "#f59e0b" },
      { label: "Completed", value: activityStats.completed, color: "#16a34a" },
      { label: "Cancelled", value: activityStats.cancelled, color: "#ef4444" },
    ];

    const total = Math.max(values.reduce((s, x) => s + x.value, 0), 1);
    let offset = 0;

    const segments = values.map((item) => {
      const ratio = item.value / total;
      const dash = ratio * 100;
      const seg = { ...item, dash, offset };
      offset += dash;
      return seg;
    });

    return { total: activityStats.total, segments };
  }, [activityStats]);

  const skillBars = useMemo(() => {
    const max = Math.max(
      skillStats.knowledge,
      skillStats.knowHow,
      skillStats.soft,
      1
    );

    return [
      {
        label: "Knowledge",
        value: skillStats.knowledge,
        color: "#2563eb",
        pct: (skillStats.knowledge / max) * 100,
      },
      {
        label: "Know-how",
        value: skillStats.knowHow,
        color: "#7c3aed",
        pct: (skillStats.knowHow / max) * 100,
      },
      {
        label: "Soft",
        value: skillStats.soft,
        color: "#14b8a6",
        pct: (skillStats.soft / max) * 100,
      },
    ];
  }, [skillStats]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px",
        color: "var(--text)",
      }}
    >
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
          display: "grid",
          gap: "20px",
        }}
      >
        <section
          style={{
            background: "var(--card)",
            borderRadius: "26px",
            padding: "24px 28px",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 30px rgba(21, 61, 46, 0.05)",
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
                marginBottom: "8px",
              }}
            >
              HR Intelligence Dashboard
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                lineHeight: 1.15,
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              Workforce Activity Overview
            </h1>

            <div
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "var(--muted)",
              }}
            >
              Real-time overview of activities, execution status, and skill demand.
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              fontSize: "13px",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            Last 6 Months
          </div>
        </section>

        {error && (
          <div className="content-card">
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          {[
            {
              title: "Total Activities",
              value: activityStats.total,
              percent: 100,
              color: "#1ea672",
            },
            {
              title: "In Progress",
              value: activityStats.inProgress,
              percent: activityStats.total
                ? Math.round(
                    (activityStats.inProgress / activityStats.total) * 100
                  )
                : 0,
              color: "#f59e0b",
            },
            {
              title: "Completed",
              value: activityStats.completed,
              percent: activityStats.total
                ? Math.round(
                    (activityStats.completed / activityStats.total) * 100
                  )
                : 0,
              color: "#22a16d",
            },
            {
              title: "Total Skills",
              value: skillStats.total,
              percent: skillStats.total
                ? Math.round(
                    ((skillStats.knowledge + skillStats.knowHow) /
                      skillStats.total) *
                      100
                  )
                : 0,
              color: "#7c3aed",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "var(--surface)",
                borderRadius: "24px",
                padding: "22px",
                border:
                  "1px solid color-mix(in srgb, var(--border) 86%, transparent)",
                boxShadow: "0 8px 28px rgba(21, 61, 46, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                minHeight: "132px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    color: "var(--text)",
                    marginBottom: "10px",
                    fontWeight: 700,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    fontSize: "42px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "var(--text)",
                  }}
                >
                  {loading ? "..." : item.value}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--muted)",
                    marginTop: "8px",
                    fontWeight: 700,
                  }}
                >
                  {loading ? "..." : `${item.percent}% ratio`}
                </div>
              </div>

              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  background: `conic-gradient(${item.color} ${item.percent}%, var(--surface-3) ${item.percent}% 100%)`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "var(--card)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    color: "var(--text)",
                    fontSize: "15px",
                  }}
                >
                  {loading ? "..." : `${item.percent}%`}
                </div>
              </div>
            </div>
          ))}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(340px, 0.95fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "20px" }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/hr/calendar")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/hr/calendar");
                }
              }}
              style={{
                cursor: "pointer",
                borderRadius: "26px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                  "0 14px 34px rgba(21, 61, 46, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <ActivitiesCalendar activities={activities} loading={loading} />
            </div>

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
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "16px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "var(--text)",
                    }}
                  >
                    Activity Trend
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "var(--muted)",
                      marginTop: "4px",
                    }}
                  >
                    Activities scheduled during each month (using start and end
                    dates).
                  </div>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${chartData.w} ${chartData.h}`}
                style={{ width: "100%" }}
              >
                <defs>
                  <linearGradient id="hrTrendArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1ea672" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1ea672" stopOpacity="0.03" />
                  </linearGradient>
                </defs>

                <path d={chartData.areaPath} fill="url(#hrTrendArea)" />
                <path
                  d={chartData.linePath}
                  stroke="#15803d"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />

                {chartData.points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#15803d" />
                    <text
                      x={p.x}
                      y={chartData.h - 2}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--muted)"
                    >
                      {monthTrend.labels[i]}
                    </text>
                  </g>
                ))}
              </svg>
            </section>

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
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: "12px",
                }}
              >
                Recent Activities
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ fontSize: "16px", fontWeight: 800 }}>Title</th>
                      <th style={{ fontSize: "16px", fontWeight: 800 }}>Status</th>
                      <th style={{ fontSize: "16px", fontWeight: 800 }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="empty-state"
                          style={{ fontSize: "15px" }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : recentActivities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="empty-state"
                          style={{ fontSize: "15px" }}
                        >
                          No activities found.
                        </td>
                      </tr>
                    ) : (
                      recentActivities.map((a) => (
                        <tr key={a._id}>
                          <td className="cell-title" style={{ fontSize: "16px" }}>
                            {a.title}
                          </td>
                          <td style={{ fontSize: "16px", fontWeight: 600 }}>
                            {a.status}
                          </td>
                          <td style={{ fontSize: "16px", fontWeight: 600 }}>
                            {a.type}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
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
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: "10px",
                }}
              >
                Activities by Status
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <svg
                  viewBox="0 0 120 120"
                  width="110"
                  height="110"
                  style={{ overflow: "visible" }}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke="var(--surface-3)"
                    strokeWidth="14"
                  />

                  {activityPie.segments.map((s) => (
                    <circle
                      key={s.label}
                      cx="60"
                      cy="60"
                      r="42"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="14"
                      strokeDasharray={`${s.dash} ${100 - s.dash}`}
                      strokeDashoffset={-s.offset}
                      pathLength={100}
                      strokeLinecap="butt"
                      transform="rotate(-90 60 60)"
                    />
                  ))}

                  <text
                    x="60"
                    y="58"
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--muted)"
                  >
                    Total
                  </text>

                  <text
                    x="60"
                    y="74"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="800"
                    fill="var(--text)"
                  >
                    {loading ? "..." : activityPie.total}
                  </text>
                </svg>

                <div style={{ display: "grid", gap: 8 }}>
                  {activityPie.segments.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--text)",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: s.color,
                          }}
                        />
                        {s.label}
                      </span>

                      <strong style={{ color: "var(--text)" }}>
                        {loading ? "..." : s.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

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
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: "12px",
                }}
              >
                Skills by Category
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {skillBars.map((item) => (
                  <div key={item.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        color: "var(--text)",
                      }}
                    >
                      <span>{item.label}</span>
                      <strong>{loading ? "..." : item.value}</strong>
                    </div>

                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "var(--surface-3)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${loading ? 0 : item.pct}%`,
                          height: "100%",
                          background: item.color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginTop: "18px",
                  marginBottom: "10px",
                }}
              >
                Most Required Skills
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {loading ? (
                  <span className="muted">Loading...</span>
                ) : topRequiredSkills.length === 0 ? (
                  <span className="muted">No required-skills data yet.</span>
                ) : (
                  topRequiredSkills.map(([name, count]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "var(--text)",
                      }}
                    >
                      <span>{name}</span>
                      <strong>{count}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

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
              fontSize: "16px",
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: "12px",
            }}
          >
            Quick Skill Snapshot
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {[
              ["Knowledge", skillStats.knowledge, "#dbeafe"],
              ["Know-how", skillStats.knowHow, "#ede9fe"],
              ["Soft", skillStats.soft, "#ccfbf1"],
            ].map(([label, value, bg]) => (
              <div
                key={String(label)}
                style={{
                  background: `color-mix(in srgb, var(--surface-2) 80%, ${String(
                    bg
                  )})`,
                  border: `1px solid color-mix(in srgb, var(--border) 60%, ${String(
                    bg
                  )})`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{ color: "var(--text)", fontSize: 13, fontWeight: 800 }}
                >
                  {label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 30,
                    fontWeight: 900,
                    color: "var(--text)",
                  }}
                >
                  {loading ? "..." : value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}