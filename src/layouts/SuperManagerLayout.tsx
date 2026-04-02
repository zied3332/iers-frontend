import { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

export default function SuperManagerLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Super Manger", "Platform governance"),
    [avatarRefresh]
  );

  return (
    <AppShell
      badge="SUPER MANGER"
      title="Super Manger Workspace"
      subtitle="Governance, users, employees, departments, and operations"
      profilePath="/super-manager/profile"
      nav={[
        { to: "/super-manager/dashboard", label: "Dashboard" },
        { to: "/super-manager/users", label: "User Management" },
        { to: "/super-manager/employees", label: "Employee Management" },
        { to: "/super-manager/departments", label: "Departments Management" },
        { to: "/super-manager/activities", label: "Activity Management", end: true },
        { to: "/super-manager/activity-applications", label: "Activity Applications", end: true },
        { to: "/super-manager/skills", label: "Skills Management", end: true },
        { to: "/super-manager/skills/assign", label: "Assign Skills", end: true },
        { to: "/super-manager/recommendations", label: "Recommendations" },
        { to: "/super-manager/notifications", label: "Notifications" },
      ]}
      topbarRight={<input className="input" placeholder="Search users, employees, skills..." />}
      userCard={userCard}
    />
  );
}