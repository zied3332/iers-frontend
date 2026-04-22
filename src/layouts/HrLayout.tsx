import { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

type HrNavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: string;
  icon?: string;
};

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

  const nav: HrNavItem[] = useMemo(
    () => [
      {
        to: "/hr/dashboard",
        label: "Dashboard",
        group: "Main menu",
        icon: "dashboard",
      },
      {
        to: "/hr/users",
        label: "User Management",
        group: "Main menu",
        icon: "users",
      },
      {
        to: "/hr/pending-users",
        label: "Account Management",
        group: "Main menu",
        icon: "validation",
      },
      {
        to: "/hr/employees",
        label: "Employee Management",
        group: "Main menu",
        icon: "employee",
      },
      {
        to: "/hr/departments",
        label: "Departments Management",
        group: "Organization",
        icon: "department",
      },
      {
        to: "/hr/activities",
        label: "Activity Management",
        end: true,
        group: "Operations",
        icon: "activity",
      },
      {
        to: "/hr/activities/pipeline",
        label: "Staffing & validation",
        group: "Operations",
        icon: "pipeline",
      },
      {
        to: "/hr/activities/archive",
        label: "Completed activities",
        group: "Operations",
        icon: "archive",
      },
      {
        to: "/hr/activities/evaluated",
        label: "Post-activity evaluations",
        group: "Operations",
        icon: "review",
      },
      {
        to: "/hr/domains",
        label: "Domain management",
        group: "Skills",
        icon: "domain",
      },
      {
        to: "/hr/skills",
        label: "Skills Management",
        end: true,
        group: "Skills",
        icon: "skills",
      },
      {
        to: "/hr/skills/assign",
        label: "Assign Skills",
        end: true,
        group: "Skills",
        icon: "assign",
      },
      {
        to: "/hr/history",
        label: "My history",
        group: "Personal",
        icon: "history",
      },
      {
        to: "/hr/copilot",
        label: "HR Copilot",
        group: "Intelligence",
        icon: "copilot",
      },
      {
        to: "/hr/notifications",
        label: "Notifications",
        group: "System",
        icon: "notifications",
      },
      {
        to: "/hr/settings",
        label: "Settings",
        group: "System",
        icon: "settings",
      },
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
      userCard={userCard}
    />
  );
}