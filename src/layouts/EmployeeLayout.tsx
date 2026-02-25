// src/layouts/EmployeeLayout.tsx
import React from "react";
import AppShell from "./AppShell";
import "../index.css";

export default function EmployeeLayout() {
  return (
    <AppShell
      badge="Employee"
      title="My Workspace"
      subtitle="Profile, activities, and progress"
      profilePath="/me/profile"
    nav={[
  { to: "/me/blank", label: "My Activities" },
  { to: "/me/blank", label: "Recommendations" },
  { to: "/me/blank", label: "History" },
  { to: "/me/blank", label: "My CV" },
]}
      topbarRight={
        <>
          <input className="input" placeholder="Search…" />
          <button className="btn btn-ghost">Help</button>
          <button className="btn btn-primary">New Activity</button>
        </>
      }
      userCard={{
        name: "Employee",
        sub: "My learning space",
        avatarUrl: "https://randomuser.me/api/portraits/men/35.jpg",
      }}
    />
  );
}