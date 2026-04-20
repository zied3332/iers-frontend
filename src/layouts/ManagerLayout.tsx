import React, { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

type ManagerNavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: string;
  icon?: string;
};

export default function ManagerLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Manager", "Review and validate participants"),
    [avatarRefresh]
  );

  const nav: ManagerNavItem[] = useMemo(
    () => [
      {
        to: "/manager/dashboard",
        label: "Dashboard",
        group: "Main menu",
        icon: "dashboard",
      },
      {
        to: "/manager/team",
        label: "My Team",
        group: "Organization",
        icon: "employee",
      },
      {
        to: "/manager/activities",
        label: "Activities",
        end: true,
        group: "Operations",
        icon: "activity",
      },
      {
        to: "/manager/activities/running",
        label: "In progress",
        group: "Operations",
        icon: "pipeline",
      },
      {
        to: "/manager/activities/archive",
        label: "Past activities",
        group: "Operations",
        icon: "archive",
      },
      {
        to: "/manager/skills",
        label: "Skills Management",
        end: true,
        group: "Skills",
        icon: "skills",
      },
      {
        to: "/manager/skills/assign",
        label: "Assign Skills",
        end: true,
        group: "Skills",
        icon: "assign",
      },
      {
        to: "/manager/history",
        label: "My history",
        group: "Personal",
        icon: "history",
      },
      {
        to: "/manager/notifications",
        label: "Notifications",
        group: "System",
        icon: "notifications",
      },
      {
        to: "/manager/settings",
        label: "Settings",
        group: "System",
        icon: "settings",
      },
    ],
    []
  );

  return (
    <AppShell
      badge="Manager"
      title="Manager Workspace"
      subtitle="Review activities, validate participants, and monitor team decisions"
      profilePath="/manager/profile"
      nav={nav}
      userCard={userCard}
    />
  );
}