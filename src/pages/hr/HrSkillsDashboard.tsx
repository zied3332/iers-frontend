import React, { useMemo } from "react";

type TopSkill = { name: string; value: number };
type HeatRow = { skill: string; low: number; medium: number; high: number; expert: number };

export default function HrSkillsDashboard() {
  const topSkills: TopSkill[] = [
    { name: "Java", value: 87 },
    { name: "Python", value: 79 },
    { name: "Database Design", value: 65 },
    { name: "AWS", value: 58 },
    { name: "Spring Boot", value: 54 },
  ];

  const heatRows: HeatRow[] = useMemo(
    () => [
      { skill: "Java", low: 10, medium: 15, high: 23, expert: 20 },
      { skill: "Python", low: 8, medium: 20, high: 31, expert: 14 },
      { skill: "Database Design", low: 9, medium: 18, high: 25, expert: 11 },
      { skill: "AWS", low: 14, medium: 24, high: 12, expert: 8 },
      { skill: "Unit Testing", low: 6, medium: 19, high: 20, expert: 10 },
    ],
    []
  );

  return (
     
    <div>
      {/* Header row */}
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="header-title" style={{ fontSize: 26 }}>Skills Dashboard</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Distribution, top skills, heatmap, gaps and learning progress.
          </div>
        </div>

        <div className="hr-actions">
          <select className="select" defaultValue="Department">
            <option>Department</option>
            <option>Engineering</option>
            <option>IT Support</option>
            <option>Marketing</option>
            <option>Sales</option>
          </select>

          <select className="select" defaultValue="Skill Type">
            <option>Skill Type</option>
            <option>Technical</option>
            <option>Soft</option>
            <option>Tools</option>
          </select>

          <select className="select" defaultValue="Apr 2023 – Apr 2024">
            <option>Apr 2023 – Apr 2024</option>
            <option>Jan 2024 – Apr 2024</option>
            <option>2023</option>
          </select>

          <button className="btn btn-primary">Filter</button>
        </div>
      </div>

      <div className="skills-grid">
        {/* LEFT column */}
        <div className="skills-left">
          {/* Skill Distribution */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Skill Distribution</div>
              <span className="badge badge-high">+10% Good Progress</span>
            </div>

            <div className="dist">
              <div className="dist-row">
                <div className="dist-label">Low</div>
                <div className="dist-bar">
                  <div className="dist-fill low" style={{ width: "11%" }} />
                  <div className="dist-fill medium" style={{ width: "32%" }} />
                  <div className="dist-fill high" style={{ width: "41%" }} />
                  <div className="dist-fill expert" style={{ width: "16%" }} />
                </div>
              </div>

              <div className="dist-legend">
                <span className="legend-item"><span className="dot low" /> Low</span>
                <span className="legend-item"><span className="dot medium" /> Medium</span>
                <span className="legend-item"><span className="dot high" /> High</span>
                <span className="legend-item"><span className="dot expert" /> Expert</span>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Heatmap of Skills</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select className="select" defaultValue="Engineering">
                  <option>Engineering</option>
                  <option>IT Support</option>
                  <option>Marketing</option>
                </select>
                <a className="hr-back" href="#">View All</a>
              </div>
            </div>

            <div className="heat">
              <div className="heat-head">
                <div>Skill</div>
                <div>Low</div>
                <div>Medium</div>
                <div>High</div>
                <div>Expert</div>
                <div></div>
              </div>

              {heatRows.map((r) => (
                <div className="heat-row" key={r.skill}>
                  <div className="heat-skill">{r.skill}</div>
                  <div className={`heat-cell c-low`}>{r.low}</div>
                  <div className={`heat-cell c-med`}>{r.medium}</div>
                  <div className={`heat-cell c-high`}>{r.high}</div>
                  <div className={`heat-cell c-exp`}>{r.expert}</div>
                  <div>
                    <button className="btn btn-small">More</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Opportunities Metrics */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Learning Opportunities Metrics</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-val">4</div>
                <div className="metric-label">Open Seats</div>
              </div>
              <div className="metric">
                <div className="metric-val">15</div>
                <div className="metric-label">Employees Engaged</div>
              </div>
              <div className="metric">
                <div className="metric-val">6</div>
                <div className="metric-label">Awaiting Approval</div>
              </div>
              <div className="metric">
                <div className="metric-val">+2.15%</div>
                <div className="metric-label">Average Improvement</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="skills-right">
          {/* Top Skills */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Top Skills</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="bar-list">
              {topSkills.map((s) => (
                <div className="bar-item" key={s.name}>
                  <div className="bar-label">
                    <span className="bar-name">{s.name}</span>
                    <span className="meta">{s.value}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Gaps */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Skill Gaps</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="stack">
              <div className="history-item">
                <div>
                  <div className="history-title">Critical Gap</div>
                  <div className="history-date">120 employees have Medium/High SQL knowledge</div>
                </div>
                <span className="badge badge-low">-2</span>
              </div>

              <div className="muted" style={{ marginTop: 2 }}>Recommended Activities</div>

              <div className="history-item">
                <div>
                  <div className="history-title">SQL Database Training</div>
                  <div className="history-date">matching 2 employees and 4 roles</div>
                </div>
                <span className="badge badge-medium">-1</span>
              </div>

              <div className="history-item">
                <div>
                  <div className="history-title">Advanced AWS Workshop</div>
                  <div className="history-date">matching 2 employees and 4 tiers</div>
                </div>
                <span className="badge badge-medium">-2</span>
              </div>

              <div className="history-item">
                <div>
                  <div className="history-title">Effective Communication</div>
                  <div className="history-date">matching 4 employees and 4 roles</div>
                </div>
                <span className="badge">-1</span>
              </div>
            </div>
          </div>

          {/* Learning Progress */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Learning Progress</div>
              <a className="hr-back" href="#">View All</a>
            </div>

            <div className="bar-list">
              <div className="bar-item">
                <div className="bar-label">
                  <span className="bar-name">Activities Complete</span>
                  <span className="badge badge-high">+15%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: "70%" }} />
                </div>
                <div className="muted" style={{ marginTop: 6 }}>Average improvement: +2.4</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
}