import React, { useMemo } from "react";
import type { ExperienceSegmentInput } from "../../../utils/experienceSegments";
import type { SkillOption } from "../../../components/ExperienceSegmentsEditor";

type Props = {
  jobTitle: string;
  segments: ExperienceSegmentInput[];
  skills: SkillOption[];
};

function formatPeriod(seg: ExperienceSegmentInput): string {
  const cy = new Date().getFullYear();
  const end = Number(seg.toYear) >= cy ? "Present" : String(seg.toYear);
  return `${seg.fromYear} – ${end}`;
}

export default function HistoryTab({ jobTitle, segments, skills }: Props) {
  const skillNameById = useMemo(() => {
    const m = new Map<string, string>();
    skills.forEach((s) => m.set(String(s._id), String(s.name || "")));
    return m;
  }, [skills]);

  const sortedSegments = useMemo(
    () =>
      [...segments].sort((a, b) => b.toYear - a.toYear || b.fromYear - a.fromYear),
    [segments],
  );

  const hasHistory = sortedSegments.length > 0;
  const roleLine = jobTitle.trim() || "—";

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

      {!hasHistory ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
            borderRadius: 28,
            padding: "36px 28px",
            boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
            textAlign: "center",
            color: "var(--muted)",
            fontWeight: 700,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          No work history for now. When you or HR add experience segments in your profile,
          they will appear here.
        </div>
      ) : (
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

            {sortedSegments.map((item, idx) => {
              const skillNames = item.skillIds
                .map((id) => skillNameById.get(id) || id)
                .filter(Boolean);
              const skillsText = skillNames.length ? skillNames.join(", ") : "—";
              const companyLine = item.company?.trim();

              return (
                <div
                  key={`${item.fromYear}-${item.toYear}-${idx}`}
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
                      {formatPeriod(item)}
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: "var(--text)",
                        marginBottom: 8,
                      }}
                    >
                      {roleLine}
                    </div>

                    {companyLine ? (
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#475569",
                          marginBottom: 16,
                        }}
                      >
                        {companyLine}
                      </div>
                    ) : (
                      <div style={{ height: 4 }} />
                    )}

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 8,
                      }}
                    >
                      Skills
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text)",
                        fontSize: 17,
                        lineHeight: 1.8,
                      }}
                    >
                      {skillsText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
