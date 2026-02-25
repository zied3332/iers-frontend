// src/layouts/ManagerLayout.tsx
import React from "react";
import AppShell from "./AppShell";
import "../index.css";

export default function ManagerLayout() {
  return (
    <AppShell
      badge="Manager"
      title="Manager Workspace"
      subtitle="Team, approvals, and analytics"
      profilePath="/manager/profile"
      nav={[
        // ✅ these keep the sidebar same labels but open a blank page
        { to: "/manager/blank", label: "Dashboard" },
        { to: "/manager/blank", label: "Approvals" },

        // ✅ only this route keeps working normally (user/team management)
        { to: "/manager/team", label: "My Team" },

        // ✅ blank
        { to: "/manager/blank", label: "Analytics" },
      ]}
      topbarRight={
        <>
          <input className="input" placeholder="Search team, activities…" />
          <button className="btn btn-ghost">Reports</button>
          <button className="btn btn-primary">New Review</button>
        </>
      }
      userCard={{
        name: "Manager",
        sub: "Team overview",
        avatarUrl: "https://randomuser.me/api/portraits/men/12.jpg",
      }}
    />
  );
}