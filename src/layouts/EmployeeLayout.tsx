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

    return () => {
      window.removeEventListener("avatar-updated", onAvatarUpdated);
    };
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Employee", "My learning space"),
    [avatarRefresh]
  );

  return (
    <AppShell
      badge="Employee"
      title="My Workspace"
      subtitle="Profile, progress, and skills"
      profilePath="/me/profile"
      nav={[
        { to: "/me/skills", label: "My Skills" },
        { to: "/me/activity-invitations", label: "Activity invitations" },
        { to: "/me/notifications", label: "Notifications" },
      ]}
      topbarRight={
        <div className="topbar-actions">
          <input className="input" placeholder="Search…" />
          <button className="btn btn-ghost">Help</button>
          <button
            className="btn btn-primary"
            onClick={() => window.location.assign("/me/skills")}
          >
            My Skills
          </button>
        </div>
      }
      userCard={userCard}
    />
  );
}