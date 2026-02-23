import React, { useState } from "react";

type SkillBar = { name: string; level: "Expert" | "High" | "Medium"; value: number };
type HistoryItem = { title: string; date: string; gain: string };

const levelBadgeClass = (lvl: SkillBar["level"]) => {
  if (lvl === "Expert") return "badge badge-expert";
  if (lvl === "High") return "badge badge-high";
  return "badge badge-medium";
};

export default function EmployeeProfile() {
  const [tab, setTab] = useState<"Overview" | "Skills" | "Activity">("Skills");

  const knowledge: SkillBar[] = [
    { name: "Python", level: "Expert", value: 88 },
    { name: "Java", level: "Expert", value: 86 },
    { name: "Database Design", level: "High", value: 74 },
    { name: "Software Architecture", level: "Medium", value: 58 },
  ];

  const knowHow: SkillBar[] = [
    { name: "Machine Learning", level: "Expert", value: 84 },
    { name: "REST APIs", level: "High", value: 72 },
    { name: "Unit Testing", level: "Medium", value: 56 },
  ];

  const softSkills: SkillBar[] = [
    { name: "Leadership", level: "Expert", value: 82 },
    { name: "Problem Solving", level: "High", value: 70 },
    { name: "Communication", level: "Medium", value: 60 },
  ];

  const tagSkills = [
    "Python",
    "Java",
    "Leadership",
    "Databases",
    "REST APIs",
    "REST testing",
    "Machine Learning",
    "Architecture",
    "Communication",
    "Problem Solving",
    "Unit Testing",
  ];

  const participation: HistoryItem[] = [
    { title: "Advanced Java Workshop", date: "Apr 10, 2024", gain: "+21.6" },
    { title: "Complete Employee Records", date: "Mar 28, 2024", gain: "+21.6" },
    { title: "Project Alpha", date: "Mar 15, 2024", gain: "+22.2" },
  ];

  return (
    <div className="emp-profile">
      {/* HEADER CARD */}
      <div className="card emp-header">
        <div className="emp-head-left">
        <img
  className="emp-photo"
  src="https://randomuser.me/api/portraits/men/35.jpg"
  alt="John Doe"
/>
          <div>
            <div className="emp-name">John Doe</div>
            <div className="emp-role">Lead Software Engineer</div>

            <div className="emp-meta">
              <span className="meta">johndoe@example.com</span>
              <span className="dot">•</span>
              <span className="meta">+1 (555) 123-4567</span>
              <span className="dot">•</span>
              <span className="meta">Engineering</span>
              <span className="dot">•</span>
              <span className="meta">EMP-00701</span>
              <span className="dot">•</span>
              <span className="meta">Hired 2020</span>
            </div>

            <div className="emp-actions">
              <button className="btn btn-primary btn-small">Edit Profile</button>
              <button className="btn btn-small">Delete</button>
            </div>
          </div>
        </div>

        {/* SCORE PANEL (right) */}
        <div className="emp-score">
          <div className="emp-score-top">
            <div className="emp-score-value">78.4</div>
            <div className="emp-score-sub">
              Dynamic score <span className="score-up">↑ 2.1</span>
            </div>
          </div>

          <div className="emp-score-actions">
            <button className="btn btn-small">+ Add</button>
            <button className="btn btn-small">Profile</button>
          </div>

          <div className="emp-about">
            <div className="section-title">About</div>
            <p className="muted" style={{ marginTop: 6 }}>
              Experienced software engineer building backend projects. Passionate about machine learning and scalable
              architecture.
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="emp-tabs">
        <button className={`emp-tab ${tab === "Overview" ? "active" : ""}`} onClick={() => setTab("Overview")}>
          Overview
        </button>
        <button className={`emp-tab ${tab === "Skills" ? "active" : ""}`} onClick={() => setTab("Skills")}>
          Skills
        </button>
        <button className={`emp-tab ${tab === "Activity" ? "active" : ""}`} onClick={() => setTab("Activity")}>
          Activity History
        </button>
      </div>

      {/* MAIN GRID */}
      <div className="emp-grid">
        {/* LEFT - Skill blocks */}
        <div className="emp-left">
          {/* Knowledge + Know-How row */}
          <div className="emp-two">
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Knowledge</div>
                <button className="btn btn-small">+ Add Skill</button>
              </div>
              <div className="emp-skill-list">
                {knowledge.map((s) => (
                  <div key={s.name} className="emp-skill-row">
                    <div className="emp-skill-name">{s.name}</div>
                    <div className="emp-skill-bar">
                      <div className="emp-skill-fill" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className={levelBadgeClass(s.level)}>{s.level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Know-How</div>
                <button className="btn btn-small">Edit</button>
              </div>
              <div className="emp-skill-list">
                {knowHow.map((s) => (
                  <div key={s.name} className="emp-skill-row">
                    <div className="emp-skill-name">{s.name}</div>
                    <div className="emp-skill-bar">
                      <div className="emp-skill-fill" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className={levelBadgeClass(s.level)}>{s.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Soft skills row */}
          <div className="emp-two">
            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Soft Skills</div>
                <button className="btn btn-small">+ Add Skill</button>
              </div>

              <div className="emp-skill-list">
                {softSkills.slice(0, 2).map((s) => (
                  <div key={s.name} className="emp-skill-row">
                    <div className="emp-skill-name">{s.name}</div>
                    <div className="emp-skill-bar">
                      <div className="emp-skill-fill" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className={levelBadgeClass(s.level)}>{s.level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card section-card">
              <div className="section-head">
                <div className="section-title">Problem Solving</div>
                <button className="btn btn-small">Edit</button>
              </div>

              <div className="emp-skill-list">
                {softSkills.slice(1).map((s) => (
                  <div key={s.name} className="emp-skill-row">
                    <div className="emp-skill-name">{s.name}</div>
                    <div className="emp-skill-bar">
                      <div className="emp-skill-fill" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className={levelBadgeClass(s.level)}>{s.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="emp-right">
          {/* Skills tags */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Skills</div>
              <button className="btn btn-small">Add Skill</button>
            </div>
            <div className="tags">
              {tagSkills.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Participation history */}
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Participation History</div>
            </div>

            <div className="history">
              {participation.map((p) => (
                <div className="history-item" key={p.title}>
                  <div>
                    <div className="history-title">{p.title}</div>
                    <div className="history-date">{p.date}</div>
                  </div>
                  <div className="history-gain">{p.gain}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}