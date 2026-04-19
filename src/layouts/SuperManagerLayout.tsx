import { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

type SuperManagerNavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: string;
  icon?: string;
};

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

  const nav: SuperManagerNavItem[] = useMemo(
    () => [
      {
        to: "/super-manager/dashboard",
        label: "Dashboard",
        group: "Main menu",
        icon: "dashboard",
      },
      {
        to: "/super-manager/users",
        label: "User Management",
        group: "Main menu",
        icon: "users",
      },
      {
        to: "/super-manager/employees",
        label: "Employee Management",
        group: "Main menu",
        icon: "employee",
      },
      {
        to: "/super-manager/departments",
        label: "Departments Management",
        group: "Organization",
        icon: "department",
      },
      {
        to: "/super-manager/activities",
        label: "Activity Management",
        end: true,
        group: "Operations",
        icon: "activity",
      },
      {
        to: "/super-manager/skills",
        label: "Skills Management",
        end: true,
        group: "Skills",
        icon: "skills",
      },
      {
        to: "/super-manager/skills/assign",
        label: "Assign Skills",
        end: true,
        group: "Skills",
        icon: "assign",
      },
      {
        to: "/super-manager/recommendations",
        label: "Recommendations",
        group: "Intelligence",
        icon: "copilot",
      },
      {
        to: "/super-manager/history",
        label: "My history",
        group: "Personal",
        icon: "history",
      },
      {
        to: "/super-manager/notifications",
        label: "Notifications",
        group: "System",
        icon: "notifications",
      },
    ],
    []
  );

  return (
    <AppShell
      badge="SUPER MANGER"
      title="Super Manger Workspace"
      subtitle="Governance, users, employees, departments, and operations"
      profilePath="/super-manager/profile"
      nav={nav}
      topbarRight={<input className="input" placeholder="Search users, employees, skills..." />}
      userCard={userCard}
    />
  );
}