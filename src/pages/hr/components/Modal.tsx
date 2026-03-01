// src/pages/hr/users/components/Modal.tsx
import React, { useEffect } from "react";
import { Button } from "./Button";
import { S } from "../styles/users.styles";

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  right,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = old;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={S.modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={S.modalCard}>
        <div style={S.modalHead}>
          <div>
            <div style={S.modalTitle}>{title}</div>
            {subtitle && (
              <div className="muted" style={{ marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {right}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}