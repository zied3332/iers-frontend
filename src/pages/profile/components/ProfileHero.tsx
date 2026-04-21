import React from "react";
import { FiEdit2 } from "react-icons/fi";

type Tone = "neutral" | "success" | "danger";

type UserLike = {
  name: string;
  email: string;
  matricule?: string;
};

function toneStyles(tone: Tone) {
  if (tone === "success") {
    return {
      background: "var(--primary-weak)",
      border: "1px solid var(--primary-border)",
      color: "var(--primary-soft-text)",
    };
  }

  if (tone === "danger") {
    return {
      background: "rgba(239,68,68,0.10)",
      border: "1px solid rgba(239,68,68,0.20)",
      color: "#991b1b",
    };
  }

  return {
    background: "rgba(100,116,139,0.10)",
    border: "1px solid rgba(100,116,139,0.18)",
    color: "#334155",
  };
}

function InfoPill({
  text,
  tone = "neutral",
  onClick,
}: {
  text: string;
  tone?: Tone;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...toneStyles(tone),
        borderRadius: 14,
        padding: "10px 14px",
        fontWeight: 800,
        fontSize: 15,
        cursor: onClick ? "pointer" : "default",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {text}
    </button>
  );
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "#dfe7f2",
        color: "#334155",
        fontSize: 42,
        fontWeight: 800,
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      {initials}
    </div>
  );
}

export default function ProfileHero({
  user,
  avatarUrl,
  departmentName,
  roleLabel,
  accountStatusLabel,
  onlineLabel,
  onCopyEmail,
  onCopyMatricule,
  onEditProfile,
}: {
  user: UserLike;
  avatarUrl?: string;
  departmentName?: string;
  roleLabel: string;
  accountStatusLabel: string;
  onlineLabel: string;
  onCopyEmail: () => void;
  onCopyMatricule: () => void;
  onEditProfile: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          padding: 28,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 24,
          alignItems: "center",
        }}
      >
        <Avatar name={user.name} avatarUrl={avatarUrl} />

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 40,
                lineHeight: 1.05,
                fontWeight: 900,
                color: "var(--text)",
              }}
            >
              {user.name}
            </h1>

            <span
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontWeight: 700,
              }}
            >
              Tunisia
            </span>
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 18,
            }}
          >
            {roleLabel}
            {departmentName ? ` at ${departmentName}` : ""}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <InfoPill
              text={user.matricule ? `ID ${user.matricule}` : "No ID"}
              onClick={onCopyMatricule}
            />
            <InfoPill text={user.email} onClick={onCopyEmail} />
            <InfoPill text={accountStatusLabel} tone="success" />
            <InfoPill text={roleLabel} tone="success" />
            <InfoPill text={onlineLabel} tone="neutral" />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={onEditProfile}
            style={{
              border: "none",
              borderRadius: 18,
              padding: "16px 24px",
              background: "#0b0b0f",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <FiEdit2 size={18} />
            Edit profile
          </button>
        </div>
      </div>
    </div>
  );
}