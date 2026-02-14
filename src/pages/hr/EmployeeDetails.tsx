import { Link, useParams } from "react-router-dom";
import "./HrEmployeeDetails.css";

export default function HrEmployeeDetails() {
  const { id } = useParams();

  const employee = {
    id,
    name: "Adam Taylor",
    role: "Software Engineer",
    department: "Engineering",
    email: "adam.taylor@company.com",
    phone: "+216 55 123 456",
    empCode: "EMP-00701",
    globalScore: 78.4,
    scoreDelta: 2.1,
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",

    about:
      "Experienced software engineer leading backend projects. Passionate about machine learning and scalable architecture.",
    skillTags: ["Python", "Java", "Leadership", "Databases", "REST APIs", "Machine Learning", "Architecture"],
    knowledge: [
      { name: "Python", level: "Expert", pct: 88 },
      { name: "Java", level: "Expert", pct: 82 },
      { name: "Database Design", level: "High", pct: 70 },
      { name: "Software Architecture", level: "Medium", pct: 55 },
    ],
    knowHow: [
      { name: "Machine Learning", level: "Expert", pct: 85 },
      { name: "REST APIs", level: "High", pct: 72 },
      { name: "Unit Testing", level: "Medium", pct: 55 },
    ],
    softSkills: [
      { name: "Leadership", level: "Expert", pct: 90 },
      { name: "Problem Solving", level: "High", pct: 75 },
      { name: "Communication", level: "Medium", pct: 58 },
    ],
    participation: [
      { title: "Advanced Java Workshop", date: "Apr 10, 2024", gain: "+21.6" },
      { title: "Complete Employee Records", date: "Mar 28, 2024", gain: "+21.6" },
      { title: "Project Alpha", date: "Mar 15, 2024", gain: "+22.2" },
    ],
  };

  return (
    <div className="hr-page">
      <div className="hr-topbar">
        <Link to="/hr/employees" className="hr-back">
          Back to Employees
        </Link>

        <div className="hr-actions">
          <button className="btn btn-ghost">Message</button>
          <button className="btn btn-primary">Invite to Activity</button>
        </div>
      </div>

      <div className="hr-grid">
        {/* LEFT */}
        <div className="hr-left">
          <div className="card header-card">
            <div className="header-row">
<img
  src={employee.avatar}
  alt={employee.name}
  className="avatar"
/>              <div className="header-main">
                <div className="header-title">{employee.name}</div>
                <div className="header-sub">
                  {employee.role} • {employee.department}
                </div>

                <div className="meta-row">
                  <span className="meta">{employee.email}</span>
                  <span className="dot">•</span>
                  <span className="meta">{employee.phone}</span>
                  <span className="dot">•</span>
                  <span className="meta">{employee.empCode}</span>
                </div>
              </div>

              <div className="score-box">
                <div className="score-value">{employee.globalScore.toFixed(1)}</div>
                <div className="score-sub">
                  Dynamic score <span className="score-up">↑ {employee.scoreDelta}</span>
                </div>
              </div>
            </div>

            <div className="tabs">
              <button className="tab active">Skills</button>
              <button className="tab">Overview</button>
              <button className="tab">Activity History</button>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Knowledge</div>
              <button className="btn btn-small btn-ghost">+ Add Skill</button>
            </div>

            <div className="bar-list">
              {employee.knowledge.map((s) => (
                <div key={s.name} className="bar-item">
                  <div className="bar-label">
                    <span className="bar-name">{s.name}</span>
                    <span className={`badge badge-${s.level.toLowerCase()}`}>{s.level}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="two-cols">
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Know-How</div>
                <button className="btn btn-small btn-ghost">Edit</button>
              </div>

              <div className="bar-list">
                {employee.knowHow.map((s) => (
                  <div key={s.name} className="bar-item">
                    <div className="bar-label">
                      <span className="bar-name">{s.name}</span>
                      <span className={`badge badge-${s.level.toLowerCase()}`}>{s.level}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Soft Skills</div>
                <button className="btn btn-small btn-ghost">Edit</button>
              </div>

              <div className="bar-list">
                {employee.softSkills.map((s) => (
                  <div key={s.name} className="bar-item">
                    <div className="bar-label">
                      <span className="bar-name">{s.name}</span>
                      <span className={`badge badge-${s.level.toLowerCase()}`}>{s.level}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="hr-right">
          <div className="card section-card">
            <div className="section-title">About</div>
            <p className="muted">{employee.about}</p>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Skills</div>
              <button className="btn btn-small btn-ghost">+ Add Skill</button>
            </div>
            <div className="tags">
              {employee.skillTags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="card section-card">
            <div className="section-title">Participation History</div>
            <div className="history">
              {employee.participation.map((p) => (
                <div key={p.title} className="history-item">
                  <div>
                    <div className="history-title">{p.title}</div>
                    <div className="history-date">{p.date}</div>
                  </div>
                  <div className="history-gain">{p.gain}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card section-card">
            <div className="section-title">Quick Actions</div>
            <div className="stack">
              <button className="btn btn-primary w-full">Generate Recommendations</button>
              <button className="btn btn-ghost w-full">View Activity History</button>
              <button className="btn btn-ghost w-full">Export Report</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}