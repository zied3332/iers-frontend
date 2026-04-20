import type { ReactNode } from "react";
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "../utils/auth";
import "../index.css";
import NotificationBell from "../components/notifications/NotificationBell";

const logoSrc = "/images/logo.png";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: string;
  icon?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const FALLBACK_AVATAR = "https://randomuser.me/api/portraits/men/35.jpg";

function linkClass({ isActive }: { isActive: boolean }) {
  return `side-link nav-item ${isActive ? "active" : ""}`;
}

function inferNavGroup(label: string) {
  const text = label.toLowerCase();

  if (text.includes("copilot") || text.includes("recommend") || text.includes("analytic")) {
    return "Intelligence";
  }

  if (text.includes("notification")) {
    return "System";
  }

  return "Main menu";
}

function SidebarAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name: string;
}) {
  const [loadError, setLoadError] = React.useState(false);

  if (!avatarUrl) {
    return <img className="avatar-sm" src={FALLBACK_AVATAR} alt={name} />;
  }

  if (loadError) {
    const initial = (name || "U").trim().charAt(0).toUpperCase();

    return (
      <div
        className="avatar-sm"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: "var(--primary, #0f8f66)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: 16,
        }}
        title={name}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className="avatar-sm"
      src={avatarUrl}
      alt={name}
      onError={() => setLoadError(true)}
    />
  );
}

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
  sidebarFooter,
  profilePath,
  userCard,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  nav: NavItem[];
  sidebarFooter?: ReactNode;
  profilePath: string;
  userCard?: {
    name: string;
    sub?: string;
    avatarUrl?: string;
  };
}) {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const SIDE_W = 350;
  const workspaceCode =
    (badge || "HR").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "HR";

  const navGroups: NavGroup[] = React.useMemo(() => {
    const orderedTitles = [
      "Main menu",
      "Organization",
      "Operations",
      "Skills",
      "Personal",
      "Intelligence",
      "System",
    ];

    const groupedMap = new Map<string, NavItem[]>();

    nav.forEach((item) => {
      const title = item.group || inferNavGroup(item.label);
      if (!groupedMap.has(title)) {
        groupedMap.set(title, []);
      }
      groupedMap.get(title)!.push(item);
    });

    return orderedTitles
      .filter((titleKey) => groupedMap.has(titleKey))
      .map((titleKey) => ({
        title: titleKey,
        items: groupedMap.get(titleKey)!,
      }));
  }, [nav]);

  return (
    <div
      className="app-shell workspace-shell"
      style={{
        minHeight: "100vh",
        ["--side-w" as string]: `${SIDE_W}px`,
        position: "relative",
      }}
    >
      <aside
        className="side sidebar"
        style={{
          width: SIDE_W,
          minWidth: SIDE_W,
          maxWidth: SIDE_W,
          transform: isSidebarOpen ? "translateX(0)" : `translateX(-${SIDE_W}px)`,
          transition: "transform 0.3s ease",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 1000,
          overflowY: "auto",
        }}
      >
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <div className="side-brand brand">
              <div className="dash-logo-wrap">
                <img
                  className="dash-logo-img"
                  src={logoSrc}
                  alt="IntelliHR logo"
                />
              </div>

              <div className="brand-text">
                <h1>IntelliHR</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="sidebar-close-btn"
            >
              ✕
            </button>
          </div>

          <div className="workspace-switcher">
            <div className="workspace-avatar">{workspaceCode}</div>
            <div className="workspace-info">
              <span className="workspace-label">Workspace</span>
              <strong>{badge}</strong>
            </div>
          </div>

        </div>

        <div className="sidebar-menu">
          {navGroups.map((group) => (
            <div className="menu-group" key={group.title}>
              <p className="menu-title sidebar-section-title">{group.title}</p>

              <nav className="side-nav">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={linkClass}
                  >
                    <span className="side-link-icon" aria-hidden="true">
                      <NavItemIcon label={item.label} icon={item.icon} />
                    </span>
                    <span className="side-link-text">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          {userCard ? (
            <div className="user-card">
              <SidebarAvatar avatarUrl={userCard.avatarUrl} name={userCard.name} />

              <div className="user-meta">
                <strong>{userCard.name}</strong>
                <span>{userCard.sub || badge}</span>
              </div>

              {sidebarFooter ? <div className="user-extra">{sidebarFooter}</div> : null}
            </div>
          ) : null}

          <button
            className="logout-btn"
            type="button"
            onClick={() => signOut(navigate)}
          >
            Sign out
          </button>

          {!userCard && sidebarFooter ? (
            <div className="side-footer" style={{ marginTop: 12 }}>
              {sidebarFooter}
            </div>
          ) : null}
        </div>
      </aside>

      {!isSidebarOpen ? (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          style={{
            position: "fixed",
            left: 0,
            top: "28%",
            transform: "translateY(-28%)",
            zIndex: 1101,
            width: 46,
            height: 104,
            borderRadius: "0 14px 14px 0",
            border: "1px solid var(--border)",
            borderLeft: "none",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 900,
            cursor: "ew-resize",
            boxShadow: "0 10px 24px rgba(15,23,42,0.16)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.04em",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              opacity: 0.88,
            }}
          >
            PULL
          </span>
        </button>
      ) : null}

      <div
        className="main"
        style={{
          marginLeft: isSidebarOpen ? SIDE_W : 0,
          transition: "margin-left 0.3s ease",
          minHeight: "100vh",
        }}
      >
        <header className="main-topbar topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              type="button"
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              {isSidebarOpen ? "✕" : "☰"}
            </button>

            <div>
              <h2 className="main-title">{title}</h2>
              {subtitle ? <div className="main-sub">{subtitle}</div> : null}
            </div>
          </div>

          <div className="topbar-right topbar-actions">
            <NotificationBell />

            <NavLink to={profilePath} className="profile-btn">
              <ProfileIcon />
              Profile
            </NavLink>
          </div>
        </header>

        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NavItemIcon({
  label,
  icon,
}: {
  label: string;
  icon?: string;
}) {
  const key = (icon || label).toLowerCase();

  if (key.includes("dashboard")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (key.includes("users")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3 19C3 16.791 4.791 15 7 15H11C13.209 15 15 16.791 15 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M16 19H21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("employee")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M5 20C5 16.686 8.134 14 12 14C15.866 14 19 16.686 19 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("department")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="9" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 10V14M7 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("activity")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M8 3V7M16 3V7M8 12H16M8 16H13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("pipeline") || key.includes("validation") || key.includes("staffing")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="6" width="5" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="9" width="5" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="17" y="4" width="4" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (key.includes("archive") || key.includes("completed")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 7H21" stroke="currentColor" strokeWidth="2" />
        <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("skills")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 7L12 3L21 12L17 16L8 7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M3 21L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("assign")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M3 19C3 16.791 4.791 15 7 15H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 8H21M17.5 4.5V11.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("history")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 12A8 8 0 1 0 6.343 6.343"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M4 4V9H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("copilot") || key.includes("recommend") || key.includes("ai")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="7" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="11" r="1" fill="currentColor" />
        <circle cx="14" cy="11" r="1" fill="currentColor" />
        <path d="M10 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("notification")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 9C6 5.7 8.7 3 12 3C15.3 3 18 5.7 18 9V13L20 15V16H4V15L6 13V9Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10 19C10.4 20.2 11.1 21 12 21C12.9 21 13.6 20.2 14 19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes("setting")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.03 19.36A1.7 1.7 0 0 0 14 21V21.2A2 2 0 1 1 10 21.2V21A1.7 1.7 0 0 0 8.97 19.36A1.7 1.7 0 0 0 7.09 19.7L7.03 19.76A2 2 0 1 1 4.2 16.93L4.26 16.87A1.7 1.7 0 0 0 4.6 15A1.7 1.7 0 0 0 3 14H2.8A2 2 0 1 1 2.8 10H3A1.7 1.7 0 0 0 4.6 9A1.7 1.7 0 0 0 4.26 7.13L4.2 7.07A2 2 0 1 1 7.03 4.24L7.09 4.3A1.7 1.7 0 0 0 8.97 4.64A1.7 1.7 0 0 0 10 3V2.8A2 2 0 1 1 14 2.8V3A1.7 1.7 0 0 0 15.03 4.64A1.7 1.7 0 0 0 16.91 4.3L16.97 4.24A2 2 0 1 1 19.8 7.07L19.74 7.13A1.7 1.7 0 0 0 19.4 9A1.7 1.7 0 0 0 21 10H21.2A2 2 0 1 1 21.2 14H21A1.7 1.7 0 0 0 19.4 15Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 12H19M12 5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}