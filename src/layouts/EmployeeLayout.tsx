import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "../utils/auth";
import "../index.css";

export default function EmployeeLayout() {
  const nav = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `side-link ${isActive ? "active" : ""}`;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside
        className="side"
        style={{ display: "flex", flexDirection: "column" }} // ✅ ensures bottom section sticks
      >
        {/* Brand */}
        <div className="side-brand">
          <div className="side-logo">IntelliHR</div>
          <span className="badge">Employee</span>
        </div>

        {/* Nav title */}
        <div className="muted" style={{ padding: "0 12px 10px", margin: 0 }}>
          Navigation
        </div>

        {/* Navigation */}
        <nav className="side-nav" style={{ flex: 1 }}>
          <NavLink to="/me/profile" className={linkClass}>
            My Profile
          </NavLink>

          <NavLink to="/me/activities" className={linkClass}>
            My Activities
          </NavLink>

          <NavLink to="/me/recommendations" className={linkClass}>
            Recommendations
          </NavLink>

          <NavLink to="/me/history" className={linkClass}>
            History
          </NavLink>
          <NavLink to="/me/cv" className={linkClass}>
  My CV
</NavLink>
<NavLink to="/me/profile" className={linkClass}>
  <span className="side-dot" />
  Profile
</NavLink>
        </nav>

        {/* Bottom section */}
        <div style={{ padding: "12px" }}>
          {/* Sign out */}
          <button
            className="btn btn-danger-outline w-full"
            type="button"
            onClick={() => signOut(nav)}
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              color: "#ef4444",
              fontWeight: 800,
            }}
          >
            Sign out
          </button>

          {/* User card */}
          <div className="side-footer" style={{ marginTop: 12 }}>
            <div className="muted" style={{ margin: 0 }}>
              Signed in as
            </div>

            <div className="side-user">
              <img
                className="avatar-sm"
                src="https://randomuser.me/api/portraits/men/35.jpg"
                alt="Employee"
              />
              <div>
                <div className="side-name">Employee</div>
                <div className="side-sub" style={{ color: "var(--muted)" }}>
                  My learning space
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="main-topbar">
          <div>
            <div className="main-title">My Workspace</div>
            <div className="main-sub">Profile, activities, and progress</div>
          </div>

          <div className="topbar-actions">
            <input className="input" placeholder="Search…" />
            <button className="btn btn-ghost">Help</button>
            <button className="btn btn-primary">New Activity</button>
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