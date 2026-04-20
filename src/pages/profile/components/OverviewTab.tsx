import React from "react";

type UserLike = {
  email: string;
  telephone?: string;
  matricule?: string;
  date_embauche?: string;
};

export default function OverviewTab({
  user,
  departmentName,
  roleLabel,
}: {
  user: UserLike;
  departmentName?: string;
  roleLabel: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.9fr 0.7fr",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: 20 }}>
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.9,
              color: "var(--text)",
            }}
          >
            This page provides a complete overview of your profile in the internal HR platform,
            including account status, role, department, personal information, profile settings,
            session actions, and quick access to your workspace tools.
          </p>

          <button
            type="button"
            style={{
              marginTop: 20,
              border: "none",
              background: "transparent",
              color: "#0f766e",
              fontWeight: 800,
              fontSize: 16,
              padding: 0,
              cursor: "pointer",
            }}
          >
            Show more
          </button>
        </section>

        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: 22, color: "var(--text)" }}>
            Personal information
          </h2>

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            {[
              ["Email", user.email || "—"],
              ["Phone", user.telephone || "—"],
              ["Department", departmentName || "—"],
              ["Role", roleLabel || "—"],
              [
                "Hire date",
                user.date_embauche
                  ? new Date(user.date_embauche).toLocaleDateString()
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "20px 0",
                  borderBottom: "1px solid rgba(148,163,184,0.16)",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: 16,
                    fontWeight: 800,
                    textAlign: "right",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 22, color: "var(--text)" }}>
            Community statistics
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div
              style={{
                border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 900, color: "var(--text)" }}>1,350</div>
              <div style={{ color: "#64748b", fontWeight: 700 }}>Total mentoring mins</div>
            </div>

            <div
              style={{
                border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 900, color: "var(--text)" }}>34</div>
              <div style={{ color: "#64748b", fontWeight: 700 }}>Sessions completed</div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
            borderRadius: 24,
            padding: 28,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 22, color: "var(--text)" }}>
            Role summary
          </h3>

          <ul
            style={{
              margin: 0,
              paddingLeft: 22,
              color: "var(--text)",
              lineHeight: 1.9,
              fontSize: 17,
            }}
          >
            <li>Manage activities and review applications</li>
            <li>Monitor skill dashboards and recommendations</li>
            <li>Track training impact and workforce progress</li>
          </ul>
        </section>
      </div>
    </div>
  );
}