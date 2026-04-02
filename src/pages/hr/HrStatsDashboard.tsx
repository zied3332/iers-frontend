import { useEffect, useMemo, useState } from "react";
import { listActivities, type ActivityRecord } from "../../services/activities.service";
import { getAllSkills } from "../../services/skills.service";

type Skill = {
  _id: string;
  name: string;
  category: "KNOWLEDGE" | "KNOW_HOW" | "SOFT";
  description?: string;
};

function fmtCategory(value: string) {
  if (value === "KNOWLEDGE") return "Knowledge";
  if (value === "KNOW_HOW") return "Know-how";
  if (value === "SOFT") return "Soft";
  return value;
}

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
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [activities]);

  const monthTrend = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];
    const labels: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push(key);
      labels.push(d.toLocaleString("en", { month: "short" }));
    }

    const counts = keys.map((k) => {
      return activities.filter((a) => {
        const dt = new Date(a.createdAt || a.startDate || "");
        if (Number.isNaN(dt.getTime())) return false;
        const kk = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        return kk === k;
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
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${h - padY} L ${points[0]?.x || 0} ${h - padY} Z`;
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
    const max = Math.max(skillStats.knowledge, skillStats.knowHow, skillStats.soft, 1);
    return [
      { label: "Knowledge", value: skillStats.knowledge, color: "#2563eb", pct: (skillStats.knowledge / max) * 100 },
      { label: "Know-how", value: skillStats.knowHow, color: "#7c3aed", pct: (skillStats.knowHow / max) * 100 },
      { label: "Soft", value: skillStats.soft, color: "#14b8a6", pct: (skillStats.soft / max) * 100 },
    ];
  }, [skillStats]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Dashboard</h1>
          <p className="page-subtitle">Activities and skills statistics overview.</p>
        </div>
      </div>

      {error && (
        <div className="content-card">
          <div className="alert alert-error">{error}</div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div className="content-card" style={{ background: "linear-gradient(140deg, #eff6ff 0%, #dbeafe 100%)", borderColor: "#bfdbfe" }}>
          <div className="form-label">Total Activities</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{loading ? "..." : activityStats.total}</div>
        </div>
        <div className="content-card" style={{ background: "linear-gradient(140deg, #fff7ed 0%, #ffedd5 100%)", borderColor: "#fed7aa" }}>
          <div className="form-label">In Progress</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{loading ? "..." : activityStats.inProgress}</div>
        </div>
        <div className="content-card" style={{ background: "linear-gradient(140deg, #ecfdf5 0%, #d1fae5 100%)", borderColor: "#a7f3d0" }}>
          <div className="form-label">Completed</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{loading ? "..." : activityStats.completed}</div>
        </div>
        <div className="content-card" style={{ background: "linear-gradient(140deg, #f5f3ff 0%, #ede9fe 100%)", borderColor: "#ddd6fe" }}>
          <div className="form-label">Total Skills</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{loading ? "..." : skillStats.total}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div className="content-card">
          <div className="page-subtitle" style={{ marginTop: 0 }}>Activity Trend (6 months)</div>
          <svg viewBox={`0 0 ${chartData.w} ${chartData.h}`} style={{ width: "100%", marginTop: 10 }}>
            <defs>
              <linearGradient id="hrTrendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={chartData.areaPath} fill="url(#hrTrendArea)" />
            <path d={chartData.linePath} stroke="#15803d" strokeWidth="3" fill="none" strokeLinecap="round" />
            {chartData.points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#15803d" />
                <text x={p.x} y={chartData.h - 2} textAnchor="middle" fontSize="11" fill="#64748b">
                  {monthTrend.labels[i]}
                </text>
              </g>
            ))}
          </svg>

          <div className="page-subtitle" style={{ marginTop: 12 }}>Recent Activities</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="empty-state">Loading...</td>
                  </tr>
                ) : recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-state">No activities found.</td>
                  </tr>
                ) : (
                  recentActivities.map((a) => (
                    <tr key={a._id}>
                      <td className="cell-title">{a.title}</td>
                      <td>{a.status}</td>
                      <td>{a.type}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-card">
          <div className="page-subtitle" style={{ marginTop: 0 }}>Activities by Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14, marginTop: 10, alignItems: "center" }}>
            <svg viewBox="0 0 120 120" width="110" height="110" style={{ overflow: "visible" }}>
              <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="14" />
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
              <text x="60" y="58" textAnchor="middle" fontSize="11" fill="#64748b">Total</text>
              <text x="60" y="74" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{loading ? "..." : activityPie.total}</text>
            </svg>

            <div style={{ display: "grid", gap: 6 }}>
              {activityPie.segments.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: s.color }} />
                    {s.label}
                  </span>
                  <strong>{loading ? "..." : s.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="page-subtitle" style={{ marginTop: 14 }}>Skills by Category</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {skillBars.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{item.label}</span>
                  <strong>{loading ? "..." : item.value}</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
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

          <div className="page-subtitle" style={{ marginTop: 14 }}>Most Required Skills</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {loading ? (
              <span className="muted">Loading...</span>
            ) : topRequiredSkills.length === 0 ? (
              <span className="muted">No required-skills data yet.</span>
            ) : (
              topRequiredSkills.map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: 12 }}>
        <div className="page-subtitle" style={{ marginTop: 0 }}>Quick Skill Snapshot</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
          {[
            ["Knowledge", skillStats.knowledge, "#dbeafe"],
            ["Know-how", skillStats.knowHow, "#ede9fe"],
            ["Soft", skillStats.soft, "#ccfbf1"],
          ].map(([label, value, bg]) => (
            <div key={String(label)} style={{ background: String(bg), borderRadius: 14, padding: 14 }}>
              <div style={{ color: "#334155", fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900 }}>{loading ? "..." : value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}