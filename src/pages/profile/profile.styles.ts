// src/pages/profile.styles.ts
import type React from "react";

export type Tone = "neutral" | "success" | "danger";
export type BtnVariant = "primary" | "outline" | "danger";

/**
 * Small design tokens (consistent look)
 */
const TOKENS = {
  border: "1px solid rgba(148,163,184,0.22)",
  softBorder: "1px solid rgba(148,163,184,0.16)",
  bg: "#f6f8fb",
  cardBg: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  ring: "0 0 0 4px rgba(31,122,90,0.10)",
  shadow: "0 18px 50px rgba(2, 6, 23, 0.06)",
  shadow2: "0 2px 10px rgba(2, 6, 23, 0.06)",
  radius: 18,
};

export const PILL_TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  neutral: { bg: "rgba(100,116,139,0.10)", bd: "rgba(100,116,139,0.18)", fg: "#334155" },
  success: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.20)", fg: "#065f46" },
  danger: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.18)", fg: "#991b1b" },
};

const BTN_BASE: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  fontWeight: 850,
  cursor: "pointer",
  border: TOKENS.softBorder,
  background: "#fff",
  color: TOKENS.text,
  textDecoration: "none",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease",
};

export const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  outline: BTN_BASE,
  primary: {
    ...BTN_BASE,
    border: "1px solid rgba(31,122,90,0.22)",
    background: "rgba(31,122,90,0.10)",
    color: "#145a41",
  },
  danger: {
    ...BTN_BASE,
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#991b1b",
  },
};

export const S: Record<string, React.CSSProperties> = {
  page: {
    padding: 18,
    maxWidth: 1120,
    margin: "0 auto",
    background: TOKENS.bg,
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 6,
  },
  headerRight: { display: "flex", gap: 10, flexWrap: "wrap" },

  h1: { fontSize: 26, fontWeight: 950, color: TOKENS.text, letterSpacing: -0.4 },
  hSubtitle: { color: TOKENS.muted, marginTop: 6, fontSize: 13, lineHeight: 1.5 },

  topBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: TOKENS.softBorder,
    background: "#fff",
    textDecoration: "none",
    color: TOKENS.text,
    fontWeight: 850,
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.65fr",
    gap: 14,
    marginTop: 10,
    alignItems: "start",
  },

  col: {
    display: "grid",
    gap: 14,
    gridAutoRows: "max-content",
    alignContent: "start",
  },

  card: {
    background: TOKENS.cardBg,
    border: TOKENS.border,
    borderRadius: TOKENS.radius,
    padding: 16,
    boxShadow: TOKENS.shadow2,
    height: "fit-content",
    alignSelf: "start",
  },

  cardHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: 950, color: TOKENS.text, letterSpacing: -0.2 },
  cardSubtitle: { marginTop: 4, fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.4 },
  cardBody: { marginTop: 12 },

  pillsRow: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },

  identityRow: { display: "flex", alignItems: "center", gap: 14 },
  identityMain: { flex: 1, minWidth: 0 },

  name: { fontSize: 18, fontWeight: 950, color: TOKENS.text, letterSpacing: -0.25 },
  miniTagsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },

  miniTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 999,
    border: TOKENS.softBorder,
    background: "rgba(248,250,252,0.9)",
    fontSize: 12,
    fontWeight: 800,
    color: TOKENS.text,
    cursor: "pointer",
    maxWidth: "100%",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  },

  helperText: { color: TOKENS.muted, marginTop: 10, fontSize: 13, lineHeight: 1.65 },

  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 0",
    borderTop: "1px solid rgba(148,163,184,0.16)",
  },

  fieldLabel: { color: TOKENS.muted, fontSize: 12.5, fontWeight: 750 },

  fieldValue: {
    color: TOKENS.text,
    fontSize: 13,
    fontWeight: 850,
    textAlign: "right",
  },

  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 12,
    color: TOKENS.text,
    fontWeight: 750,
  },

  list: { margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13, lineHeight: 1.75 },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    color: TOKENS.text,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "radial-gradient(circle at 30% 30%, rgba(31,122,90,0.18), rgba(148,163,184,0.10))",
    boxShadow: "0 10px 30px rgba(2, 6, 23, 0.06)",
  },

  pill: {
    padding: "7px 10px",
    borderRadius: 999,
    fontWeight: 850,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
  },

  actionsCol: { display: "grid", gap: 10 },

  actionsHint: { marginTop: 10, color: TOKENS.muted, fontSize: 13, lineHeight: 1.65 },

  muted: { color: TOKENS.muted },

  mutedSmall: { color: TOKENS.muted, fontSize: 12, lineHeight: 1.55 },

  errorText: { color: "#ef4444", fontWeight: 850 },

  /* =========================
     NEW: Modern Profile UI extras
     (used by updated Profile.tsx)
     ========================= */

  hero: {
    background: "#fff",
    border: TOKENS.border,
    borderRadius: TOKENS.radius,
    padding: 18,
    boxShadow: TOKENS.shadow,
  },

  heroTop: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 16,
    alignItems: "center",
  },

  heroName: { fontSize: 34, fontWeight: 950, color: TOKENS.text, lineHeight: 1.1, letterSpacing: -0.6 },
  heroRole: { fontSize: 15, fontWeight: 900, color: "#475569" },

  metaRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 },

  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 12,
    border: TOKENS.softBorder,
    background: "rgba(241,245,249,0.55)",
    fontWeight: 900,
    color: TOKENS.text,
    cursor: "pointer",
    userSelect: "none",
  },

  tabs: {
    display: "flex",
    gap: 10,
    borderTop: "1px solid rgba(15,23,42,0.06)",
    marginTop: 16,
    paddingTop: 14,
    flexWrap: "wrap",
  },

  tabBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: TOKENS.softBorder,
    background: "#fff",
    color: TOKENS.text,
    fontWeight: 950,
    cursor: "pointer",
  },

  tabBtnActive: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(22,163,74,0.35)",
    background: "rgba(22,163,74,0.08)",
    color: TOKENS.text,
    fontWeight: 950,
    cursor: "pointer",
  },

  cardsRow3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },

  stat: {
    border: TOKENS.border,
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
    boxShadow: TOKENS.shadow2,
  },

  statTitle: { fontSize: 12, fontWeight: 950, color: "#64748b" },
  statValue: { fontSize: 16, fontWeight: 950, color: TOKENS.text },

  progressWrap: {
    height: 10,
    borderRadius: 999,
    background: "rgba(148,163,184,0.25)",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    width: "0%",
    background: "rgba(22,163,74,0.85)",
    borderRadius: 999,
  },

  quickGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },

  quickItem: {
    border: TOKENS.softBorder,
    background: "rgba(241,245,249,0.55)",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
  },

  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#fff",
    border: TOKENS.softBorder,
    display: "grid",
    placeItems: "center",
    fontSize: 18,
  },

  timeline: { display: "grid", gap: 10 },

  timeItem: {
    display: "grid",
    gridTemplateColumns: "10px 1fr",
    gap: 10,
    alignItems: "start",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(22,163,74,0.90)",
    marginTop: 5,
  },

  timeTitle: { fontWeight: 950, color: TOKENS.text },
  timeSub: { fontWeight: 850, color: TOKENS.muted, fontSize: 13 },

  warnBox: {
    border: "1px solid rgba(245,158,11,0.35)",
    background: "rgba(245,158,11,0.10)",
    borderRadius: 14,
    padding: 12,
    color: TOKENS.text,
    fontWeight: 850,
    display: "grid",
    gap: 6,
  },
};