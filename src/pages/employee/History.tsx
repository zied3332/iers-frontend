export default function History() {
  const items = [
    { title: "Completed: Git & Clean Commits", date: "2026-01-18", gain: "+3 pts" },
    { title: "Skill update: React → HIGH", date: "2026-01-20", gain: "+5 pts" },
    { title: "Completed: SQL Performance Basics", date: "2025-12-22", gain: "+4 pts" },
    { title: "Joined: Cloud Fundamentals", date: "2026-02-20", gain: "In progress" },
  ];

  return (
    <div className="hr-page">
      <div className="card header-card">
        <div className="section-head">
          <div>
            <div className="header-title">History</div>
            <div className="header-sub">Your activity and skill timeline (audit-friendly).</div>
          </div>

          <div className="hr-actions">
            <button className="btn btn-ghost">Filter</button>
            <button className="btn btn-primary">Export</button>
          </div>
        </div>
      </div>

      <div className="hr-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div className="card section-card">
          <div className="section-head">
            <div className="section-title">Recent</div>
            <span className="badge">{items.length} events</span>
          </div>

          <div className="history">
            {items.map((h, idx) => (
              <div className="history-item" key={idx}>
                <div>
                  <div className="history-title">{h.title}</div>
                  <div className="history-date">{h.date}</div>
                </div>
                <div className="history-gain">{h.gain}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Summary</div>
            </div>

            <div className="stack">
              <div className="history-item">
                <div>
                  <div className="history-title">Completed</div>
                  <div className="history-date">2 activities</div>
                </div>
                <div className="history-gain">+7 pts</div>
              </div>

              <div className="history-item">
                <div>
                  <div className="history-title">Skill updates</div>
                  <div className="history-date">1 change</div>
                </div>
                <div className="history-gain">+5 pts</div>
              </div>

              <div className="history-item">
                <div>
                  <div className="history-title">Current</div>
                  <div className="history-date">1 ongoing</div>
                </div>
                <div className="history-gain">On track</div>
              </div>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Notes</div>
            </div>
            <p className="muted">
              Later, this page can include “decision history” (why you were recommended), and
              “justifications” for transparency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}