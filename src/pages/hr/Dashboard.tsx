import React, { useMemo, useState } from "react";

type GapRow = {
  role: string;
  missingSkill: string;
  gap: "High" | "Medium" | "Low";
  suggestion: string;
  coverage: number; // for the right-side bars
};

export default function HrDashboard() {
  const [tab, setTab] = useState<"All" | "Engineering" | "IT Support" | "Marketing">("All");

  const rows: GapRow[] = useMemo(
    () => [
      { role: "Software Engineer", missingSkill: "SQL", gap: "High", suggestion: "SQL Database Training", coverage: 85 },
      { role: "DevOps Specialist", missingSkill: "Kubernetes", gap: "Medium", suggestion: "Kubernetes Essentials", coverage: 72 },
      { role: "Cloud Architect", missingSkill: "AWS", gap: "Medium", suggestion: "Advanced AWS Workshop", coverage: 69 },
      { role: "IT Support", missingSkill: "Security Basics", gap: "Low", suggestion: "Security Fundamentals", coverage: 58 },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (tab === "All") return rows;
    return rows.filter((r) => r.role.toLowerCase().includes(tab.toLowerCase()));
  }, [rows, tab]);

  const gapBadgeClass = (gap: GapRow["gap"]) => {
    if (gap === "High") return "badge badge-high";
    if (gap === "Medium") return "badge badge-medium";
    return "badge badge-low";
  };

  return (
    <div className="hr-page">
      <div className="container">
        {/* Topbar (like the image header row) */}
        <div className="hr-topbar">
          <a className="hr-back" href="#">
            IntelliHR
          </a>

          <div className="hr-actions">
            <input className="input" placeholder="Search…" />
            <button className="btn btn-ghost">Export</button>
            <button className="btn btn-primary">New Activity</button>
          </div>
        </div>

        {/* KPI cards row (like “Total Employees / Open Activities / Alerts / Coverage”) */}
        <div className="two-cols" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="card header-card">
            <div className="section-title">Critical Skill Gaps</div>
            <div className="score-value">3</div>
            <div className="score-sub">Roles severely lack key skills</div>
          </div>

          <div className="card header-card">
            <div className="section-title">At Risk Employees</div>
            <div className="score-value">18</div>
            <div className="score-sub">Critical gaps in needed skills</div>
          </div>

          <div className="card header-card">
            <div className="section-title">Suggested Activities</div>
            <div className="score-value">5</div>
            <div className="score-sub">Training recommendations ready</div>
          </div>

          <div className="card header-card">
            <div className="section-title">Training Coverage</div>
            <div className="score-value">74%</div>
            <div className="score-sub">
              <span className="score-up">+6%</span> vs last month
            </div>
          </div>
        </div>

        {/* Main dashboard grid (left content + right sidebar) */}
        <div className="hr-grid" style={{ marginTop: 12 }}>
          {/* LEFT COLUMN */}
          <div>
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Critical Skills Gap</div>
                <a className="hr-back" href="#">
                  View All
                </a>
              </div>

              {/* Tabs like the image */}
              <div className="tabs">
                {(["All", "Engineering", "IT Support", "Marketing"] as const).map((t) => (
                  <button
                    key={t}
                    className={`tab ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Table styled by your .table */}
              <div style={{ marginTop: 10 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Missing Skill</th>
                      <th>Gap</th>
                      <th>Suggestion</th>
                      <th style={{ width: 140 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.role}</td>
                        <td>{r.missingSkill}</td>
                        <td>
                          <span className={gapBadgeClass(r.gap)}>{r.gap}</span>
                        </td>
                        <td>{r.suggestion}</td>
                        <td>
                          <button className="btn btn-primary btn-small w-full" type="button">
                            + Invite
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="muted">
                  Tip: keep this table short (3–6 rows) and push the rest into “View All” like the UI in your image.
                </p>
              </div>
            </div>

            {/* Recent activities (matches the “Recent Activities” block style) */}
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Recent Activities</div>
                <a className="hr-back" href="#">
                  View All
                </a>
              </div>

              <div className="history">
                <div className="history-item">
                  <div>
                    <div className="history-title">Advanced Java Workshop</div>
                    <div className="history-date">Apr 25, 2024 • 2 days</div>
                  </div>
                  <span className="badge badge-high">Upcoming</span>
                </div>

                <div className="history-item">
                  <div>
                    <div className="history-title">IT Infrastructure Update</div>
                    <div className="history-date">May 2, 2024 • Critical</div>
                  </div>
                  <span className="badge badge-low">Critical</span>
                </div>

                <div className="history-item">
                  <div>
                    <div className="history-title">New Hire Orientation</div>
                    <div className="history-date">Apr 18, 2024 • Completed</div>
                  </div>
                  <span className="badge badge-expert">Completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (sidebar like the image) */}
          <div className="hr-right">
            {/* Skills Gap Analysis with bars */}
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Skills Gap Analysis</div>
                <a className="hr-back" href="#">
                  View All
                </a>
              </div>

              <div className="bar-list">
                {[
                  { name: "Engineering", value: 85 },
                  { name: "IT Support", value: 72 },
                  { name: "Marketing", value: 69 },
                  { name: "Sales", value: 61 },
                  { name: "HR", value: 58 },
                ].map((b) => (
                  <div className="bar-item" key={b.name}>
                    <div className="bar-label">
                      <span className="bar-name">{b.name}</span>
                      <span className="meta">{b.value}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${b.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested activities list */}
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Suggested Activities</div>
                <a className="hr-back" href="#">
                  View All
                </a>
              </div>

              <div className="stack">
                {[
                  { title: "SQL Database Training", meta: "5 employees", badge: "badge badge-medium" },
                  { title: "Effective Communication", meta: "8 employees", badge: "badge badge-expert" },
                  { title: "Kubernetes Essentials", meta: "4 employees", badge: "badge badge-medium" },
                ].map((a) => (
                  <div className="history-item" key={a.title}>
                    <div>
                      <div className="history-title">{a.title}</div>
                      <div className="history-date">{a.meta}</div>
                    </div>
                    <span className={a.badge}>4★</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Small summary card */}
            <div className="card section-card">
              <div className="section-title">Notes</div>
              <p className="muted">
                Focus on the top 3 gaps this week and send targeted invites. This layout is intentionally “dashboard-ish”
                like your reference image.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}