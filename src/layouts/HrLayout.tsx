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

  return (
    <AppShell
      badge="HR"
      title="HR Workspace"
      subtitle="Employees, skills, and recommendations"
      profilePath="/hr/profile"
      nav={[
        { to: "/hr/blank", label: "Dashboard" },
        { to: "/hr/employees", label: "Employee Management" },
        { to: "/hr/blank", label: "Skills" },
        { to: "/hr/blank", label: "Recommendations" },
        { to: "/hr/departments", label: "Departments" },
        { to: "/hr/users", label: "User Management" },
      ]}
      topbarRight={
        <input className="input" placeholder="Search employees, skills…" />
      }
      userCard={userCard}
    />
  );
}