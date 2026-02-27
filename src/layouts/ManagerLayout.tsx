// src/layouts/ManagerLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import AppShell from "./AppShell";
import { getSidebarUserCard } from "../utils/sidebarUser";
import "../index.css";

export default function ManagerLayout() {
  const [avatarRefresh, setAvatarRefresh] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarRefresh((r) => r + 1);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated);
  }, []);

  const userCard = useMemo(
    () => getSidebarUserCard("Manager", "Team overview"),
    [avatarRefresh]
  );

  return (
    <AppShell
      badge="Manager"
      title="Manager Workspace"
      subtitle="Team, approvals, and analytics"
      profilePath="/manager/profile"
      nav={[
        { to: "/manager/blank", label: "Dashboard" },
        { to: "/manager/blank", label: "Approvals" },
        { to: "/manager/team", label: "My Team" },
        { to: "/manager/blank", label: "Analytics" },
      ]}
      topbarRight={
        <>
          <input className="input" placeholder="Search team, activities…" />
          <button className="btn btn-ghost">Reports</button>
          <button className="btn btn-primary">New Review</button>
        </>
      }
      userCard={userCard}
    />
  );
}