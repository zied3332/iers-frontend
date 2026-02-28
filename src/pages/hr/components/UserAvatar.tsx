// src/pages/hr/users/components/UserAvatar.tsx
import React from "react";

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = 36,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hue = ((email || "").split("").reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0) + 200) % 360;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `hsl(${hue}, 65%, 92%)`,
        color: "#0f172a",
        fontWeight: 900,
        fontSize: size * 0.4,
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      {initials}
    </div>
  );
}