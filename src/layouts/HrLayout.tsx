// src/layouts/HrLayout.tsx
import { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

export default function HrLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("HR Manager", "Admin & HR tools"),
    [avatarRefresh]
  );

  const nav = useMemo(
    () => [
      { to: "/hr/dashboard", label: "Dashboard" },
      { to: "/hr/users", label: "User Management" },
      { to: "/hr/employees", label: "Employee Management" },
      { to: "/hr/departments", label: "Departments Management" },
      { to: "/hr/activities", label: "Activity Management", end: true },
      { to: "/hr/skills", label: "Skills Management", end: true },
      { to: "/hr/skills/assign", label: "Assign Skills", end: true },
      { to: "/hr/copilot", label: "HrCopilotPage" },
      { to: "/hr/notifications", label: "Notifications" },
    ],
    []
  );

  return (
    <AppShell
      badge="HR"
      title="HR Workspace"
      subtitle="Employees, skills, and recommendations"
      profilePath="/hr/profile"
      nav={nav}
      topbarRight={
        <input className="input" placeholder="Search employees, skills…" />
      }
      userCard={userCard}
    />
  );
}