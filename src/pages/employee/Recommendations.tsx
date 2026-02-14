export default function Recommendations() {
  const recs = [
    {
      title: "React Architecture (Hooks + Patterns)",
      reason: "Boosts your Frontend skill gap",
      match: 91,
      level: "HIGH",
      seats: 6,
    },
    {
      title: "Cloud Basics for Developers",
      reason: "Improves Cloud coverage for your team",
      match: 84,
      level: "MEDIUM",
      seats: 12,
    },
    {
      title: "Communication & Collaboration",
      reason: "Supports soft-skill progression",
      match: 78,
      level: "LOW",
      seats: 20,
    },
  ];

  const levelBadge = (lvl: string) => {
    if (lvl === "HIGH") return "badge badge-high";
    if (lvl === "MEDIUM") return "badge badge-medium";
    return "badge badge-low";
  };

  return (
    <div className="hr-page">
      <div className="card header-card">
        <div className="section-head">
          <div>
            <div className="header-title">Recommendations</div>
            <div className="header-sub">Suggested activities based on your skills and progress.</div>
          </div>

          <div className="hr-actions">
            <button className="btn btn-ghost">Refresh</button>
            <button className="btn btn-primary">Generate</button>
          </div>
        </div>

        <div className="meta-row">
          <span className="meta">Last generated: 2026-02-12</span>
          <span className="dot">•</span>
          <span className="meta">Model: v1 (mock)</span>
        </div>
      </div>

      <div className="hr-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div className="card section-card">
          <div className="section-head">
            <div className="section-title">Top matches</div>
            <span className="badge">3 items</span>
          </div>

          <div className="history">
            {recs.map((r, idx) => (
              <div className="history-item" key={idx} style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="history-title">{r.title}</div>
                  <div className="history-date">{r.reason}</div>

                  <div className="meta-row">
                    <span className={levelBadge(r.level)}>{r.level}</span>
                    <span className="badge">Seats: {r.seats}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <div className="score-value" style={{ fontSize: 22 }}>
                    {r.match}%
                  </div>
                  <div className="score-sub">match score</div>
                  <button className="btn btn-small btn-primary">Apply</button>
                  <button className="btn btn-small btn-ghost">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Why these?</div>
            </div>
            <p className="muted">
              Recommendations are based on your skill levels, activity history, and team context.
              Right now this is mock data — later it will come from the AI scoring endpoint.
            </p>

            <div className="tags">
              <span className="tag">Skill match</span>
              <span className="tag">Progress boost</span>
              <span className="tag">Team gaps</span>
              <span className="tag">Priority</span>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Next step</div>
            </div>
            <div className="stack">
              <button className="btn w-full">Open my profile</button>
              <button className="btn w-full btn-primary">See my activities</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}