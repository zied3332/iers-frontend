// src/layouts/AppShell.tsx
import type { ReactNode } from "react";
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "../utils/auth";
import "../index.css";

type NavItem = {
  to: string;
  label: string;
};

function linkClass({ isActive }: { isActive: boolean }) {
  return `side-link ${isActive ? "active" : ""}`;
}

// Simple inline profile icon (no extra libs)
function ProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AppShell({
  badge,
  title,
  subtitle,
  nav,
  topbarRight,
  sidebarFooter,
  profilePath,
  userCard,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  nav: NavItem[];
  topbarRight?: ReactNode;
  sidebarFooter?: ReactNode;
  profilePath: string;
  userCard?: {
    name: string;
    sub?: string;
    avatarUrl?: string;
  };
}) {
  const navigate = useNavigate();

  // ✅ fixed sidebar width (same on all roles)
  const SIDE_W = 272;

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
      }}
    >
      {/* Sidebar (fixed) */}
      <aside
        className="side"
        style={{
          width: SIDE_W,
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          zIndex: 50,
        }}
      >
        <div className="side-brand">
          <div className="side-logo">IntelliHR</div>
          <span className="badge">{badge}</span>
        </div>

        <div className="muted" style={{ padding: "0 12px 10px", margin: 0 }}>
          Navigation
        </div>

        <nav className="side-nav" style={{ flex: 1 }}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: "12px" }}>
          <button
            className="btn btn-danger-outline w-full"
            type="button"
            onClick={() => signOut(navigate)}
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              color: "#ef4444",
              fontWeight: 800,
            }}
          >
            Sign out
          </button>

          {userCard ? (
            <div className="side-footer" style={{ marginTop: 12 }}>
              <div className="muted" style={{ margin: 0 }}>
                Signed in as
              </div>

              <div className="side-user">
                <img
                  className="avatar-sm"
                  src={
                    userCard.avatarUrl ??
                    "https://randomuser.me/api/portraits/men/35.jpg"
                  }
                  alt={userCard.name}
                />
                <div>
                  <div className="side-name">{userCard.name}</div>
                  {userCard.sub ? (
                    <div className="side-sub" style={{ color: "var(--muted)" }}>
                      {userCard.sub}
                    </div>
                  ) : null}
                </div>
              </div>

              {sidebarFooter ? (
                <div style={{ marginTop: 12 }}>{sidebarFooter}</div>
              ) : null}
            </div>
          ) : sidebarFooter ? (
            <div className="side-footer" style={{ marginTop: 12 }}>
              {sidebarFooter}
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main */}
      <div
        className="main"
        style={{
          marginLeft: SIDE_W,
          minHeight: "100vh",
        }}
      >
        {/* ✅ Topbar (sticky) - FIXED BACKGROUND */}
        <div
          className="main-topbar"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,

            // ✅ ADD THESE:
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <div className="main-title">{title}</div>
            {subtitle ? <div className="main-sub">{subtitle}</div> : null}
          </div>

          <div
            className="topbar-actions"
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            {topbarRight}

            <NavLink
              to={profilePath}
              className="btn btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <ProfileIcon />
              Profile
            </NavLink>
          </div>
        </div>

        {/* Page content */}
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}