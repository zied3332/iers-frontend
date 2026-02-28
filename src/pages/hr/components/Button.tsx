// src/pages/hr/users/components/Button.tsx
import React from "react";

type BtnVariant = "primary" | "outline" | "danger";

const BTN_BASE: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  border: "1px solid var(--border)",
  background: "#fff",
  color: "var(--heading)",
  textDecoration: "none",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  outline: BTN_BASE,
  primary: {
    ...BTN_BASE,
    border: "1px solid rgba(31,122,90,0.20)",
    background: "rgba(31,122,90,0.10)",
    color: "#145a41",
  },
  danger: {
    ...BTN_BASE,
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
  },
};

export function Button({
  children,
  variant = "outline",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BTN_STYLES[variant],
        opacity: disabled ? 0.65 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {children}
    </button>
  );
}