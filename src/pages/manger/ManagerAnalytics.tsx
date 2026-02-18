import "../../index.css";

const trend = [
  { x: "W1", y: 62 },
  { x: "W2", y: 66 },
  { x: "W3", y: 64 },
  { x: "W4", y: 70 },
  { x: "W5", y: 74 },
  { x: "W6", y: 77 },
  { x: "W7", y: 79 },
  { x: "W8", y: 78 },
];

const performers = [
  { name: "Sara Ben Ali", role: "Data Analyst", score: 84 },
  { name: "Adam Taylor", role: "Backend Developer", score: 78 },
  { name: "Lina Khelifi", role: "Frontend Developer", score: 76 },
];

const dist = { low: 0, medium: 1, high: 2, expert: 1 };

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function buildSparkline(points: { y: number }[], w = 520, h = 170, pad = 16) {
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const scaleX = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const scaleY = (y: number) => {
    const t = max === min ? 0.5 : (y - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  };
  const d = points.map((p, i) => `${scaleX(i)},${scaleY(p.y)}`).join(" ");
  return { d, min, max };
}

export default function ManagerAnalytics() {
  const total = dist.low + dist.medium + dist.high + dist.expert;

  const kpis = [
    { label: "Team Avg Score", value: "77.5", hint: "+2.1 vs last month" },
    { label: "Active Members", value: "12", hint: "1 on leave" },
    { label: "Pending Reviews", value: "3", hint: "Due this week" },
    { label: "New Activities", value: "9", hint: "Last 7 days" },
  ];

  const { d } = buildSparkline(trend);

  return (
    <div className="container" style={{ display: "grid", gap: 14 }}>
      {/* KPIs */}
      <div className="metrics">
        {kpis.map((k) => (
          <div key={k.label} className="metric card">
            <div className="metric-val">{k.value}</div>
            <div className="metric-label">{k.label}</div>
            <div className="muted" style={{ margin: "6px 0 0" }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="manager-analytics-grid">
        {/* Line chart */}
        <div className="card section-card">
          <div className="section-head">
            <div>
              <div className="section-title">Team Score Trend</div>
              <div className="muted">Weekly average score (mock)</div>
            </div>
            <div className="badge">Last 8 weeks</div>
          </div>

          <div className="chart-shell">
            <svg viewBox="0 0 520 170" className="chart-svg" role="img">
              {/* grid */}
              <g className="chart-grid">
                <line x1="16" y1="30" x2="504" y2="30" />
                <line x1="16" y1="85" x2="504" y2="85" />
                <line x1="16" y1="140" x2="504" y2="140" />
              </g>

              {/* area under line (soft) */}
              <polyline className="chart-area" points={`${d} 504,154 16,154`} />

              {/* line */}
              <polyline className="chart-line" points={d} />

              {/* points */}
              {trend.map((p, i) => {
                // simple mapping reused from buildSparkline by rebuilding quickly:
                const w = 520, h = 170, pad = 16;
                const ys = trend.map((t) => t.y);
                const min = Math.min(...ys);
                const max = Math.max(...ys);
                const x = pad + (i * (w - pad * 2)) / (trend.length - 1);
                const t = max === min ? 0.5 : (p.y - min) / (max - min);
                const y = h - pad - t * (h - pad * 2);
                return <circle key={p.x} className="chart-dot" cx={x} cy={y} r="4" />;
              })}
            </svg>
          </div>

          <div className="chart-x">
            {trend.map((p) => (
              <span key={p.x}>{p.x}</span>
            ))}
          </div>
        </div>

        {/* Right column: distribution + top performers */}
        <div className="manager-right">
          {/* Distribution */}
          <div className="card section-card">
            <div className="section-head">
              <div>
                <div className="section-title">Skill Level Distribution</div>
                <div className="muted">Across your team</div>
              </div>
            </div>

            <div className="dist">
              <div className="dist-row">
                <div className="dist-label">Team</div>
                <div className="dist-bar">
                  <div className="dist-fill low" style={{ width: `${pct(dist.low, total)}%` }} />
                  <div className="dist-fill.medium" style={{ display: "none" }} />
                  <div className="dist-fill medium" style={{ width: `${pct(dist.medium, total)}%` }} />
                  <div className="dist-fill high" style={{ width: `${pct(dist.high, total)}%` }} />
                  <div className="dist-fill expert" style={{ width: `${pct(dist.expert, total)}%` }} />
                </div>
              </div>

              <div className="dist-chips">
                <span className="chip low">Low: {dist.low}</span>
                <span className="chip medium">Medium: {dist.medium}</span>
                <span className="chip high">High: {dist.high}</span>
                <span className="chip expert">Expert: {dist.expert}</span>
              </div>
            </div>
          </div>

          {/* Top performers */}
          <div className="card section-card">
            <div className="section-head">
              <div>
                <div className="section-title">Top Performers</div>
                <div className="muted">Highest scores (mock)</div>
              </div>
              <button className="btn btn-small">View all</button>
            </div>

            <div className="perf-list">
              {performers.map((p) => (
                <div key={p.name} className="perf-item">
                  <div className="perf-left">
                    <div className="perf-name">{p.name}</div>
                    <div className="perf-role">{p.role}</div>
                  </div>
                  <div className="perf-score">{p.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Optional: keep your table below if you want */}
      {/* <div className="card section-card">...team table preview...</div> */}
    </div>
  );
}