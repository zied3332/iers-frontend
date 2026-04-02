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

  const isSuperManager = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return false;
      const user = JSON.parse(raw) as { role?: string };
      const role = String(user?.role || "").toUpperCase();
      return role === "SUPER_MANAGER" || role === "SUPER MANGER";
    } catch {
      return false;
    }
  }, [avatarRefresh]);

  const nav = useMemo(
    () => [
      { to: "/hr/dashboard", label: "Dashboard" },
      ...(isSuperManager
        ? [
            { to: "/hr/employees", label: "Employee Management" },
            { to: "/hr/users", label: "User Management" },
            { to: "/hr/departments", label: "Departments Management" },
          ]
        : []),
      { to: "/hr/activities", label: "Activity Management", end: true },
      { to: "/hr/activity-applications", label: "Activity Applications", end: true },
      { to: "/hr/skills", label: "Skills Management", end: true },
      { to: "/hr/skills/assign", label: "Assign Skills", end: true },
      { to: "/hr/recommendations", label: "Recommendations" },
      { to: "/hr/notifications", label: "Notifications" },
    ],
    [isSuperManager]
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