import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiDroplet, FiLock, FiUser } from "react-icons/fi";

function roleBaseFromPath(pathname: string): "hr" | "super-manager" | "manager" | "me" {
  const first = String(pathname.split("/")[1] || "").toLowerCase();
  if (first === "hr") return "hr";
  if (first === "super-manager") return "super-manager";
  if (first === "manager") return "manager";
  return "me";
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roleBase = useMemo(() => roleBaseFromPath(location.pathname), [location.pathname]);
  const editProfilePath = `/${roleBase}/settings/edit-profile`;
  const changePasswordPath = `/${roleBase}/settings/change-password`;
  const appearancePath = `/${roleBase}/settings/appearance`;

  const clickableCardBase: React.CSSProperties = {
    cursor: "pointer",
    transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
    borderRadius: 18,
    border: "1px solid color-mix(in srgb, var(--border) 78%, var(--primary) 22%)",
    background:
      "linear-gradient(160deg, color-mix(in srgb, var(--card) 93%, var(--primary) 7%) 0%, var(--card) 60%)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    padding: 18,
  };

  const cardIcon: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "color-mix(in srgb, var(--primary) 18%, transparent)",
    color: "var(--primary)",
    fontWeight: 800,
    fontSize: 18,
    flexShrink: 0,
  };

  const onCardEnter = (element: HTMLDivElement) => {
    element.style.transform = "translateY(-3px)";
    element.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.12)";
    element.style.borderColor = "color-mix(in srgb, var(--primary) 60%, var(--border) 40%)";
  };

  const onCardLeave = (element: HTMLDivElement) => {
    element.style.transform = "translateY(0)";
    element.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.08)";
    element.style.borderColor = "color-mix(in srgb, var(--border) 78%, var(--primary) 22%)";
  };

  const renderCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    onOpen: () => void,
  ) => (
    <section
      className="card section-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={clickableCardBase}
      onMouseEnter={(e) => onCardEnter(e.currentTarget)}
      onMouseLeave={(e) => onCardLeave(e.currentTarget)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="section-title" style={{ fontSize: 20 }}>{title}</div>
          <p className="muted" style={{ marginTop: 0 }}>{description}</p>
        </div>
        <span style={cardIcon} aria-hidden="true">→</span>
      </div>
    </section>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 42%), var(--bg)",
        color: "var(--text)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          className="page-header"
          style={{
            borderRadius: 20,
            border: "1px solid color-mix(in srgb, var(--border) 70%, var(--primary) 30%)",
            background:
              "linear-gradient(140deg, color-mix(in srgb, var(--card) 85%, var(--primary) 15%) 0%, var(--card) 70%)",
            padding: "20px 22px",
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h1 className="page-title" style={{ margin: 0, letterSpacing: 0.2 }}>Settings</h1>
          <p className="page-subtitle" style={{ marginTop: 8, maxWidth: 760 }}>
            Manage your account, security, and visual experience from one place.
          </p>
        </div>

        {renderCard(
          "Edit profile",
          "Open the dedicated edit page to update your personal and work information.",
          <FiUser size={18} />,
          () => navigate(editProfilePath),
        )}
        {renderCard(
          "Change password",
          "Open the dedicated page to change password now or request a reset link securely.",
          <FiLock size={18} />,
          () => navigate(changePasswordPath),
        )}
        {renderCard(
          "Appearance",
          "Open appearance settings to choose dark/light mode and theme color.",
          <FiDroplet size={18} />,
          () => navigate(appearancePath),
        )}

      </div>
    </div>
  );
}
