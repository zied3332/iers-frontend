// src/layouts/EmployeeLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

type EmployeeNavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: string;
  icon?: string;
};

export default function EmployeeLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);

    return () => {
      window.removeEventListener("avatar-updated", onAvatarUpdated);
    };
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Employee", "My learning space"),
    [avatarRefresh]
  );

  const nav: EmployeeNavItem[] = useMemo(
    () => [
      {
        to: "/me/skills",
        label: "My Skills",
        group: "Skills",
        icon: "skills",
      },
      {
        to: "/me/activity-invitations",
        label: "Activity invitations",
        group: "Operations",
        icon: "activity",
      },
      {
        to: "/me/activities/archive",
        label: "Activity archive",
        group: "Operations",
        icon: "archive",
      },
      {
        to: "/me/history",
        label: "My history",
        group: "Personal",
        icon: "history",
      },
      {
        to: "/me/notifications",
        label: "Notifications",
        group: "System",
        icon: "notifications",
      },
      {
        to: "/me/settings",
        label: "Settings",
        group: "System",
        icon: "settings",
      },
    ],
    []
  );

  return (
    <AppShell
      badge="Employee"
      title="My Workspace"
      subtitle="Profile, progress, and skills"
      profilePath="/me/profile"
      nav={nav}
      userCard={userCard}
    />
  );
}