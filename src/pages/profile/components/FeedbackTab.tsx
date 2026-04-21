import React from "react";

type FeedbackItem = {
  id: number;
  activity: string;
  manager: string;
  date: string;
  rating: "Excellent" | "Very Good" | "Good";
  text: string;
};

const feedbackItems: FeedbackItem[] = [
  {
    id: 1,
    activity: "Leadership Workshop",
    manager: "Sarah Ben Ali",
    date: "12 Apr 2026",
    rating: "Excellent",
    text:
      "Zied showed strong participation during the workshop, communicated clearly with the team, and demonstrated good leadership potential during the case-study session.",
  },
  {
    id: 2,
    activity: "Employee Analytics Training",
    manager: "Mohamed Rahal",
    date: "02 Mar 2026",
    rating: "Very Good",
    text:
      "He completed all assigned tasks successfully and understood the reporting workflow well. More confidence during presentation would make the result even stronger.",
  },
  {
    id: 3,
    activity: "Internal Recruitment Process Review",
    manager: "Amal Trabelsi",
    date: "18 Jan 2026",
    rating: "Good",
    text:
      "Good collaboration and follow-up across the recruitment steps. Needs to improve response time on documentation updates during busy periods.",
  },
];

function getRatingStyles(rating: FeedbackItem["rating"]): React.CSSProperties {
  if (rating === "Excellent") {
    return {
      background: "var(--primary-weak)",
      color: "var(--primary-soft-text)",
      border: "1px solid var(--primary-border)",
    };
  }

  if (rating === "Very Good") {
    return {
      background: "rgba(59,130,246,0.10)",
      color: "#2563eb",
      border: "1px solid rgba(59,130,246,0.25)",
    };
  }

  return {
    background: "rgba(249,115,22,0.10)",
    color: "#c2410c",
    border: "1px solid rgba(249,115,22,0.25)",
  };
}

export default function FeedbackTab() {
  const totalReviews = feedbackItems.length;
  const positiveHighlights = feedbackItems.filter(
    (item) => item.rating === "Excellent" || item.rating === "Very Good"
  ).length;
  const improvementNotes = feedbackItems.filter((item) => item.rating === "Good").length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.9fr 0.8fr",
        gap: 20,
        alignItems: "start",
      }}
    >
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
            Performance feedback
          </h2>

          <div
            style={{
              color: "#0f766e",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            Latest reviews
          </div>
        </div>

        {feedbackItems.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--surface)",
              border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 10,
                  }}
                >
                  Activity
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--text)",
                    marginBottom: 12,
                  }}
                >
                  {item.activity}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    color: "#64748b",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  <span>Manager: {item.manager}</span>
                  <span>{item.date}</span>
                </div>
              </div>

              <span
                style={{
                  ...getRatingStyles(item.rating),
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontWeight: 800,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                }}
              >
                {item.rating}
              </span>
            </div>

            <p
              style={{
                margin: 0,
                color: "var(--text)",
                fontSize: 17,
                lineHeight: 1.8,
              }}
            >
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
            position: "sticky",
            top: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 24px",
              fontSize: 22,
              fontWeight: 900,
              color: "var(--text)",
            }}
          >
            Feedback summary
          </h3>

          <div
            style={{
              display: "grid",
              gap: 22,
            }}
          >
            <div
              style={{
                paddingBottom: 18,
                borderBottom: "1px solid rgba(148,163,184,0.16)",
              }}
            >
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  color: "var(--text)",
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {totalReviews}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Total reviews
              </div>
            </div>

            <div
              style={{
                paddingBottom: 18,
                borderBottom: "1px solid rgba(148,163,184,0.16)",
              }}
            >
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  color: "var(--text)",
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {positiveHighlights}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Positive highlights
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  color: "var(--text)",
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {improvementNotes}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Improvement note
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}