// src/pages/Profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, type CurrentUser, type Role } from "../../services/auth.service";
import { signOut } from "../../utils/auth";

import { changeMyPassword, patchMe, patchUserById } from "./profile.api";
import { BTN_STYLES, PILL_TONES, S, type BtnVariant, type Tone } from "./profile.styles";

/* =======================
   Small UI helpers
   ======================= */

type PageStatus = "loading" | "ready" | "error";
type TabKey = "overview" | "security" | "hr" | "activity";

function safeUpper(v?: string) {
  return (v ?? "").toString().trim().toUpperCase();
}

function roleLabel(role?: Role) {
  const r = safeUpper(role as any);
  if (r === "HR") return "HR";
  if (r === "MANAGER") return "Manager";
  return "Employee";
}

function roleTone(role?: Role): Tone {
  const r = safeUpper(role as any);
  if (r === "HR") return "success";
  if (r === "MANAGER") return "neutral";
  return "neutral";
}

function Avatar({
  name,
  email,
  avatarUrl,
  size = 84,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }, [name]);

  const hue = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
    return hash % 360;
  }, [email]);

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
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          background: "#fff",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
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
        display: "grid",
        placeItems: "center",
        fontWeight: 950,
        color: "#0f172a",
        border: "1px solid rgba(15,23,42,0.10)",
        background: `hsl(${hue} 70% 92%)`,
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        letterSpacing: 0.6,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

function Pill({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  const map = PILL_TONES[tone];
  return (
    <span style={{ ...S.pill, background: map.bg, border: `1px solid ${map.bd}`, color: map.fg }}>
      {text}
    </span>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <div>
          <div style={S.cardTitle}>{title}</div>
          {subtitle && <div style={S.cardSubtitle}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={S.fieldRow}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={S.fieldValue}>{value ?? "—"}</div>
    </div>
  );
}

function Button({
  children,
  variant = "outline",
  onClick,
  as = "button",
  to,
  disabled,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  as?: "button" | "link";
  to?: string;
  disabled?: boolean;
}) {
  const style = disabled
    ? { ...BTN_STYLES[variant], opacity: 0.6, pointerEvents: "none" as const }
    : BTN_STYLES[variant];

  if (as === "link" && to) {
    return (
      <Link to={to} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        style={{
          padding: "11px 12px",
          borderRadius: 12,
          border: "1px solid #e6ebf1",
          background: disabled ? "rgba(241,245,249,0.7)" : "#fff",
          color: "#0f172a",
          fontWeight: 800,
          outline: "none",
        }}
      />
      {hint ? <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div> : null}
    </div>
  );
}

/* =======================
   Local layout styles (new UI)
   NOTE: you will move these to profile.styles.ts later.
   ======================= */

const L = {
  hero: {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
  } as React.CSSProperties,
  heroTop: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 16,
    alignItems: "center",
  } as React.CSSProperties,
  heroName: { fontSize: 34, fontWeight: 950, color: "#0f172a", lineHeight: 1.1 } as React.CSSProperties,
  heroRole: { fontSize: 16, fontWeight: 900, color: "#475569" } as React.CSSProperties,
  metaRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 } as React.CSSProperties,
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "rgba(241,245,249,0.55)",
    fontWeight: 900,
    color: "#0f172a",
    cursor: "pointer",
    userSelect: "none",
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 10,
    borderTop: "1px solid rgba(15,23,42,0.06)",
    marginTop: 16,
    paddingTop: 14,
    flexWrap: "wrap",
  } as React.CSSProperties,
  tabBtn: (active: boolean) =>
    ({
      padding: "10px 12px",
      borderRadius: 12,
      border: active ? "1px solid rgba(22,163,74,0.35)" : "1px solid rgba(15,23,42,0.08)",
      background: active ? "rgba(22,163,74,0.08)" : "#fff",
      color: "#0f172a",
      fontWeight: 950,
      cursor: "pointer",
    }) as React.CSSProperties,
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  } as React.CSSProperties,
  stat: {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
  } as React.CSSProperties,
  statTitle: { fontSize: 12, fontWeight: 950, color: "#64748b" } as React.CSSProperties,
  statValue: { fontSize: 16, fontWeight: 950, color: "#0f172a" } as React.CSSProperties,
  progressWrap: {
    height: 10,
    borderRadius: 999,
    background: "rgba(148,163,184,0.25)",
    overflow: "hidden",
  } as React.CSSProperties,
  progressBar: (pct: number) =>
    ({
      height: "100%",
      width: `${Math.max(0, Math.min(100, pct))}%`,
      background: "rgba(22,163,74,0.85)",
      borderRadius: 999,
    }) as React.CSSProperties,
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  } as React.CSSProperties,
  quickItem: {
    border: "1px solid rgba(15,23,42,0.08)",
    background: "rgba(241,245,249,0.55)",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
  } as React.CSSProperties,
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    display: "grid",
    placeItems: "center",
    fontSize: 18,
  } as React.CSSProperties,
  timeline: { display: "grid", gap: 10 } as React.CSSProperties,
  timeItem: {
    display: "grid",
    gridTemplateColumns: "10px 1fr",
    gap: 10,
    alignItems: "start",
  } as React.CSSProperties,
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(22,163,74,0.9)",
    marginTop: 5,
  } as React.CSSProperties,
  timeTitle: { fontWeight: 950, color: "#0f172a" } as React.CSSProperties,
  timeSub: { fontWeight: 850, color: "#64748b", fontSize: 13 } as React.CSSProperties,
  warnBox: {
    border: "1px solid rgba(245,158,11,0.35)",
    background: "rgba(245,158,11,0.10)",
    borderRadius: 14,
    padding: 12,
    color: "#0f172a",
    fontWeight: 850,
    display: "grid",
    gap: 6,
  } as React.CSSProperties,
};

