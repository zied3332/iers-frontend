import React from "react";

export type FeedbackItem = {
  id: string;
  activity: string;
  manager: string;
  date: string;
  rating: "Excellent" | "Very Good" | "Good" | "Not Rated";
  text: string;
};

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

type FeedbackTabProps = {
  items: FeedbackItem[];
  loading?: boolean;
  error?: string;
};

export default function FeedbackTab({ items, loading = false, error = "" }: FeedbackTabProps) {
  const feedbackItems = items;
  const totalReviews = feedbackItems.length;
  const positiveHighlights = feedbackItems.filter(
    (item) => item.rating === "Excellent" || item.rating === "Very Good"
  ).length;
  const improvementNotes = feedbackItems.filter(
    (item) => item.rating === "Good" || item.rating === "Not Rated"
  ).length;

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

        {loading ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            Loading feedback...
          </div>
        ) : error ? (
          <div
            style={{
              background: "color-mix(in srgb, var(--surface) 90%, #ef4444)",
              border: "1px solid color-mix(in srgb, var(--border) 66%, #ef4444)",
              borderRadius: 24,
              padding: 20,
              color: "var(--text)",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : feedbackItems.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: 24,
              padding: 28,
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            No feedback available yet.
          </div>
        ) : feedbackItems.map((item) => (
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