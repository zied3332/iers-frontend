import React, { useMemo, useState } from "react";

type Activity = {
  id: string;
  title: string;
  department: string;
  seats: number;
  createdAt: string;
};

type TopEmployee = {
  id: string;
  name: string;
  role: string;
  score: number;
  skillMatch: number;
  contextBoost: number;
};

export default function ActivityResults() {
  const activities: Activity[] = useMemo(
    () => [
      { id: "A1", title: "Advanced React Training", department: "IT", seats: 5, createdAt: "2026-02-10" },
      { id: "A2", title: "Cloud Architecture Bootcamp", department: "Engineering", seats: 8, createdAt: "2026-02-08" },
      { id: "A3", title: "Leadership & Communication", department: "HR", seats: 12, createdAt: "2026-02-06" },
    ],
    []
  );

  // Fake results per activity
  const resultsMap: Record<string, TopEmployee[]> = useMemo(
    () => ({
      A1: [
        { id: "E1", name: "John Doe", role: "Lead Software Engineer", score: 92, skillMatch: 88, contextBoost: 4 },
        { id: "E2", name: "Sarah Anderson", role: "Frontend Developer", score: 89, skillMatch: 86, contextBoost: 3 },
        { id: "E3", name: "Mark Smith", role: "Fullstack Engineer", score: 87, skillMatch: 84, contextBoost: 2 },
        { id: "E4", name: "Alice Smith", role: "Backend Developer", score: 85, skillMatch: 80, contextBoost: 5 },
        { id: "E5", name: "Nour Ben Ali", role: "Software Engineer", score: 83, skillMatch: 79, contextBoost: 1 },
      ],
      A2: [
        { id: "E6", name: "Omar Trabelsi", role: "DevOps Engineer", score: 93, skillMatch: 90, contextBoost: 3 },
        { id: "E7", name: "Yahya Khemiri", role: "Cloud Engineer", score: 90, skillMatch: 88, contextBoost: 2 },
        { id: "E8", name: "Amira Jebali", role: "Backend Engineer", score: 86, skillMatch: 82, contextBoost: 4 },
        { id: "E9", name: "Rami Gharbi", role: "SRE", score: 84, skillMatch: 80, contextBoost: 1 },
        { id: "E10", name: "Khalil Hajji", role: "System Engineer", score: 82, skillMatch: 78, contextBoost: 2 },
      ],
      A3: [
        { id: "E11", name: "Ines M.", role: "HR Specialist", score: 91, skillMatch: 89, contextBoost: 2 },
        { id: "E12", name: "Hedi S.", role: "Team Lead", score: 88, skillMatch: 84, contextBoost: 4 },
        { id: "E13", name: "Sana A.", role: "Project Manager", score: 86, skillMatch: 82, contextBoost: 3 },
        { id: "E14", name: "Mehdi K.", role: "Scrum Master", score: 83, skillMatch: 80, contextBoost: 1 },
        { id: "E15", name: "Farah B.", role: "Business Analyst", score: 81, skillMatch: 77, contextBoost: 2 },
      ],
    }),
    []
  );

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);

  const top5 = selected ? resultsMap[selected.id] ?? [] : [];

  const openModal = (a: Activity) => {
    setSelected(a);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelected(null);
  };

  return (
    <div>
      <div className="header-title">Activity Results</div>
      <div className="header-sub">Open an activity to see the top 5 recommended employees.</div>

      <div className="card section-card" style={{ marginTop: 14 }}>
        <div className="stack">
          {activities.map((a) => (
            <div key={a.id} className="history-item">
              <div style={{ display: "grid", gap: 4 }}>
                <div className="history-title">{a.title}</div>
                <div className="muted">
                  {a.department} <span className="dot">•</span> Seats: {a.seats} <span className="dot">•</span>{" "}
                  Created: {a.createdAt}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-small btn-primary" onClick={() => openModal(a)}>
                  View Results
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: "min(920px, 96vw)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 14, borderBottom: "1px solid #eef2f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Top 5 Recommendations</div>
                <div className="muted" style={{ marginTop: 2 }}>
                  {selected?.title} — {selected?.department}
                </div>
              </div>
              <button className="btn btn-small btn-ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {top5.map((e) => (
                  <div key={e.id} className="history-item">
                    <div style={{ display: "grid", gap: 4 }}>
                      <div className="history-title">{e.name}</div>
                      <div className="muted">{e.role}</div>
                      <div className="muted">
                        Skill match: <b>{e.skillMatch}%</b> <span className="dot">•</span> Context boost:{" "}
                        <b>{e.contextBoost}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="score-value">{e.score}%</div>
                      <div className="muted" style={{ marginTop: 2 }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn btn-ghost">Export</button>
                <button className="btn btn-primary">Approve Top 5</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}