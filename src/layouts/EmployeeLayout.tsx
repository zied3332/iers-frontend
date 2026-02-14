import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../index.css";

export default function EmployeeLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `side-link ${isActive ? "active" : ""}`;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="side">
        <div className="side-brand">
          <div className="side-logo">IntelliHR</div>
          <span className="badge">Employee</span>
        </div>

        <nav className="side-nav">
          <NavLink to="/me/profile" className={linkClass}>
            <span className="side-dot" />
            My Profile
          </NavLink>

          <NavLink to="/me/activities" className={linkClass}>
            <span className="side-dot" />
            My Activities
          </NavLink>

          <NavLink to="/me/recommendations" className={linkClass}>
            <span className="side-dot" />
            Recommendations
          </NavLink>

          <NavLink to="/me/history" className={linkClass}>
            <span className="side-dot" />
          History
          </NavLink>
        </nav>

        <div className="side-footer">
          <div className="muted">Signed in as</div>
          <div className="side-user">
                 <img
  className="emp-photo"
  src="https://randomuser.me/api/portraits/men/35.jpg"
  alt="John Doe"
/>
            <div>
              <div className="side-name">Employee</div>
              <div className="side-sub">My learning space</div>
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

          <div className="hr-actions">
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