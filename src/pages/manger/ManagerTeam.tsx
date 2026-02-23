import React from "react";
import "../../index.css";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  score: number;
  status: "Active" | "On Leave";
};

const members: TeamMember[] = [
  { id: "EMP-001", name: "Adam Taylor", role: "Backend Developer", email: "adam@company.com", score: 78, status: "Active" },
  { id: "EMP-002", name: "Sara Ben Ali", role: "Data Analyst", email: "sara@company.com", score: 84, status: "Active" },
  { id: "EMP-003", name: "Youssef Trabelsi", role: "DevOps Engineer", email: "youssef@company.com", score: 71, status: "On Leave" },
  { id: "EMP-004", name: "Lina Khelifi", role: "Frontend Developer", email: "lina@company.com", score: 76, status: "Active" },
];

function statusBadge(status: TeamMember["status"]) {
  if (status === "Active") return "badge-high";
  return "badge-medium";
}

export default function ManagerTeam() {
  return (
    <div className="container">
      <div className="card section-card">
        <div className="section-head">
          <div>
            <div className="section-title">My Team</div>
            <div className="muted">Manage your team members and view quick performance indicators.</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" placeholder="Search name, role, email…" />
            <select className="select">
              <option>All</option>
              <option>Active</option>
              <option>On Leave</option>
            </select>
            <button className="btn btn-primary">Add Member</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Score</th>
              <th style={{ width: 220 }} />
            </tr>
          </thead>

          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 900 }}>
                  {m.name}
                  <div className="muted" style={{ margin: 0 }}>
                    {m.id}
                  </div>
                </td>

                <td>{m.role}</td>
                <td>{m.email}</td>

                <td>
                  <span className={`badge ${statusBadge(m.status)}`}>{m.status}</span>
                </td>

                <td style={{ textAlign: "right", fontWeight: 900, color: "var(--primary)" }}>{m.score}</td>

                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button className="btn btn-small">View</button>
                    <button className="btn btn-small btn-ghost">Message</button>
                    <button className="btn btn-small btn-ghost">Recommend</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}