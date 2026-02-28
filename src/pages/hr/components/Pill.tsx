// src/pages/hr/users/components/Pill.tsx
import React from "react";

type Tone = "neutral" | "success" | "danger";

const PILL_TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  neutral: { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.20)", fg: "#334155" },
  success: { bg: "rgba(22,163,74,0.12)", bd: "rgba(22,163,74,0.20)", fg: "#166534" },
  danger: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#b91c1c" },
};

export function Pill({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  const map = PILL_TONES[tone];
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
      }}
    >
      {text}
    </span>
  );
}