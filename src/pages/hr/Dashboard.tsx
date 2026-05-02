import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../services/users.service";
import { getAllEmployees } from "../../services/employee.service";
import { getAllDepartments } from "../../services/departments.service";
import { getAllSkills } from "../../services/skills.service";
import { listActivities, type ActivityRecord } from "../../services/activities.service";

type FilterTab = "All" | "Engineering" | "IT Support" | "Marketing";

type GapRow = {
  role: string;
  missingSkill: string;
  gap: "High" | "Medium" | "Low";
  suggestion: string;
  progress: number;
};

type DocumentItem = {
  title: string;
  type: string;
  size: string;
};

type DepartmentPoint = {
  month: string;
  engineering: number;
  hr: number;
  marketing: number;
  support: number;
};

export default function HrDashboard() {
  const navigate = useNavigate();
  const calendarPath = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : {};
      const role = String(parsed?.role || "").toUpperCase();
      if (
        role === "SUPER_MANAGER" ||
        role === "SUPER MANGER" ||
        role === "SUPER MANAGER" ||
        role === "SUPER_MANGER"
      ) {
        return "/super-manager/calendar";
      }
      return "/hr/calendar";
    } catch {
      return "/hr/calendar";
    }
  }, []);
  const [tab, setTab] = useState<FilterTab>("All");
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [totals, setTotals] = useState({
    users: 0,
    employees: 0,
    departments: 0,
    skills: 0,
    activities: 0,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatsLoading(true);

        const [users, employees, departments, skills, activities] = await Promise.all([
          getUsers(),
          getAllEmployees(),
          getAllDepartments(),
          getAllSkills(),
          listActivities(),
        ]);

        if (cancelled) return;

        setTotals({
          users: Array.isArray(users) ? users.length : 0,
          employees: Array.isArray(employees) ? employees.length : 0,
          departments: Array.isArray(departments) ? departments.length : 0,
          skills: Array.isArray(skills) ? skills.length : 0,
          activities: Array.isArray(activities) ? activities.length : 0,
        });
        setActivityRecords(Array.isArray(activities) ? activities : []);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load dashboard card stats", error);
          setTotals({ users: 0, employees: 0, departments: 0, skills: 0, activities: 0 });
          setActivityRecords([]);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => {
      const toPct = (numerator: number, denominator: number) => {
        if (!denominator) return 0;
        return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
      };

      return [
        {
          title: "Total Users",
          value: String(totals.users),
          unit: `${totals.employees} Employees`,
          percent: toPct(totals.employees, totals.users),
        },
        {
          title: "Departments",
          value: String(totals.departments),
          unit: `${totals.users} Users`,
          percent: toPct(totals.departments, totals.users || 1),
        },
        {
          title: "Skills",
          value: String(totals.skills),
          unit: `${totals.activities} Activities`,
          percent: toPct(totals.skills, totals.activities || 1),
        },
        {
          title: "Activities",
          value: String(totals.activities),
          unit: `${totals.departments} Departments`,
          percent: toPct(totals.activities, totals.skills || 1),
        },
      ];
    },
    [totals]
  );

  const skillGaps: GapRow[] = useMemo(
    () => [
      {
        role: "Software Engineer",
        missingSkill: "SQL",
        gap: "High",
        suggestion: "SQL Database Training",
        progress: 88,
      },
      {
        role: "DevOps Specialist",
        missingSkill: "Kubernetes",
        gap: "Medium",
        suggestion: "Kubernetes Essentials",
        progress: 72,
      },
      {
        role: "Cloud Architect",
        missingSkill: "AWS Cost Control",
        gap: "Medium",
        suggestion: "Advanced AWS Workshop",
        progress: 64,
      },
      {
        role: "IT Support",
        missingSkill: "Security Basics",
        gap: "Low",
        suggestion: "Security Fundamentals",
        progress: 49,
      },
    ],
    []
  );

  const filteredRows = useMemo(() => {
    if (tab === "All") return skillGaps;

    if (tab === "Engineering") {
      return skillGaps.filter((item) =>
        ["Software Engineer", "DevOps Specialist", "Cloud Architect"].includes(item.role)
      );
    }

    if (tab === "IT Support") {
      return skillGaps.filter((item) => item.role === "IT Support");
    }

    if (tab === "Marketing") {
      return [];
    }

    return skillGaps;
  }, [skillGaps, tab]);

  const documents: DocumentItem[] = useMemo(
    () => [
      { title: "Performance Evaluation.pdf", type: "PDF", size: "1.24 MB" },
      { title: "Contract Agreement.pdf", type: "PDF", size: "815 KB" },
      { title: "Training Roadmap.pdf", type: "PDF", size: "2.08 MB" },
      { title: "Recommendation Report.pdf", type: "PDF", size: "3.58 MB" },
    ],
    []
  );

  const weeklyHours = useMemo(
    () => [
      { day: "Mon", value: 7.5 },
      { day: "Tue", value: 8.1 },
      { day: "Wed", value: 5.2 },
      { day: "Thu", value: 8.0 },
      { day: "Fri", value: 7.1 },
      { day: "Sat", value: 0.8 },
      { day: "Sun", value: 0.0 },
    ],
    []
  );

  const monthGraph = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString("en", { month: "short" });

      const value = activityRecords.filter((a) => {
        const dt = new Date(a.startDate || a.createdAt || "");
        return (
          !Number.isNaN(dt.getTime()) &&
          dt.getFullYear() === d.getFullYear() &&
          dt.getMonth() === d.getMonth()
        );
      }).length;

      return { label, value };
    });
  }, [activityRecords]);

  const performanceOverview = useMemo(() => {
    const total = activityRecords.length;
    const completed = activityRecords.filter((a) => a.status === "COMPLETED").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      completionRate,
      subtitle:
        total > 0
          ? `${completed} completed of ${total} total activities`
          : "No activities available yet",
    };
  }, [activityRecords]);

  const departmentTrend: DepartmentPoint[] = useMemo(
    () => [
      { month: "Jan", engineering: 72, hr: 61, marketing: 58, support: 66 },
      { month: "Feb", engineering: 74, hr: 63, marketing: 59, support: 67 },
      { month: "Mar", engineering: 78, hr: 64, marketing: 62, support: 69 },
      { month: "Apr", engineering: 75, hr: 66, marketing: 61, support: 68 },
      { month: "May", engineering: 80, hr: 68, marketing: 64, support: 71 },
      { month: "Jun", engineering: 84, hr: 70, marketing: 66, support: 73 },
    ],
    []
  );

  const maxMonthValue = Math.max(...monthGraph.map((m) => m.value), 1);

  const getGapBadge = (gap: GapRow["gap"]) => {
    if (gap === "High") {
      return {
        background: "#fdecec",
        color: "#d45454",
        border: "1px solid #f7caca",
      };
    }

    if (gap === "Medium") {
      return {
        background: "#fff6e7",
        color: "#c98b1f",
        border: "1px solid #f2ddb0",
      };
    }

    return {
      background: "#edf8f3",
      color: "#2d8b62",
      border: "1px solid #cde9da",
    };
  };

  const buildPolyline = (values: number[], width = 560, height = 220, padding = 28) => {
    const max = 100;
    const min = 0;
    const stepX = (width - padding * 2) / (values.length - 1);

    return values
      .map((value, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((value - min) / (max - min)) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  };

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

    activityRecords.forEach((activity) => {
      const start = new Date(activity.startDate || activity.createdAt || "");
      const end = new Date(activity.endDate || activity.startDate || activity.createdAt || "");

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      if (start.getFullYear() === year && start.getMonth() === month) {
        startDays.add(start.getDate());
      }

      if (end.getFullYear() === year && end.getMonth() === month) {
        endDays.add(end.getDate());
      }
    });

    return { startDays, endDays };
  }, [activityRecords, calendarDate]);

  const monthlyHighlights = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    return activityRecords
      .filter((activity) => {
        const dt = new Date(activity.startDate || activity.createdAt || "");
        return !Number.isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === month;
      })
      .sort((a, b) => {
        const ta = new Date(a.startDate || a.createdAt || 0).getTime();
        const tb = new Date(b.startDate || b.createdAt || 0).getTime();
        return ta - tb;
      })
      .slice(0, 2);
  }, [activityRecords, calendarDate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px",
        fontFamily:
          '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: "1480px", margin: "0 auto", display: "grid", gap: "20px" }}>
        {/* PAGE HEADER */}
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
              People Operations Overview
            </h1>
            <div
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "var(--muted)",
              }}
            >
              Workforce performance, leave tracking, department trends, and skill-gap planning
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
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
              June 2025
            </div>
            <button
              type="button"
              style={{
                border: "none",
                background: "#1ea672",
                color: "#ffffff",
                borderRadius: "14px",
                padding: "11px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Export Report
            </button>
          </div>
        </section>

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          {stats.map((item) => (
            <div
              key={item.title}
              style={{
                background: "var(--surface)",
                borderRadius: "24px",
                padding: "22px",
                border: "1px solid color-mix(in srgb, var(--border) 86%, transparent)",
                boxShadow: "0 8px 28px rgba(21, 61, 46, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                minHeight: "132px",
              }}
            >
              <div>
                <div style={{ fontSize: "15px", color: "var(--text)", marginBottom: "10px", fontWeight: 700 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "42px", fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>
                  {statsLoading ? "..." : item.value}
                </div>
                <div style={{ fontSize: "15px", color: "var(--muted)", marginTop: "8px", fontWeight: 700 }}>
                  {statsLoading ? "Loading" : item.unit}
                </div>
              </div>

              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  background: `conic-gradient(#1ea672 ${item.percent}%, var(--surface-3) ${item.percent}% 100%)`,
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
                  {statsLoading ? "..." : `${item.percent}%`}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* MAIN CONTENT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(340px, 0.9fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {/* LEFT */}
          <div style={{ display: "grid", gap: "20px" }}>
            {/* PERFORMANCE */}
            <section
              role="button"
              tabIndex={0}
              onClick={() => navigate(calendarPath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(calendarPath);
                }
              }}
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
                  marginBottom: "22px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800 }}>Activity Completion Rate</div>
                  <div style={{ fontSize: "38px", fontWeight: 800, marginTop: "8px" }}>
                    {statsLoading ? "..." : `${performanceOverview.completionRate.toFixed(1)}%`}
                  </div>
                  <div style={{ color: "#22a16d", fontSize: "14px", fontWeight: 700 }}>
                    {statsLoading ? "Loading activity metrics..." : performanceOverview.subtitle}
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    color: "var(--muted)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Last 12 Months
                </button>
              </div>

              <div
                style={{
                  height: "250px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "12px",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "18px",
                }}
              >
                {monthGraph.map((point, index) => {
                  const height = (point.value / maxMonthValue) * 190;
                  return (
                    <div
                      key={`${point.label}-${index}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "42px",
                          height: `${Math.max(height, 12)}px`,
                          borderRadius: "14px 14px 10px 10px",
                          background:
                            index === monthGraph.length - 1
                              ? "linear-gradient(180deg, #19aa73 0%, #0f8558 100%)"
                              : "linear-gradient(180deg, #d4efe2 0%, #93d6b4 100%)",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* NEW DEPARTMENT GRAPH */}
            <section
              role="button"
              tabIndex={0}
              onClick={() => navigate(calendarPath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(calendarPath);
                }
              }}
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
                  alignItems: "flex-start",
                  gap: "14px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>Department Activity Trend</div>
                  <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                    Dummy data showing monthly engagement across main departments
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  {[
                    ["Engineering", "#1ea672"],
                    ["HR", "#76c7a0"],
                    ["Marketing", "#c7e7d6"],
                    ["IT Support", "#7fa99a"],
                  ].map(([label, color]) => (
                    <div
                      key={label}
                      style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--muted)" }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "999px",
                          background: color,
                          display: "inline-block",
                        }}
                      />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "22px",
                  padding: "18px",
                }}
              >
                <svg viewBox="0 0 560 220" width="100%" height="260" style={{ display: "block" }}>
                  {[40, 80, 120, 160].map((y) => (
                    <line
                      key={y}
                      x1="28"
                      y1={y}
                      x2="532"
                      y2={y}
                      stroke="#e5eeea"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                  ))}

                  <polyline
                    fill="none"
                    stroke="#1ea672"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={buildPolyline(departmentTrend.map((d) => d.engineering))}
                  />
                  <polyline
                    fill="none"
                    stroke="#76c7a0"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={buildPolyline(departmentTrend.map((d) => d.hr))}
                  />
                  <polyline
                    fill="none"
                    stroke="#c7e7d6"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={buildPolyline(departmentTrend.map((d) => d.marketing))}
                  />
                  <polyline
                    fill="none"
                    stroke="#7fa99a"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={buildPolyline(departmentTrend.map((d) => d.support))}
                  />

                  {departmentTrend.map((item, index) => {
                    const stepX = (560 - 56) / (departmentTrend.length - 1);
                    const x = 28 + index * stepX;
                    return (
                      <text
                        key={item.month}
                        x={x}
                        y="208"
                        textAnchor="middle"
                        fill="var(--muted)"
                        fontSize="12"
                        fontWeight="600"
                      >
                        {item.month}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </section>

            {/* HOURS + DOCS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              <section
                style={{
                  background: "var(--card)",
                  borderRadius: "26px",
                  padding: "24px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
                  minHeight: "360px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>Hours Logged</div>
                  <button
                    type="button"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      color: "var(--muted)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    This Week ▾
                  </button>
                </div>

                <div style={{ fontSize: "42px", fontWeight: 800, lineHeight: 1 }}>34.30</div>
                <div style={{ color: "#7b938c", fontSize: "14px", marginTop: "6px" }}>hours this week</div>

                <div
                  style={{
                    marginTop: "24px",
                    height: "210px",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "12px",
                  }}
                >
                  {weeklyHours.map((item, index) => (
                    <div
                      key={`${item.day}-${index}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          borderRadius: "14px 14px 10px 10px",
                          background:
                            index < 5
                              ? "linear-gradient(180deg, #1ea672 0%, #0d7f54 100%)"
                              : "linear-gradient(180deg, #e4f1e9 0%, #cfe6d8 100%)",
                          height: `${Math.max(item.value * 18, 12)}px`,
                        }}
                      />
                      <div style={{ fontSize: "12px", color: "#7c918b", fontWeight: 600 }}>{item.day}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                style={{
                  background: "var(--card)",
                  borderRadius: "26px",
                  padding: "24px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
                  minHeight: "360px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "18px" }}>Documents</div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.title}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px",
                        background: "var(--surface-2)",
                        borderRadius: "18px",
                        border: "1px solid #edf3ef",
                      }}
                    >
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "14px",
                          background: "#e2f4ea",
                          color: "#199a68",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 800,
                          flexShrink: 0,
                          fontSize: "14px",
                        }}
                      >
                        PDF
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.title}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                          {doc.type} · {doc.size}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* TABLE */}
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
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "17px" }}>Critical Skills Gap</div>
                  <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                    Recommended training actions by role
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: "#1ea672",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "11px 16px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + New Activity
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
                {(["All", "Engineering", "IT Support", "Marketing"] as FilterTab[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    style={{
                      border: tab === item ? "none" : "1px solid #e6eeea",
                      background: tab === item ? "#1ea672" : "#f8fbf9",
                      color: tab === item ? "#ffffff" : "#607872",
                      borderRadius: "999px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: "0 12px",
                  }}
                >
                  <thead>
                    <tr>
                      {["Role", "Missing Skill", "Gap", "Suggested Activity", "Coverage", ""].map((head) => (
                        <th
                          key={head}
                          style={{
                            textAlign: "left",
                            fontSize: "12px",
                            color: "var(--muted)",
                            fontWeight: 700,
                            padding: "0 14px 8px 14px",
                          }}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            background: "var(--surface-2)",
                            borderRadius: "18px",
                            padding: "22px",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          No rows for this tab yet.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const badgeStyle = getGapBadge(row.gap);

                        return (
                          <tr key={`${row.role}-${row.missingSkill}`}>
                            <td
                              style={{
                                background: "var(--surface-2)",
                                padding: "18px 14px",
                                borderTopLeftRadius: "18px",
                                borderBottomLeftRadius: "18px",
                                fontWeight: 700,
                              }}
                            >
                              {row.role}
                            </td>
                            <td style={{ background: "var(--surface-2)", padding: "18px 14px" }}>{row.missingSkill}</td>
                            <td style={{ background: "var(--surface-2)", padding: "18px 14px" }}>
                              <span
                                style={{
                                  ...badgeStyle,
                                  padding: "7px 12px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                {row.gap}
                              </span>
                            </td>
                            <td style={{ background: "var(--surface-2)", padding: "18px 14px", fontWeight: 600 }}>
                              {row.suggestion}
                            </td>
                            <td style={{ background: "var(--surface-2)", padding: "18px 14px", minWidth: "180px" }}>
                              <div
                                style={{
                                  width: "100%",
                                  height: "10px",
                                  borderRadius: "999px",
                                  background: "var(--border)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${row.progress}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background: "linear-gradient(90deg, #19aa73 0%, #13895d 100%)",
                                  }}
                                />
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                                {row.progress}%
                              </div>
                            </td>
                            <td
                              style={{
                                background: "var(--surface-2)",
                                padding: "18px 14px",
                                borderTopRightRadius: "18px",
                                borderBottomRightRadius: "18px",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  background: "#1ea672",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "12px",
                                  padding: "10px 14px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Invite
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: "20px" }}>
            {/* CALENDAR */}
            <section
              role="button"
              tabIndex={0}
              onClick={() => navigate(calendarPath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(calendarPath);
                }
              }}
              style={{
                background: "var(--card)",
                borderRadius: "26px",
                padding: "24px",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
                minHeight: "470px",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 34px rgba(21, 61, 46, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(21, 61, 46, 0.05)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "24px" }}>{calendarMonthLabel}</div>
                  <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                    Upcoming activity highlights
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                    }}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                    }}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      cursor: "pointer",
                      fontSize: "16px",
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
                  gap: "10px",
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
                      paddingBottom: "8px",
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
                        height: "46px",
                        borderRadius: "14px",
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
                        color: isEmpty ? "transparent" : isStart || isEnd ? "#ffffff" : "var(--text)",
                        fontWeight: isStart || isEnd ? 800 : 700,
                        border: isEmpty ? "none" : "1px solid var(--border)",
                        fontSize: "15px",
                      }}
                    >
                      {day ?? ""}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "14px", marginTop: "12px", fontSize: "12px", color: "var(--muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#1ea672" }} />
                  Start date
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#f59e0b" }} />
                  End date
                </span>
              </div>

              <div
                style={{
                  marginTop: "22px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                {monthlyHighlights.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>No scheduled activities</div>
                    <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--muted)" }}>
                      There are no activities planned for this month.
                    </div>
                  </div>
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
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>{activity.title || "Untitled activity"}</div>
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--muted)" }}>
                          {when} · {activity.type}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* PAYROLL */}
            <section
              style={{
                background: "var(--card)",
                borderRadius: "26px",
                padding: "24px",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: "18px", fontSize: "16px" }}>Payroll Summary</div>

              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  ["Base Salary", "$3,200"],
                  ["Allowances", "$280"],
                  ["Meal", "$110"],
                  ["Internet", "$70"],
                  ["Health Insurance", "$120"],
                  ["Training Program", "$50"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: "10px",
                      borderBottom: "1px dashed var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--muted)", fontSize: "13px" }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{value}</span>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "15px 16px",
                    borderRadius: "16px",
                    background: "#edf8f3",
                    border: "1px solid #d7eee2",
                  }}
                >
                  <span style={{ fontWeight: 800 }}>Total Monthly Value</span>
                  <span style={{ fontWeight: 800, color: "#118457" }}>$3,830</span>
                </div>
              </div>
            </section>

            {/* NOTES */}
            <section
              style={{
                background: "var(--card)",
                borderRadius: "26px",
                padding: "24px",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 30px rgba(21, 61, 46, 0.05)",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: "14px", fontSize: "16px" }}>Internal Notes</div>

              <div style={{ display: "grid", gap: "14px" }}>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Promotion Feedback</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px", lineHeight: 1.6 }}>
                    Promoted from HR Assistant to HR Officer due to consistent performance and leadership.
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Employee Appreciation</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px", lineHeight: 1.6 }}>
                    Recognized by the head of HR for successfully leading the Q2 training rollout.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}