/* =======================
   Profile Page
   ======================= */

export default function Profile() {
  const nav = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [tab, setTab] = useState<TabKey>("overview");

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingHr, setSavingHr] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [isEditingBasics, setIsEditingBasics] = useState(false);
  const [isEditingHr, setIsEditingHr] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [telephone, setTelephone] = useState("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editMatricule, setEditMatricule] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editRole, setEditRole] = useState<Role>("EMPLOYEE" as Role);
  const [editStatus, setEditStatus] = useState("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await getCurrentUser();
        if (cancelled) return;

        setUser(me);
        setStatus("ready");

        const uAny = me as any;
        setAvatarUrl(uAny.avatarUrl ?? "");
        setTelephone(me.telephone ?? "");

        setEditName(me.name ?? "");
        setEditEmail(me.email ?? "");
        setEditDepartment(me.department ?? "");
        setEditMatricule(me.matricule ?? "");
        setEditRole((safeUpper(me.role as any) as Role) || ("EMPLOYEE" as Role));
        setEditStatus((uAny.status ?? "") as string);
        setEditIsActive(Boolean(uAny.isActive ?? true));

        const hd = me.date_embauche ? new Date(me.date_embauche) : null;
        setEditHireDate(hd ? hd.toISOString().slice(0, 10) : "");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load profile.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const canEditSensitive = safeUpper(user?.role as any) === "HR";
  const canEditSelfBasics = Boolean(user);
  const canEditEmail = safeUpper(user?.role as any) === "HR";

  const goBackPath = useMemo(() => {
    const r = safeUpper(user?.role as any);
    if (r === "HR") return "/hr/dashboard";
    if (r === "MANAGER") return "/manager/dashboard";
    return "/me/profile";
  }, [user?.role]);

  const myProfilePath = useMemo(() => {
    const r = safeUpper(user?.role as any);
    if (r === "HR") return "/hr/profile";
    if (r === "MANAGER") return "/manager/profile";
    return "/me/profile";
  }, [user?.role]);

  const onlineTone: Tone = user?.en_ligne ? "success" : "neutral";
  const onlineLabel = user?.en_ligne ? "Online" : "Offline";

  const createdAt = useMemo(() => {
    const raw = (user as any)?.createdAt;
    return raw ? new Date(raw).toLocaleString() : undefined;
  }, [user]);

  const updatedAt = useMemo(() => {
    const raw = (user as any)?.updatedAt;
    return raw ? new Date(raw).toLocaleString() : undefined;
  }, [user]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied!");
    } catch {
      setToast("Copy failed");
    }
  }, []);

  const onLogout = useCallback(() => {
    signOut(nav);
  }, [nav]);

  const onCopyUserId = useCallback(() => {
    if (user?._id) copy(user._id);
  }, [copy, user?._id]);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const uAny = user as any;

    const checks = [
      Boolean((uAny.avatarUrl ?? avatarUrl)?.trim()),
      Boolean((user.telephone ?? telephone)?.trim()),
      Boolean((user.department ?? editDepartment)?.trim()),
      Boolean((user.matricule ?? editMatricule)?.trim()),
      Boolean((user.date_embauche ?? editHireDate)?.toString().trim()),
      Boolean((uAny.status ?? editStatus)?.toString().trim()),
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [user, avatarUrl, telephone, editDepartment, editMatricule, editHireDate, editStatus]);

  const accountStatusLabel = useMemo(() => {
    const uAny = user as any;
    if (!user) return "—";
    if (uAny.isActive === false) return "Inactive";
    return "Active";
  }, [user]);

  const onSaveBasics = useCallback(async () => {
    if (!user) return;
    if (!canEditSelfBasics) return;

    setSavingBasics(true);
    setError("");
    try {
      await patchMe({
        telephone: telephone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      const next = { ...user, telephone: telephone.trim() || undefined } as any;
      next.avatarUrl = avatarUrl.trim() || undefined;

      setUser(next);
      setToast("Saved!");
      setIsEditingBasics(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
      setToast("Save failed");
    } finally {
      setSavingBasics(false);
    }
  }, [user, canEditSelfBasics, telephone, avatarUrl]);

  const onSaveHr = useCallback(async () => {
    if (!user) return;
    if (!canEditSensitive) return;

    setSavingHr(true);
    setError("");
    try {
      const payload: any = {
        name: editName.trim() || undefined,
        department: editDepartment.trim() || undefined,
        matricule: editMatricule.trim() || undefined,
        date_embauche: editHireDate ? new Date(editHireDate).toISOString() : undefined,
        role: safeUpper(editRole as any),
        status: editStatus.trim() || undefined,
        isActive: editIsActive,
      };

      if (canEditEmail) payload.email = editEmail.trim() || undefined;

      await patchUserById(user._id, payload);

      const next: any = {
        ...user,
        name: editName.trim() || user.name,
        email: canEditEmail ? (editEmail.trim() || user.email) : user.email,
        department: editDepartment.trim() || undefined,
        matricule: editMatricule.trim() || undefined,
        date_embauche: editHireDate ? new Date(editHireDate).toISOString() : undefined,
        role: safeUpper(editRole as any),
      };
      next.status = editStatus.trim() || (user as any).status;
      next.isActive = editIsActive;

      setUser(next);
      setToast("HR changes saved!");
      setIsEditingHr(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save HR changes.");
      setToast("Save failed");
    } finally {
      setSavingHr(false);
    }
  }, [
    user,
    canEditSensitive,
    canEditEmail,
    editName,
    editEmail,
    editDepartment,
    editMatricule,
    editHireDate,
    editRole,
    editStatus,
    editIsActive,
  ]);

  const onChangePassword = useCallback(async () => {
    setError("");

    if (!currentPassword.trim() || !newPassword.trim()) {
      setToast("Fill password fields");
      return;
    }
    if (newPassword.trim().length < 6) {
      setToast("Password too short");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setToast("Passwords do not match");
      return;
    }

    setSavingPwd(true);
    try {
      await changeMyPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setToast("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to change password.");
      setToast("Password change failed");
    } finally {
      setSavingPwd(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const timelineItems = useMemo(() => {
    if (!user) return [];
    const uAny = user as any;
    const items: Array<{ title: string; sub: string }> = [];

    if (user.date_embauche) {
      items.push({
        title: "Joined IntelliHR",
        sub: new Date(user.date_embauche).toLocaleDateString(),
      });
    } else if (createdAt) {
      items.push({ title: "Account created", sub: createdAt });
    }

    if (safeUpper(user.role as any) === "HR") items.push({ title: "Granted HR role", sub: "Current" });
    if (safeUpper(user.role as any) === "MANAGER") items.push({ title: "Granted Manager role", sub: "Current" });

    if (updatedAt) items.push({ title: "Updated profile", sub: updatedAt });

    if ("passwordUpdatedAt" in uAny && uAny.passwordUpdatedAt) {
      items.push({ title: "Password changed", sub: new Date(uAny.passwordUpdatedAt).toLocaleString() });
    } else {
      // keep a nice-looking timeline even if backend doesn't provide it
      items.push({ title: "Password changed", sub: "—" });
    }

    return items.slice(0, 6);
  }, [user, createdAt, updatedAt]);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <div style={S.h1}>My Profile</div>
          <div style={S.hSubtitle}>Overview, security, HR controls, and activity.</div>

          {toast && (
            <div style={{ marginTop: 10 }}>
              <Pill text={toast} tone="success" />
            </div>
          )}
        </div>

        <div style={S.headerRight} />
      </header>

      <div style={{ height: 14 }} />

      {status === "loading" && (
        <Card title="Loading" subtitle="Fetching your profile...">
          <div style={S.muted}>Please wait a moment.</div>
        </Card>
      )}

      {status === "error" && (
        <Card title="Error" subtitle="We couldn't load your profile">
          <div style={S.errorText}>{error}</div>
          <div style={{ ...S.muted, marginTop: 8 }}>If this keeps happening, your token might be expired.</div>
        </Card>
      )}

      {status === "ready" && user && (
        <>
          {/* HERO */}
          <div style={L.hero}>
            <div style={L.heroTop}>
              <Avatar name={user.name} email={user.email} avatarUrl={(user as any)?.avatarUrl} size={92} />

              <div>
                <div style={L.heroName}>{user.name}</div>
                <div style={L.heroRole}>{roleLabel(user.role)}{user.department ? ` • ${user.department}` : ""}</div>

                <div style={L.metaRow}>
                  {user.matricule ? (
                    <span style={L.metaChip} onClick={() => copy(user.matricule!)} title="Click to copy">
                      🆔 {user.matricule}
                    </span>
                  ) : (
                    <span style={{ ...L.metaChip, cursor: "default" }}>🆔 —</span>
                  )}

                  <span style={L.metaChip} onClick={() => copy(user.email)} title="Click to copy">
                    ✉ {user.email}
                  </span>

                  <span style={{ ...L.metaChip, cursor: "default" }}>
                    <Pill text={accountStatusLabel} tone={accountStatusLabel === "Active" ? "success" : "neutral"} />
                  </span>

                  <span style={{ ...L.metaChip, cursor: "default" }}>
                    <Pill text={roleLabel(user.role)} tone={roleTone(user.role)} />
                  </span>

                  <span style={{ ...L.metaChip, cursor: "default" }}>
                    <Pill text={onlineLabel} tone={onlineTone} />
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingBasics((v) => !v);
                    setTab("overview");
                  }}
                >
                  {isEditingBasics ? "Close Edit" : "Edit Profile"}
                </Button>

                {canEditSensitive ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingHr((v) => !v);
                      setTab("hr");
                    }}
                  >
                    {isEditingHr ? "Close HR" : "HR Controls"}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Tabs */}
            <div style={L.tabs}>
              <button type="button" style={L.tabBtn(tab === "overview")} onClick={() => setTab("overview")}>
                📌 Overview
              </button>
              <button type="button" style={L.tabBtn(tab === "security")} onClick={() => setTab("security")}>
                🔐 Security
              </button>
              {canEditSensitive ? (
                <button type="button" style={L.tabBtn(tab === "hr")} onClick={() => setTab("hr")}>
                  🔒 HR Controls
                </button>
              ) : null}
              <button type="button" style={L.tabBtn(tab === "activity")} onClick={() => setTab("activity")}>
                🕒 Activity
              </button>
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* CONTENT GRID (keep your existing grid system) */}
          <div style={S.grid}>
            {/* LEFT */}
            <div style={S.col}>
              {tab === "overview" && (
                <>
                  <Card
                    title="Profile Completion"
                    subtitle="Complete your profile to improve recommendations"
                    right={<Pill text={`${profileCompletion}%`} tone={profileCompletion >= 80 ? "success" : "neutral"} />}
                  >
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={L.progressWrap}>
                        <div style={L.progressBar(profileCompletion)} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 850, color: "#64748b" }}>
                        Tip: add phone, department, matricule and a profile picture.
                      </div>
                    </div>
                  </Card>

                  <div style={{ height: 12 }} />

                  <div style={L.cardsRow}>
                    <div style={L.stat}>
                      <div style={L.statTitle}>Account Status</div>
                      <div style={L.statValue}>
                        {accountStatusLabel}{" "}
                        {user.date_embauche ? `• since ${new Date(user.date_embauche).toLocaleDateString()}` : ""}
                      </div>
                    </div>

                    <div style={L.stat}>
                      <div style={L.statTitle}>Last Login</div>
                      <div style={L.statValue}>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                      </div>
                    </div>

                    <div style={L.stat}>
                      <div style={L.statTitle}>Role</div>
                      <div style={L.statValue}>{roleLabel(user.role)}</div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />

                  <Card title="Quick Actions" subtitle="Common actions">
                    <div style={L.quickGrid}>
                      <div style={L.quickItem} onClick={() => nav(goBackPath)} role="button" tabIndex={0}>
                        <div style={L.quickIcon}>🏠</div>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>Go to workspace</div>
                        <div style={{ fontSize: 12, fontWeight: 850, color: "#64748b" }}>Dashboard & tools</div>
                      </div>

                      <div style={L.quickItem} onClick={onCopyUserId} role="button" tabIndex={0}>
                        <div style={L.quickIcon}>🧾</div>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>Copy User ID</div>
                        <div style={{ fontSize: 12, fontWeight: 850, color: "#64748b" }}>For support/debug</div>
                      </div>

                      <div style={L.quickItem} onClick={onLogout} role="button" tabIndex={0}>
                        <div style={L.quickIcon}>🚪</div>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>Logout</div>
                        <div style={{ fontSize: 12, fontWeight: 850, color: "#64748b" }}>End session</div>
                      </div>
                    </div>

                    {error ? <div style={{ ...S.errorText, marginTop: 10 }}>{error}</div> : null}
                  </Card>

                  <div style={{ height: 12 }} />

                  <Card title="Personal Info" subtitle="View-only summary (company fields may be locked)">
                    <Field label="Email" value={user.email} />
                    <Field label="Phone" value={user.telephone} />
                    <Field label="Department" value={user.department} />
                    <Field label="Matricule" value={user.matricule} />
                    <Field
                      label="Hire date"
                      value={user.date_embauche ? new Date(user.date_embauche).toLocaleDateString() : undefined}
                    />
                  </Card>
                </>
              )}

              {tab === "activity" && (
                <>
                  <Card title="Activity Timeline" subtitle="Recent profile & account events">
                    <div style={L.timeline}>
                      {timelineItems.map((it, idx) => (
                        <div key={idx} style={L.timeItem}>
                          <div style={L.dot} />
                          <div>
                            <div style={L.timeTitle}>{it.title}</div>
                            <div style={L.timeSub}>{it.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div style={{ height: 12 }} />

                  <Card title="System Status" subtitle="Live status overview">
                    <Field label="Presence" value={user.en_ligne ? "Online (active session)" : "Offline"} />
                    <Field label="Role" value={safeUpper(user.role as any)} />
                    <Field label="Department" value={user.department} />
                    {"emailVerified" in (user as any) ? (
                      <Field label="Email verified" value={String((user as any).emailVerified)} />
                    ) : null}
                    {createdAt && <Field label="Created at" value={createdAt} />}
                    {updatedAt && <Field label="Updated at" value={updatedAt} />}
                  </Card>
                </>
              )}

              {tab === "security" && (
                <>
                  <Card title="Change Password" subtitle="Secure your account">
                    <div style={S.actionsCol}>
                      <Input
                        label="Current password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        type="password"
                        placeholder="••••••••"
                      />
                      <Input
                        label="New password"
                        value={newPassword}
                        onChange={setNewPassword}
                        type="password"
                        placeholder="At least 6 characters"
                      />
                      <Input
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        type="password"
                        placeholder="Repeat new password"
                      />

                      <Button variant="primary" onClick={onChangePassword} disabled={savingPwd}>
                        {savingPwd ? "Updating..." : "Update password"}
                      </Button>
                    </div>

                    {error ? <div style={{ ...S.errorText, marginTop: 10 }}>{error}</div> : null}
                  </Card>

                  <div style={{ height: 12 }} />

                  <Card title="Account & Security" subtitle="System flags and metadata">
                    <Field label="User ID" value={<span style={S.mono}>{user._id}</span>} />
                    {"status" in (user as any) && <Field label="Status" value={(user as any).status} />}
                    {"isActive" in (user as any) && <Field label="isActive" value={String((user as any).isActive)} />}
                    {createdAt && <Field label="Created at" value={createdAt} />}
                    {updatedAt && <Field label="Updated at" value={updatedAt} />}
                  </Card>
                </>
              )}

              {tab === "hr" && canEditSensitive && (
                <>
                  <Card
                    title="HR Controls"
                    subtitle="Company-owned fields (HR only)"
                    right={<Pill text="Restricted" tone="neutral" />}
                  >
                    <div style={L.warnBox}>
                      <div style={{ fontWeight: 950 }}>Company-owned fields</div>
                      <div style={{ fontSize: 13, fontWeight: 850, color: "#475569" }}>
                        These changes affect role, department, IDs and hire dates. Only HR should edit them.
                      </div>
                    </div>

                    <div style={{ height: 12 }} />

                    {!isEditingHr ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <Field label="Full name" value={editName || user.name} />
                        <Field label="Email" value={editEmail || user.email} />
                        <Field label="Department" value={editDepartment || user.department} />
                        <Field label="Matricule" value={editMatricule || user.matricule} />
                        <Field
                          label="Hire date"
                          value={
                            editHireDate
                              ? new Date(editHireDate).toLocaleDateString()
                              : user.date_embauche
                              ? new Date(user.date_embauche).toLocaleDateString()
                              : "—"
                          }
                        />
                        <Field label="Role" value={safeUpper(editRole as any) || safeUpper(user.role as any)} />
                        <Field label="Status" value={editStatus || (user as any).status} />
                        <Field label="isActive" value={String(editIsActive)} />

                        <Button variant="primary" onClick={() => setIsEditingHr(true)}>
                          Edit HR fields
                        </Button>
                      </div>
                    ) : (
                      <div style={S.actionsCol}>
                        <Input label="Full name" value={editName} onChange={setEditName} placeholder="Name" />

                        <Input
                          label="Email"
                          value={editEmail}
                          onChange={setEditEmail}
                          placeholder="email@company.com"
                          disabled={!canEditEmail}
                          hint={!canEditEmail ? "Email editing restricted" : undefined}
                        />

                        <Input
                          label="Department"
                          value={editDepartment}
                          onChange={setEditDepartment}
                          placeholder="Department"
                        />
                        <Input
                          label="Matricule"
                          value={editMatricule}
                          onChange={setEditMatricule}
                          placeholder="EMP-0001"
                        />

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Hire date</div>
                          <input
                            type="date"
                            value={editHireDate}
                            onChange={(e) => setEditHireDate(e.target.value)}
                            style={{
                              padding: "11px 12px",
                              borderRadius: 12,
                              border: "1px solid #e6ebf1",
                              background: "#fff",
                              color: "#0f172a",
                              fontWeight: 800,
                              outline: "none",
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Role</div>
                          <select
                            value={safeUpper(editRole as any)}
                            onChange={(e) => setEditRole(safeUpper(e.target.value) as Role)}
                            style={{
                              padding: "11px 12px",
                              borderRadius: 12,
                              border: "1px solid #e6ebf1",
                              background: "#fff",
                              color: "#0f172a",
                              fontWeight: 800,
                              outline: "none",
                            }}
                          >
                            <option value="EMPLOYEE">EMPLOYEE</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="HR">HR</option>
                          </select>
                        </div>

                        <Input
                          label="Status (optional)"
                          value={editStatus}
                          onChange={setEditStatus}
                          placeholder="ACTIVE / ... "
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                          <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                            style={{ width: 16, height: 16 }}
                          />
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>isActive</div>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <Button variant="primary" onClick={onSaveHr} disabled={savingHr}>
                            {savingHr ? "Saving..." : "Save HR changes"}
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditingHr(false)} disabled={savingHr}>
                            Cancel
                          </Button>
                        </div>

                        <div style={S.mutedSmall}>
                          This updates company-owned fields. Regular employees should not edit these.
                        </div>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>

            {/* RIGHT */}
            <div style={S.col}>
              {/* Overview right side = Personal edit panel (view/edit modes) */}
              {tab === "overview" && (
                <Card
                  title="Profile Settings"
                  subtitle={isEditingBasics ? "Edit your personal settings" : "Your editable settings (view mode)"}
                  right={<Pill text={canEditSensitive ? "HR: Full access" : "Limited access"} tone="neutral" />}
                >
                  {!isEditingBasics ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <Field label="Avatar URL" value={(user as any)?.avatarUrl || "—"} />
                      <Field label="Phone number" value={user.telephone || "—"} />

                      <Button variant="primary" onClick={() => setIsEditingBasics(true)} disabled={!canEditSelfBasics}>
                        Edit profile
                      </Button>

                      <div style={S.mutedSmall}>
                        Note: Email, role, department, matricule, hire date are controlled by HR.
                      </div>
                    </div>
                  ) : (
                    <div style={S.actionsCol}>
                      <Input
                        label="Avatar URL"
                        value={avatarUrl}
                        onChange={setAvatarUrl}
                        placeholder="https://..."
                        disabled={!canEditSelfBasics}
                        hint="Upload feature later; for now use a public image URL."
                      />

                      <Input
                        label="Phone number"
                        value={telephone}
                        onChange={setTelephone}
                        placeholder="+216 ..."
                        disabled={!canEditSelfBasics}
                      />

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button variant="primary" onClick={onSaveBasics} disabled={!canEditSelfBasics || savingBasics}>
                          {savingBasics ? "Saving..." : "Save changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // revert to current user values
                            const uAny = user as any;
                            setAvatarUrl(uAny.avatarUrl ?? "");
                            setTelephone(user.telephone ?? "");
                            setIsEditingBasics(false);
                          }}
                          disabled={savingBasics}
                        >
                          Cancel
                        </Button>
                      </div>

                      <div style={S.mutedSmall}>
                        Note: Email, role, department, matricule, hire date are controlled by HR.
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Role Summary stays (for all roles) */}
              <div style={{ height: 12 }} />

              <Card title="Role Summary" subtitle="What you can do (based on your role)">
                {safeUpper(user.role as any) === "HR" && (
                  <ul style={S.list}>
                    <li>Manage users, roles, and departments</li>
                    <li>Review workforce analytics and skills coverage</li>
                    <li>Export reports and audit decisions</li>
                  </ul>
                )}

                {safeUpper(user.role as any) === "MANAGER" && (
                  <ul style={S.list}>
                    <li>Monitor team skills and progression</li>
                    <li>Validate recommended activities</li>
                    <li>Track gaps and plan training</li>
                  </ul>
                )}

                {safeUpper(user.role as any) === "EMPLOYEE" && (
                  <ul style={S.list}>
                    <li>View your skill profile and progress</li>
                    <li>Follow recommended learning activities</li>
                    <li>Track history and achievements</li>
                  </ul>
                )}
              </Card>

              <div style={{ height: 12 }} />

              {/* Keep simple logout area available everywhere */}
              <Card title="Session" subtitle="Account actions">
                <div style={S.actionsCol}>
                  <Button as="link" to={goBackPath} variant="outline">
                    Go to workspace
                  </Button>

                  <Button as="link" to={myProfilePath} variant="outline">
                    Open profile route
                  </Button>

                  <Button variant="outline" onClick={onCopyUserId}>
                    Copy User ID
                  </Button>

                  <Button variant="danger" onClick={onLogout}>
                    Logout
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}