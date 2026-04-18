// src/layouts/AppShell.tsx
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
};

function linkClass({ isActive }: { isActive: boolean }) {
  return `side-link nav-item ${isActive ? "active" : ""}`;
}

type NavGroup = {
  title: string;
  items: NavItem[];
};

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "themeMode";

function getStoredThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyThemeMode(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  document.body.style.colorScheme = theme;
}

function getNavGroup(label: string) {
  const text = label.toLowerCase();

  if (text.includes("recommend") || text.includes("copilot")) {
    return "Intelligence";
  }

  if (text.includes("notification")) {
    return "System";
  }

  return "Main menu";
}

const FALLBACK_AVATAR = "https://randomuser.me/api/portraits/men/35.jpg";

function SidebarAvatar({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
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
          background: "var(--color-primary, #0f8f66)",
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

  const [themeMode, setThemeMode] = React.useState<ThemeMode>(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      return current;
    }
    return getStoredThemeMode();
  });

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    applyThemeMode(themeMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // ignore storage failures
    }
  }, [themeMode]);

  const SIDE_W = 350;
  const workspaceCode =
    (badge || "HR").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "HR";

  const navGroups: NavGroup[] = [
    {
      title: "Main menu",
      items: nav.filter((item) => getNavGroup(item.label) === "Main menu"),
    },
    {
      title: "Intelligence",
      items: nav.filter((item) => getNavGroup(item.label) === "Intelligence"),
    },
    {
      title: "System",
      items: nav.filter((item) => getNavGroup(item.label) === "System"),
    },
  ].filter((group) => group.items.length > 0);

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
            <span className="workspace-caret" aria-hidden="true"></span>
          </div>

          <div className="sidebar-search" aria-hidden="true">
            <span className="search-icon"></span>
            <input type="text" placeholder="Search" />
            <span className="search-shortcut">/</span>
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
                      <NavItemIcon label={item.label} />
                    </span>
                    <span className="side-link-text">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {group.title === "System" ? (
                <button
                  type="button"
                  className="theme-toggle-btn"
                  onClick={() =>
                    setThemeMode((prev) => (prev === "light" ? "dark" : "light"))
                  }
                  aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
                  title={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
                >
                  <span className="theme-toggle-meta">
                    <span className="theme-toggle-text">
                      {themeMode === "light" ? "Switch to dark" : "Switch to light"}
                    </span>
                    <span className="theme-toggle-subtext">Appearance</span>
                  </span>
                  <span
                    className={`theme-toggle-track ${themeMode === "dark" ? "is-dark" : ""}`}
                  >
                    <span className="theme-toggle-icon sun" aria-hidden="true">
                      ☀
                    </span>
                    <span className="theme-toggle-icon moon" aria-hidden="true">
                      ☾
                    </span>
                    <span className="theme-toggle-thumb" />
                  </span>
                </button>
              ) : null}
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
            <div className="topbar-search" aria-hidden="true">
              <span className="search-icon"></span>
              <input type="text" placeholder="Search workspace..." />
            </div>

            <NotificationBell />

            {topbarRight}

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

function NavItemIcon({ label }: { label: string }) {
  const text = label.toLowerCase();

  if (text.includes("dashboard")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (text.includes("activit")) {
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

  if (text.includes("user") || text.includes("employee") || text.includes("team")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 21V19C16 16.8 14.2 15 12 15H7C4.8 15 3 16.8 3 19V21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M17 11C18.7 11 20 9.7 20 8C20 6.3 18.7 5 17 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (text.includes("skill")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 7L12 3L21 12L17 16L8 7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M3 21L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (text.includes("recommend") || text.includes("copilot") || text.includes("analytic")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3L14.8 8.2L20.5 9.1L16.3 13.1L17.3 18.8L12 16L6.7 18.8L7.7 13.1L3.5 9.1L9.2 8.2L12 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (text.includes("notification")) {
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

  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}