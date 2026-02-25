// src/layouts/HrLayout.tsx
import React from "react";
import AppShell from "./AppShell";
import "../index.css";

export default function HrLayout() {
  return (
    <AppShell
      badge="HR"
      title="HR Workspace"
      subtitle="Employees, skills, and recommendations"
      profilePath="/hr/profile"
      nav={[
        // ✅ keep same sidebar labels, but send most links to a blank page
        { to: "/hr/blank", label: "Dashboard" },
        { to: "/hr/blank", label: "Employees" },
        { to: "/hr/blank", label: "Skills" },
        { to: "/hr/blank", label: "Recommendations" },

        // ✅ only this route stays working normally
        { to: "/hr/users", label: "User Management" },
      ]}
      topbarRight={
        <>
          <input className="input" placeholder="Search employees, skills…" />
          <button className="btn btn-ghost">Export</button>
          <button className="btn btn-primary">Add Employee</button>
        </>
      }
      userCard={{
        name: "HR Manager",
        sub: "Admin & HR tools",
        avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      }}
    />
  );
}