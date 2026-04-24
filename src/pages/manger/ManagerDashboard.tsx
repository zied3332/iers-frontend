import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import { getUsers } from "../../services/users.service";
import { getEmployeeSkills } from "../../services/skills.service";
import { listActivities, type ActivityRecord } from "../../services/activities.service";

type TeamUser = {
  _id: string;
  name: string;
  email: string;
  en_ligne?: boolean;
  date_embauche?: string;
  departement_id?: unknown;
};

type DashboardData = {
  managerName: string;
  departmentName: string;
  team: TeamUser[];
  onlineCount: number;
  assignedSkillsCount: number;
  skilledEmployeesCount: number;
  skillCategoryCounts: { knowledge: number; knowHow: number; soft: number };
  topSkills: Array<{ name: string; count: number }>;
  activities: ActivityRecord[];
};

function getDepartmentId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in (value as any)) {
    return String((value as any)._id || "");
  }
  return "";
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [data, setData] = useState<DashboardData>({
    managerName: "Manager",
    departmentName: "",
    team: [],
    onlineCount: 0,
    assignedSkillsCount: 0,
    skilledEmployeesCount: 0,
    skillCategoryCounts: { knowledge: 0, knowHow: 0, soft: 0 },
    topSkills: [],
    activities: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [me, users, departments, allActivities] = await Promise.all([
          getCurrentUser(),
          getUsers(),
          getAllDepartments(),
          listActivities().catch(() => []),
        ]);

        const managedDepartment = (departments || []).find((dept) => String(dept?.manager_id || "") === String(me?._id || ""));
        const departmentId = String(managedDepartment?._id || getDepartmentId((me as any)?.departement_id) || "");
        const departmentName = String(managedDepartment?.name || "My Department");

        const teamUsers = (users as any[])
          .filter((user) => String(user?.role || "").toUpperCase() === "EMPLOYEE")
          .filter((user) => getDepartmentId(user?.departement_id) === departmentId)
          .map((user) => ({
            _id: String(user?._id || ""),
            name: String(user?.name || "Employee"),
            email: String(user?.email || ""),
            en_ligne: Boolean(user?.en_ligne),
            date_embauche: String(user?.date_embauche || ""),
            departement_id: user?.departement_id,
          }));

        const onlineCount = teamUsers.filter((user) => user.en_ligne).length;

        const skillsByEmployee = await Promise.all(
          teamUsers.map((user) => getEmployeeSkills(user._id).catch(() => []))
        );

        const skillCategoryCounts = { knowledge: 0, knowHow: 0, soft: 0 };
        const skillCounter = new Map<string, number>();
        let assignedSkillsCount = 0;
        let skilledEmployeesCount = 0;

        skillsByEmployee.forEach((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          if (list.length > 0) skilledEmployeesCount += 1;
          assignedSkillsCount += list.length;

          list.forEach((row: any) => {
            const category = String(row?.skill?.category || "").toUpperCase();
            if (category === "KNOWLEDGE") skillCategoryCounts.knowledge += 1;
            if (category === "KNOW_HOW") skillCategoryCounts.knowHow += 1;
            if (category === "SOFT") skillCategoryCounts.soft += 1;

            const name = String(row?.skill?.name || "").trim();
            if (!name) return;
            skillCounter.set(name, (skillCounter.get(name) || 0) + 1);
          });
        });

        const topSkills = Array.from(skillCounter.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }));

        const activities = (Array.isArray(allActivities) ? allActivities : []).filter((activity) => {
          const byDepartment = String(activity?.departmentId || "") === departmentId;
          const byManager = String(activity?.responsibleManagerId || "") === String(me?._id || "");
          return byDepartment || byManager;
        });

        if (cancelled) return;

        setData({
          managerName: String(me?.name || "Manager"),
          departmentName,
          team: teamUsers,
          onlineCount,
          assignedSkillsCount,
          skilledEmployeesCount,
          skillCategoryCounts,
          topSkills,
          activities,
        });
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load manager dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const activityStats = useMemo(() => {
    const byStatus = { planned: 0, inProgress: 0, completed: 0, cancelled: 0 };
    data.activities.forEach((activity) => {
      const status = String(activity.status || "").toUpperCase();
      if (status === "PLANNED") byStatus.planned += 1;
      if (status === "IN_PROGRESS") byStatus.inProgress += 1;
      if (status === "COMPLETED") byStatus.completed += 1;
      if (status === "CANCELLED") byStatus.cancelled += 1;
    });
    return byStatus;
  }, [data.activities]);

  const hireTrend = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
      labels.push(d.toLocaleString("en", { month: "short" }));
    }

    const counts = keys.map((key) =>
      data.team.filter((user) => {
        const dt = new Date(user.date_embauche || "");
        if (Number.isNaN(dt.getTime())) return false;
        return monthKey(dt) === key;
      }).length
    );

    return { labels, counts };
  }, [data.team]);

  const maxTrend = Math.max(...hireTrend.counts, 1);
  const skillCoverage = data.team.length
    ? Math.round((data.skilledEmployeesCount / data.team.length) * 100)
    : 0;
  const avgSkillsPerEmployee = data.team.length
    ? (data.assignedSkillsCount / data.team.length).toFixed(1)
    : "0.0";

  const upcomingActivities = useMemo(() => {
    const now = new Date();
    return [...data.activities]
      .filter((activity) => {
        const dt = new Date(activity.startDate || "");
        if (Number.isNaN(dt.getTime())) return false;
        return dt.getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [data.activities]);

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

    data.activities.forEach((activity) => {
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
  }, [data.activities, calendarDate]);

  const monthlyHighlights = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    return [...data.activities]
      .filter((activity) => {
        const dt = new Date(activity.startDate || activity.createdAt || "");
        return !Number.isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === month;
      })
      .sort(
        (a, b) =>
          new Date(a.startDate || a.createdAt || 0).getTime() -
          new Date(b.startDate || b.createdAt || 0).getTime()
      )
      .slice(0, 2);
  }, [data.activities, calendarDate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "24px",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: "1480px", margin: "0 auto", display: "grid", gap: "18px" }}>
        <section
          style={{
            background: "var(--card)",
            borderRadius: 24,
            padding: "24px 28px",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Manager Command Center
            </div>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15, fontWeight: 800 }}>
              {data.departmentName || "Department"} Overview
            </h1>
            <div style={{ marginTop: 8, color: "var(--muted)", fontWeight: 600, fontSize: 16 }}>
              Live team, skills, and activity indicators for {data.managerName}.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                background: "var(--surface-2)",
                padding: "10px 14px",
                fontWeight: 700,
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Updated {new Date().toLocaleDateString()}
            </div>
            <button type="button" className="btn btn-primary">
              Team Snapshot
            </button>
          </div>
        </section>

        {error ? (
          <div className="content-card" style={{ borderRadius: 20 }}>
            <div className="alert alert-error">{error}</div>
          </div>
        ) : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {[
            {
              title: "Team Members",
              value: loading ? "..." : String(data.team.length),
              note: "Employees in department",
              accent: "#3b82f6",
            },
            {
              title: "Online Now",
              value: loading ? "..." : String(data.onlineCount),
              note: "Current availability",
              accent: "var(--primary)",
            },
            {
              title: "Skill Coverage",
              value: loading ? "..." : `${skillCoverage}%`,
              note: "Employees with skills",
              accent: "#7c3aed",
            },
            {
              title: "Avg Skills / Employee",
              value: loading ? "..." : avgSkillsPerEmployee,
              note: "Assigned skills density",
              accent: "#f59e0b",
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: "var(--surface)",
                borderRadius: 22,
                padding: 20,
                border: `1px solid color-mix(in srgb, var(--border) 72%, ${card.accent})`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                minHeight: 130,
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--muted)", fontSize: 14 }}>{card.title}</div>
              <div style={{ marginTop: 8, fontSize: 38, lineHeight: 1, fontWeight: 900, color: "var(--text)" }}>{card.value}</div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>{card.note}</div>
            </div>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, 1fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <section
              style={{
                background: "var(--card)",
                borderRadius: 24,
                padding: 22,
                border: "1px solid var(--border)",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
              }}
            >
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ fontSize: 18 }}>Hiring Trend (6 Months)</div>
            </div>
            <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12, alignItems: "end", minHeight: 186 }}>
              {hireTrend.counts.map((count, index) => (
                <div key={`${hireTrend.labels[index]}-${count}`} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      height: `${Math.max((count / maxTrend) * 130, 10)}px`,
                      borderRadius: 12,
                      background: "linear-gradient(180deg, var(--primary), var(--primary-hover))",
                    }}
                  />
                  <div style={{ marginTop: 8, fontWeight: 700, color: "var(--muted)", fontSize: 13 }}>{hireTrend.labels[index]}</div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{loading ? "..." : count}</div>
                </div>
              ))}
            </div>

            <div className="section-head" style={{ marginTop: 18, marginBottom: 8 }}>
              <div className="section-title" style={{ fontSize: 18 }}>Upcoming Department Activities</div>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Type</th>
                    <th>Start</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3}>Loading...</td></tr>
                  ) : upcomingActivities.length === 0 ? (
                    <tr><td colSpan={3}>No upcoming activities for your department.</td></tr>
                  ) : (
                    upcomingActivities.map((item) => (
                      <tr key={item._id}>
                        <td className="cell-title">{item.title}</td>
                        <td>{item.type}</td>
                        <td>{new Date(item.startDate).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </section>

            <section
              style={{
                background: "var(--card)",
                borderRadius: 24,
                padding: 22,
                border: "1px solid var(--border)",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
              }}
            >
              <div className="section-head" style={{ marginBottom: 12 }}>
                <div className="section-title" style={{ fontSize: 18 }}>Activities by Status</div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Planned", value: activityStats.planned, color: "#3b82f6" },
                  { label: "In Progress", value: activityStats.inProgress, color: "#f59e0b" },
                  { label: "Completed", value: activityStats.completed, color: "var(--primary)" },
                  { label: "Cancelled", value: activityStats.cancelled, color: "#ef4444" },
                ].map((item) => {
                  const total = Math.max(data.activities.length, 1);
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontWeight: 700 }}>
                        <span>{item.label}</span>
                        <strong>{loading ? "..." : item.value}</strong>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${loading ? 0 : pct}%`, background: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="section-head" style={{ marginTop: 18, marginBottom: 8 }}>
                <div className="section-title" style={{ fontSize: 18 }}>Skills by Category</div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { label: "Knowledge", value: data.skillCategoryCounts.knowledge },
                  { label: "Know-how", value: data.skillCategoryCounts.knowHow },
                  { label: "Soft", value: data.skillCategoryCounts.soft },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      borderRadius: 10,
                      padding: "9px 11px",
                      fontWeight: 700,
                    }}
                  >
                    <span>{item.label}</span>
                    <strong>{loading ? "..." : item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section
            role="button"
            tabIndex={0}
            onClick={() => navigate("/manager/calendar")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/manager/calendar");
              }
            }}
            style={{
              background: "var(--card)",
              borderRadius: 24,
              padding: 22,
              border: "1px solid var(--border)",
              boxShadow: "0 10px 26px rgba(15, 23, 42, 0.07)",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 14px 32px rgba(15, 23, 42, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 26px rgba(15, 23, 42, 0.07)";
            }}
          >
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ fontSize: 18 }}>{calendarMonthLabel}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
              <span>Department activities calendar</span>
              <span style={{ display: "inline-flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}
                >
                  →
                </button>
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7, fontSize: 12, textAlign: "center", marginBottom: 10 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={`${d}-${i}`} style={{ color: "var(--muted)", fontWeight: 800, paddingBottom: 4 }}>{d}</div>
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
                      height: 34,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: isEmpty
                        ? "transparent"
                        : isBoth
                          ? "linear-gradient(135deg, var(--primary) 0%, #f59e0b 100%)"
                          : isStart
                            ? "var(--primary)"
                            : isEnd
                              ? "#f59e0b"
                              : "var(--surface-2)",
                      color: isEmpty ? "transparent" : isStart || isEnd ? "#fff" : "var(--text)",
                      border: isEmpty ? "none" : "1px solid var(--border)",
                      fontWeight: isStart || isEnd ? 800 : 700,
                    }}
                  >
                    {day ?? ""}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 14, color: "var(--muted)", fontSize: 12, marginBottom: 14 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--primary)" }} />Start</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: "#f59e0b" }} />End</span>
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {loading ? (
                <span className="muted">Loading...</span>
              ) : monthlyHighlights.length === 0 ? (
                <span className="muted">No department activities in this month.</span>
              ) : (
                monthlyHighlights.map((item) => (
                  <div key={item._id} style={{ display: "flex", justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface-2)" }}>
                    <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                    <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                      {new Date(item.startDate || item.createdAt || "").toLocaleDateString("en", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="section-head" style={{ marginBottom: 8 }}>
              <div className="section-title" style={{ fontSize: 18 }}>Top Team Skills</div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {loading ? (
                <span className="muted">Loading...</span>
              ) : data.topSkills.length === 0 ? (
                <span className="muted">No assigned skills found yet.</span>
              ) : (
                data.topSkills.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "9px 11px",
                      background: "var(--surface)",
                    }}
                  >
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
