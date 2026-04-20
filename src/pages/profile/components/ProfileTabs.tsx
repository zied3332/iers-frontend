import React from "react";

export type ProfileTabKey = "overview" | "feedback" | "history";

export default function ProfileTabs({
  activeTab,
  onChange,
  feedbackCount = 0,
}: {
  activeTab: ProfileTabKey;
  onChange: (tab: ProfileTabKey) => void;
  feedbackCount?: number;
}) {
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "18px 22px",
    border: "none",
    borderTop: isActive ? "2px solid #0f766e" : "2px solid transparent",
    borderRight: "1px solid color-mix(in srgb, var(--border) 45%, transparent)",
    background: isActive ? "rgba(15,118,110,0.06)" : "transparent",
    color: isActive ? "#0f766e" : "var(--text)",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
        borderTop: "none",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflowX: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          style={tabStyle(activeTab === "overview")}
          onClick={() => onChange("overview")}
        >
          Overview
        </button>

        <button
          type="button"
          style={tabStyle(activeTab === "feedback")}
          onClick={() => onChange("feedback")}
        >
          Performance Feedback
          <span
            style={{
              minWidth: 26,
              height: 26,
              borderRadius: 999,
              background: "#334155",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              padding: "0 8px",
            }}
          >
            {feedbackCount}
          </span>
        </button>

        <button
          type="button"
          style={tabStyle(activeTab === "history")}
          onClick={() => onChange("history")}
        >
          Work history
        </button>
      </div>
    </div>
  );
}