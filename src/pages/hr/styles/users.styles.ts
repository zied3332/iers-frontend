// src/pages/hr/users/styles/users.styles.ts
import type React from "react";

export const S: Record<string, React.CSSProperties> = {
  pageCard: {
    padding: 20,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
  },
  statsRow: { display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    flex: "1 1 140px",
    minWidth: 140,
    padding: "16px 18px",
    borderRadius: 12,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderLeft: "4px solid rgba(15,23,42,0.15)",
  },
  statCardInner: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  statValue: { fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 13, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" },

  pageTitle: { fontSize: 22, fontWeight: 900, color: "#0f172a" },
  pageSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },

  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  headerActions: { display: "flex", alignItems: "center", gap: 10 },

  searchWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: 12, fontSize: 14, opacity: 0.6 },
  searchInput: { minWidth: 260, paddingLeft: 36, borderRadius: 12, border: "1px solid rgba(15,23,42,0.12)" },
  refreshBtn: { borderRadius: 12, fontWeight: 800 },

  errorBox: {
    marginTop: 12,
    padding: 12,
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 12,
    background: "rgba(239,68,68,0.06)",
  },

  tableWrap: { overflowX: "auto", marginTop: 18, borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "14px 12px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 900,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "rgba(248,250,252,0.9)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },
  tr: { borderBottom: "1px solid rgba(15,23,42,0.06)" },
  td: { padding: "12px" },
  roleSelect: { padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.12)", fontWeight: 800, fontSize: 13 },

  actionsGroup: {
    display: "inline-flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 0,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.1)",
    background: "rgba(248,250,252,0.6)",
  },
  actionBtn: {
    width: 38,
    height: 38,
    border: "none",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: { color: "#166534", borderRight: "1px solid rgba(15,23,42,0.08)" },
  actionBtnDanger: { color: "#b91c1c", borderRight: "none" },

  emptyCell: { padding: 32, textAlign: "center", color: "#64748b", fontWeight: 800 },

  deleteModalCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.5)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: 16,
  },

  // ✅ UPDATED: bigger modal
  modalCard: {
    width: "min(1120px, 96vw)",   // was 860px
    maxHeight: "92vh",           // prevent overflow on small screens
    overflow: "auto",            // allow scrolling inside modal
    borderRadius: 18,            // a bit smoother for big modal
    padding: 22,                 // slightly larger padding
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    background: "#fff",
  },

  modalHead: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a" },

  blockTitle: { fontWeight: 900, marginBottom: 10, color: "#0f172a" },
  blockValue: { fontWeight: 800, marginBottom: 10, color: "#334155" },
};