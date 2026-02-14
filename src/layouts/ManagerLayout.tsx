import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../index.css";

export default function ManagerLayout() {
  return (
    <div className="hr-page">
      <div className="container">

        {/* Topbar */}
        <div className="hr-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>IntelliHR</div>
            <span className="badge">Manager</span>
          </div>

          <div className="hr-actions">
            <input className="input" placeholder="Search team, activities…" />
            <button className="btn btn-ghost">Reports</button>
            <button className="btn btn-primary">New Review</button>
          </div>
        </div>

        {/* Manager Navigation */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <NavLink
            to="/manager/dashboard"
            className={({ isActive }) =>
              `tab ${isActive ? "active" : ""}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/manager/approvals"
            className={({ isActive }) =>
              `tab ${isActive ? "active" : ""}`
            }
          >
            Approvals
          </NavLink>

          <NavLink
            to="/manager/team"
            className={({ isActive }) =>
              `tab ${isActive ? "active" : ""}`
            }
          >
            My Team
          </NavLink>

          <NavLink
            to="/manager/analytics"
            className={({ isActive }) =>
              `tab ${isActive ? "active" : ""}`
            }
          >
            Analytics
          </NavLink>
        </div>

        {/* Page content */}
        <Outlet />
      </div>
    </div>
  );
}