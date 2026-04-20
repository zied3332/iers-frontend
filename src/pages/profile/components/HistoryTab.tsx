import React from "react";

type WorkItem = {
  id: number;
  period: string;
  role: string;
  company: string;
  description: string;
};

const workHistory: WorkItem[] = [
  {
    id: 1,
    period: "2025 - Present",
    role: "HR Manager",
    company: "IntelliHR Workspace",
    description:
      "Leading HR operations, supervising employee activities, following skill progression, and supporting workforce recommendations across departments.",
  },
  {
    id: 2,
    period: "2023 - 2025",
    role: "HR Coordinator",
    company: "Nova Business Services",
    description:
      "Managed training sessions, handled employee records, coordinated internal evaluations, and supported hiring and onboarding workflows.",
  },
  {
    id: 3,
    period: "2021 - 2023",
    role: "Recruitment & Admin Assistant",
    company: "Tunis Enterprise Group",
    description:
      "Assisted with candidate screening, interview scheduling, employee documentation, and day-to-day HR administrative tasks.",
  },
];

export default function HistoryTab() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
            color: "var(--text)",
          }}
        >
          Work history
        </h2>

        <div
          style={{
            color: "#0f766e",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          Career timeline
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
          borderRadius: 28,
          padding: 30,
          boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gap: 36,
            paddingLeft: 34,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(148,163,184,0.25)",
            }}
          />

          {workHistory.map((item) => (
            <div
              key={item.id}
              style={{
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -34,
                  top: 8,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#0f8b8d",
                  boxShadow: "0 0 0 8px rgba(15,139,141,0.10)",
                }}
              />

              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                  borderRadius: 24,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f766e",
                    marginBottom: 8,
                  }}
                >
                  {item.period}
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  {item.role}
                </div>

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#475569",
                    marginBottom: 16,
                  }}
                >
                  {item.company}
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "var(--text)",
                    fontSize: 17,
                    lineHeight: 1.8,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}