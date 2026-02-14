import { useState } from "react";
import { Link } from "react-router-dom";

type Rec = {
  employeeId: string;
  employeeName: string;
  department: string;
  activity: string;
  score: number; // 0-100
  skillMatch: number;
  experienceScore: number;
  contextBoost: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

const initialData: Rec[] = [
  {
    employeeId: "E-102",
    employeeName: "John Doe",
    department: "IT",
    activity: "Advanced React Training",
    score: 92,
    skillMatch: 88,
    experienceScore: 90,
    contextBoost: 5,
    status: "PENDING",
  },
  {
    employeeId: "E-203",
    employeeName: "Sarah Anderson",
    department: "Engineering",
    activity: "Cloud Architecture Bootcamp",
    score: 86,
    skillMatch: 81,
    experienceScore: 84,
    contextBoost: 4,
    status: "PENDING",
  },
  {
    employeeId: "E-311",
    employeeName: "Mark Smith",
    department: "Marketing",
    activity: "Data Storytelling Workshop",
    score: 79,
    skillMatch: 74,
    experienceScore: 78,
    contextBoost: 3,
    status: "PENDING",
  },
];

function badgeClass(status: Rec["status"]) {
  if (status === "APPROVED") return "badge badge-high";
  if (status === "REJECTED") return "badge badge-low";
  return "badge";
}

export default function HrRecommendations() {
  const [rows, setRows] = useState<Rec[]>(initialData);
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) => {
    const text = `${r.employeeName} ${r.department} ${r.activity}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });

  const updateStatus = (employeeId: string, status: Rec["status"]) => {
    setRows((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, status } : r))
    );
  };

  return (
    <div className="hr-page">
      <div className="hr-topbar">
        <div>
          <div className="header-title">Recommendations</div>
          <div className="header-sub">
            AI suggestions — approve/reject before sending invitations.
          </div>
        </div>

        <div className="hr-actions">
          <input
            className="btn"
            style={{ width: 280, textAlign: "left" }}
            placeholder="Search employee / activity..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
<Link className="btn btn-primary" to="/hr/recommendations/generate">
  Generate
</Link>        </div>
      </div>

      <div className="card section-card">
        <div className="section-head">
          <div className="section-title">Latest Generated</div>
          <Link className="hr-back" to="/hr/dashboard">
            Back to HR Dashboard
          </Link>
        </div>

        <div className="stack">
          {filtered.map((r) => (
            <div key={r.employeeId} className="history-item">
              <div style={{ display: "grid", gap: 4 }}>
                <div className="history-title">
                  {r.employeeName}{" "}
                  <span className="meta">
                    ({r.department}) • {r.employeeId}
                  </span>
                </div>
                <div className="history-date">
                  Recommended: <b>{r.activity}</b>
                </div>

                <div className="tags">
                  <span className="tag">Skill match: {r.skillMatch}%</span>
                  <span className="tag">Experience: {r.experienceScore}%</span>
                  <span className="tag">Context: +{r.contextBoost}</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, alignItems: "end" }}>
                <div style={{ textAlign: "right" }}>
                  <div className="score-value">{r.score}%</div>
                  <div className="score-sub">
                    Status: <span className={badgeClass(r.status)}>{r.status}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-small"
                    onClick={() => updateStatus(r.employeeId, "REJECTED")}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => updateStatus(r.employeeId, "APPROVED")}
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="muted">No recommendations match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}