export default function MyActivities() {
  const upcoming = [
    { title: "Advanced React Workshop", date: "2026-03-02", status: "UPCOMING", type: "Training" },
    { title: "Soft Skills: Communication", date: "2026-03-08", status: "PENDING", type: "Workshop" },
  ];

  const ongoing = [
    { title: "Cloud Fundamentals (Internal)", date: "2026-02-20", status: "IN_PROGRESS", type: "Course" },
  ];

  const completed = [
    { title: "Git & Clean Commits", date: "2026-01-18", status: "COMPLETED", type: "Training" },
    { title: "SQL Performance Basics", date: "2025-12-22", status: "COMPLETED", type: "Course" },
  ];

  const badgeClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "badge badge-high";
      case "IN_PROGRESS":
        return "badge badge-medium";
      case "UPCOMING":
        return "badge badge-expert";
      case "PENDING":
      default:
        return "badge";
    }
  };

  const Section = ({ title, items }: { title: string; items: typeof upcoming }) => (
    <div className="card section-card">
      <div className="section-head">
        <div className="section-title">{title}</div>
        <button className="btn btn-small btn-ghost">View all</button>
      </div>

      {items.length === 0 ? (
        <p className="muted">No items yet.</p>
      ) : (
        <div className="history">
          {items.map((a, idx) => (
            <div className="history-item" key={idx}>
              <div>
                <div className="history-title">{a.title}</div>
                <div className="history-date">
                  {a.type} • {a.date}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={badgeClass(a.status)}>{a.status.replace("_", " ")}</span>
                <button className="btn btn-small btn-primary">Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="hr-page">
      <div className="card header-card">
        <div className="section-head">
          <div>
            <div className="header-title">My Activities</div>
            <div className="header-sub">Track trainings, workshops, and participation status.</div>
          </div>
          <div className="hr-actions">
            <button className="btn btn-ghost">Export</button>
            <button className="btn btn-primary">Browse activities</button>
          </div>
        </div>
      </div>

      <div className="hr-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div>
          <Section title="Upcoming & Pending" items={[...upcoming]} />
          <Section title="Ongoing" items={[...ongoing]} />
          <Section title="Completed" items={[...completed]} />
        </div>

        <div className="hr-right">
          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">This month</div>
              <span className="badge">Feb 2026</span>
            </div>
            <div className="stack">
              <div className="history-item">
                <div>
                  <div className="history-title">Attendance</div>
                  <div className="history-date">2 sessions</div>
                </div>
                <div className="history-gain">+6 pts</div>
              </div>
              <div className="history-item">
                <div>
                  <div className="history-title">In progress</div>
                  <div className="history-date">1 course</div>
                </div>
                <div className="history-gain">On track</div>
              </div>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div className="section-title">Quick actions</div>
            </div>
            <div className="stack">
              <button className="btn w-full">Request new training</button>
              <button className="btn w-full btn-primary">See recommendations</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}