import React from "react";

type EmployeeReco = {
  name: string;
  role: string;
  match: number;
  tags: string[];
    photoUrl: string;

};

type GapRow = {
  role: string;
  missingSkill: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  suggestion: string;
};

type Activity = {
  title: string;
  meta: string;
  badge: "Critical" | "Recommended" | "New";
};

type DeptRisk = {
  name: string;
  value: number;
  delta: number; // +/-
  level: "Critical" | "Warning" | "Medium";
};

const severityBadge = (s: GapRow["severity"]) => {
  if (s === "Critical") return "badge badge-low";
  if (s === "High") return "badge badge-high";
  if (s === "Medium") return "badge badge-medium";
  return "badge";
};

const riskBarStyle = (level: DeptRisk["level"]) => {
  // we only have green in your theme, so we keep fill green but use badges for risk color
  // (if you want colored fills later, we can add CSS variables for danger/warning bars)
  return "bar-fill";
};

const riskBadge = (level: DeptRisk["level"]) => {
  if (level === "Critical") return "badge badge-low";
  if (level === "Warning") return "badge badge-medium";
  return "badge";
};

export default function ManagerDashboard() {
  const employees: EmployeeReco[] = [
    {
      name: "John Doe",
      role: "Lead Software Engineer",
      match: 92,
      tags: ["Java", "Machine Learning", "Database Design", "Leadership"],
       photoUrl: "https://randomuser.me/api/portraits/men/31.jpg",
    },
    {
      name: "Sarah Anderson",
      role: "Java Developer",
      match: 89,
      tags: ["Java", "Spring Boot", "Databases", "Leadership"],
      photoUrl: "https://randomuser.me/api/portraits/women/94.jpg",

    },
    {
      name: "Mark Smith",
      role: "Senior Software Engineer",
      match: 87,
      tags: ["Java", "REST APIs", "Unit Testing", "Architecture"],
       photoUrl: "https://randomuser.me/api/portraits/men/35.jpg",
    },
  ];

  const gapRows: GapRow[] = [
    { role: "Software Engineer", missingSkill: "SQL", severity: "Critical", suggestion: "SQL Database Training" },
    { role: "DevOps Specialist", missingSkill: "Kubernetes", severity: "High", suggestion: "Kubernetes Essentials" },
    { role: "Cloud Architect", missingSkill: "AWS", severity: "Medium", suggestion: "Advanced AWS Workshop" },
    { role: "Infrastructure Analyst", missingSkill: "Information Security", severity: "Medium", suggestion: "Security Audits" },
  ];

  const departments: DeptRisk[] = [
    { name: "Engineering", value: 53, delta: 15, level: "Critical" },
    { name: "IT Support", value: 61, delta: 5, level: "Warning" },
    { name: "Marketing", value: 67, delta: 7, level: "Medium" },
  ];

  const suggested: Activity[] = [
    { title: "SQL Database Training", meta: "matching 5 employees", badge: "Critical" },
    { title: "Automated Testing foundations", meta: "matching 6 employees", badge: "Recommended" },
    { title: "Effective Communication", meta: "matching 4 employees", badge: "New" },
  ];

  return (
    <div>
      {/* Title row like the screenshot */}
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="header-title" style={{ fontSize: 26 }}>Skill Gap Analysis</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Overview of gaps, risk departments, and recommended actions.
          </div>
        </div>

        {/* Filters */}
        <div className="hr-actions">
          <select className="select" defaultValue="Engineering">
            <option>Engineering</option>
            <option>IT Support</option>
            <option>Marketing</option>
            <option>Sales</option>
            <option>HR</option>
          </select>
          <button className="btn btn-primary btn-small">April 2024</button>
        </div>
      </div>

      {/* KPI cards (Skill Gap Overview) */}
      <div className="kpi-grid">
        <div className="card header-card">
          <div className="section-title">Critical Skill Gaps</div>
          <div className="score-value">3</div>
          <div className="score-sub">3 roles severely lack key skills</div>
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
      </div>

      {/* Main area: left content + right panels (like screenshot) */}
      <div className="hr-grid" style={{ marginTop: 14 }}>
        {/* LEFT column */}
        <div>
          {/* Recommended Employees (like the earlier dashboard image) */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Recommended Employees</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="tabs">
              <button className="tab active" type="button">Best Matches</button>
              <button className="tab" type="button">Upskilling Candidates</button>
            </div>

            <div className="stack">
              {employees.map((e) => (
                <div key={e.name} className="history-item" style={{ alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
<img className="avatar-img" src={e.photoUrl} alt={e.name} />                    <div>
                      <div className="history-title">{e.name}</div>
                      <div className="history-date">{e.role}</div>
                      <div className="tags">
                        {e.tags.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <span className="badge badge-high">{e.match}%</span>
                    <button className="btn btn-primary btn-small" type="button">+ Invite</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Skills Gap table (matches screenshot) */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Critical Skills Gap</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Missing Skill</th>
                  <th>Gap Severity</th>
                  <th>Suggestion</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {gapRows.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.role}</td>
                    <td>{r.missingSkill}</td>
                    <td>
                      <span className={severityBadge(r.severity)}>{r.severity}</span>
                    </td>
                    <td>{r.suggestion}</td>
                    <td>
                      <button className="btn btn-primary btn-small w-full" type="button">
                        Invite Employees
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT column (panels like screenshot) */}
        <div className="hr-right">
          {/* Departments at Risk */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Departments At Risk</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="bar-list">
              {departments.map((d) => (
                <div className="bar-item" key={d.name}>
                  <div className="bar-label">
                    <span className="bar-name">{d.name}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={riskBadge(d.level)}>{d.value}%</span>
                      <span className="meta">{d.delta > 0 ? `+${d.delta}%` : `${d.delta}%`}</span>
                    </div>
                  </div>

                  <div className="bar-track">
                    <div className={riskBarStyle(d.level)} style={{ width: `${d.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Activities */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Suggested Activities</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="stack">
              {suggested.map((a) => (
                <div key={a.title} className="history-item">
                  <div>
                    <div className="history-title">{a.title}</div>
                    <div className="history-date">{a.meta}</div>
                  </div>

                  <span
                    className={
                      a.badge === "Critical"
                        ? "badge badge-low"
                        : a.badge === "Recommended"
                        ? "badge badge-medium"
                        : "badge"
                    }
                  >
                    {a.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Progress */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Learning Progress</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="stack">
              <div className="history-item">
                <div>
                  <div className="history-title">Activities Complete</div>
                  <div className="history-date">matching 5 employees</div>
                </div>
                <span className="badge badge-high">+15%</span>
              </div>

              <div className="history-item">
                <div>
                  <div className="history-title">Organization Retention</div>
                  <div className="history-date">quarterly change</div>
                </div>
                <span className="badge badge-expert">+2.4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}