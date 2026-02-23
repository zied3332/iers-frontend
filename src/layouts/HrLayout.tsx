import React from "react";
import AppShell from "./AppShell";
import "../index.css";

export default function HrLayout() {
  return (
    <AppShell
      badge="HR"
      title="HR Workspace"
      subtitle="Employees, skills, and recommendations"
      nav={[
        { to: "/hr/dashboard", label: "Dashboard" },
        { to: "/hr/employees", label: "Employees" },
        { to: "/hr/skills-dashboard", label: "Skills" },
        { to: "/hr/recommendations", label: "Recommendations" },
         { to: "/hr/users", label: "UserMangement" },
      ]}
      topbarRight={
        <>
          <input className="input" placeholder="Search employees, skills…" />
          <button className="btn btn-ghost">Export</button>
          <button className="btn btn-primary">Add Employee</button>
        </>
      }
    />
  );
}