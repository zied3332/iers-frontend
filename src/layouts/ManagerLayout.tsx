import React from "react";
import AppShell from "./AppShell";
import "../index.css";

export default function ManagerLayout() {
  return (
    <AppShell
      badge="Manager"
      title="Manager Workspace"
      subtitle="Team, approvals, and analytics"
      nav={[
        { to: "/manager/dashboard", label: "Dashboard" },
        { to: "/manager/approvals", label: "Approvals" },
        { to: "/manager/team", label: "My Team" },
        { to: "/manager/analytics", label: "Analytics" },
      ]}
      
      topbarRight={
        <>
          <input className="input" placeholder="Search team, activities…" />
          <button className="btn btn-ghost">Reports</button>
          <button className="btn btn-primary">New Review</button>
        </>
      }
    />
  );
}