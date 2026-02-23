import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../index.css";

type NavItem = {
  to: string;
  label: string;
};

function linkClass({ isActive }: { isActive: boolean }) {
  return `side-link ${isActive ? "active" : ""}`;
}

export default function AppShell({
  badge,
  title,
  subtitle,
  nav,
  topbarRight,
  sidebarFooter,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  nav: NavItem[];
  topbarRight?: ReactNode;
  sidebarFooter?: ReactNode;
}) {
  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="side">
        <div className="side-brand">
          <div className="side-logo">IntelliHR</div>
          <span className="badge">{badge}</span>
        </div>

        {/* Optional small label above menu */}
        <div className="muted" style={{ padding: "0 12px 10px", margin: 0 }}>
          Navigation
        </div>

        <nav className="side-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
            
          ))}
        </nav>

        {/* Footer */}
        {sidebarFooter ? <div className="side-footer">{sidebarFooter}</div> : null}
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="main-topbar">
          <div>
            <div className="main-title">{title}</div>
            {subtitle ? <div className="main-sub">{subtitle}</div> : null}
          </div>

          {/* IMPORTANT: ensure buttons here use className="btn ..." */}
          <div className="topbar-actions">{topbarRight}</div>
        </div>

        {/* Page content */}
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}