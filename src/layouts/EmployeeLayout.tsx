// src/layouts/EmployeeLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

export default function EmployeeLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Employee", "My learning space"),
    [avatarRefresh]
  );

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
      userCard={userCard}
    />
  );
}