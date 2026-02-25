// src/pages/Profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, type CurrentUser, type Role } from "../../services/auth.service";
import { signOut } from "../../utils/auth";

/* =========================================================
   Role privileges (simple + realistic)
   =========================================================
   Employee + Manager can edit:
   - avatarUrl
   - telephone
   - password (via /auth/change-password)

   HR can edit everything:
   - name, email, department, matricule, date_embauche, role
   - plus avatarUrl, telephone
   ========================================================= */

/* =======================
   Small UI helpers
   ======================= */

type Tone = "neutral" | "success" | "danger";
type BtnVariant = "primary" | "outline" | "danger";
type PageStatus = "loading" | "ready" | "error";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const txt = await res.text();
    try {
      const j = JSON.parse(txt);
      throw new Error(Array.isArray(j.message) ? j.message.join(", ") : j.message);
    } catch {
      throw new Error(txt || "Request failed");
    }
  }
  return res.json();
}

function Avatar({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
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
          width: 56,
          height: 56,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid rgba(15,23,42,0.10)",
        }}
        onError={(e) => {
          // if broken image, fallback to initials
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div style={{ ...S.avatar, background: `hsl(${hue} 70% 92%)` }} title={name}>
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
  const style = disabled ? { ...BTN_STYLES[variant], opacity: 0.6, pointerEvents: "none" as const } : BTN_STYLES[variant];

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
   API calls (Frontend)
   ======================= */

async function patchMe(payload: { telephone?: string; avatarUrl?: string }) {
  const res = await fetch(`${BASE}/users/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

async function patchUserById(userId: string, payload: any) {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

async function changeMyPassword(payload: { currentPassword: string; newPassword: string }) {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/* =======================
   Profile Page
   ======================= */

export default function Profile() {
  const nav = useNavigate();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Edit states
  const [savingBasics, setSavingBasics] = useState(false);
  const [savingHr, setSavingHr] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // form fields (self)
  const [avatarUrl, setAvatarUrl] = useState("");
  const [telephone, setTelephone] = useState("");

  // form fields (hr sensitive)
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editMatricule, setEditMatricule] = useState("");
  const [editHireDate, setEditHireDate] = useState(""); // yyyy-mm-dd
  const [editRole, setEditRole] = useState<Role>("EMPLOYEE");
  const [editStatus, setEditStatus] = useState(""); // optional
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // -------- data loading
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await getCurrentUser();
        if (cancelled) return;

        setUser(me);
        setStatus("ready");

        // init form from user
        const uAny = me as any;
        setAvatarUrl(uAny.avatarUrl ?? "");
        setTelephone(me.telephone ?? "");

        // hr fields (pre-fill)
        setEditName(me.name ?? "");
        setEditEmail(me.email ?? "");
        setEditDepartment(me.department ?? "");
        setEditMatricule(me.matricule ?? "");
        setEditRole((me.role as Role) ?? "employee");
        setEditStatus((uAny.status ?? "") as string);
        setEditIsActive(Boolean(uAny.isActive ?? true));

        // hire date -> yyyy-mm-dd for input[type=date]
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

  // -------- toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // -------- privileges
  const canEditSensitive = user?.role === "HR";
  const canEditSelfBasics = Boolean(user); // everyone (employee/manager/hr)
  const canEditEmail = user?.role === "HR"; // strict

  // -------- computed routing (role-aware)
  const goBackPath = useMemo(() => {
    if (user?.role === "HR") return "/hr/dashboard";
    if (user?.role === "MANAGER") return "/manager/dashboard";
    return "/me/profile"; // or "/me/activities"
  }, [user?.role]);

  const myProfilePath = useMemo(() => {
    if (user?.role === "HR") return "/hr/profile";
    if (user?.role === "MANAGER") return "/manager/profile";
    return "/me/profile";
  }, [user?.role]);

  // -------- status labels
  const onlineTone: Tone = user?.en_ligne ? "success" : "neutral";
  const onlineLabel = user?.en_ligne ? "Online" : "Offline";

  // -------- derived dates (guarded)
  const createdAt = useMemo(() => {
    const raw = (user as any)?.createdAt;
    return raw ? new Date(raw).toLocaleString() : undefined;
  }, [user]);

  const updatedAt = useMemo(() => {
    const raw = (user as any)?.updatedAt;
    return raw ? new Date(raw).toLocaleString() : undefined;
  }, [user]);

  // -------- actions
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

  const onSaveBasics = useCallback(async () => {
    if (!user) return;
    if (!canEditSelfBasics) return;

    setSavingBasics(true);
    setError("");
    try {
      // ✅ call backend: PATCH /users/me
      const updated = await patchMe({
        telephone: telephone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      // merge into local user
      const next = { ...user, telephone: telephone.trim() || undefined } as any;
      next.avatarUrl = avatarUrl.trim() || undefined;

      setUser(next);
      setToast("Saved!");
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
      // ✅ call backend: PATCH /users/:id (HR only)
      const payload: any = {
        name: editName.trim() || undefined,
        department: editDepartment.trim() || undefined,
        matricule: editMatricule.trim() || undefined,
        date_embauche: editHireDate ? new Date(editHireDate).toISOString() : undefined,
        role: editRole,
        status: editStatus.trim() || undefined,
        isActive: editIsActive,
      };

      if (canEditEmail) payload.email = editEmail.trim() || undefined;

      await patchUserById(user._id, payload);

      // update local user
      const next: any = {
        ...user,
        name: editName.trim() || user.name,
        email: canEditEmail ? (editEmail.trim() || user.email) : user.email,
        department: editDepartment.trim() || undefined,
        matricule: editMatricule.trim() || undefined,
        date_embauche: editHireDate ? new Date(editHireDate).toISOString() : undefined,
        role: editRole,
      };
      next.status = editStatus.trim() || (user as any).status;
      next.isActive = editIsActive;

      setUser(next);
      setToast("HR changes saved!");
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
      // ✅ call backend: POST /auth/change-password
      await changeMyPassword({ currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
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

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <div style={S.h1}>My Profile</div>
          <div style={S.hSubtitle}>View your account, identity, and platform status.</div>

          {toast && (
            <div style={{ marginTop: 10 }}>
              <Pill text={toast} tone="success" />
            </div>
          )}
        </div>

        <div style={S.headerRight}>
          
        </div>
      </header>

      <div style={{ height: 14 }} />

      {/* States */}
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
        <div style={S.grid}>
          {/* LEFT COLUMN */}
          <div style={S.col}>
            {/* Identity (read-only) */}
            <Card
              title="Identity"
              subtitle="Primary account information"
              right={
                <div style={S.pillsRow}>
                  <Pill text={user.role.toUpperCase()} />
                  <Pill text={onlineLabel} tone={onlineTone} />
                </div>
              }
            >
              <div style={S.identityRow}>
                <Avatar name={user.name} email={user.email} avatarUrl={(user as any)?.avatarUrl} />

                <div style={S.identityMain}>
                  <div style={S.name}>{user.name}</div>

                  <div style={S.miniTagsRow}>
                    <span style={S.miniTag} onClick={() => copy(user.email)} title="Click to copy">
                      ✉ {user.email}
                    </span>

                    {user.matricule && (
                      <span style={S.miniTag} onClick={() => copy(user.matricule!)} title="Click to copy">
                        🆔 {user.matricule}
                      </span>
                    )}

                    {user.telephone && (
                      <span style={S.miniTag} onClick={() => copy(user.telephone!)} title="Click to copy">
                        📞 {user.telephone}
                      </span>
                    )}
                  </div>

                  <div style={S.helperText}>
                    Company-owned fields (role, department, matricule, hire date) are controlled by HR.
                  </div>
                </div>
              </div>

              <Field label="Department" value={user.department} />
              <Field
                label="Hire date"
                value={user.date_embauche ? new Date(user.date_embauche).toLocaleDateString() : undefined}
              />
              <Field label="Last login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : undefined} />
            </Card>

            {/* Account Metadata */}
            <Card title="Account & Security" subtitle="System flags and metadata">
              <Field label="User ID" value={<span style={S.mono}>{user._id}</span>} />
              {"status" in (user as any) && <Field label="Status" value={(user as any).status} />}
              {"isActive" in (user as any) && <Field label="isActive" value={String((user as any).isActive)} />}
              {"emailVerified" in (user as any) && (
                <Field label="Email verified" value={String((user as any).emailVerified)} />
              )}
              {createdAt && <Field label="Created at" value={createdAt} />}
              {updatedAt && <Field label="Updated at" value={updatedAt} />}
            </Card>

            {/* Role-specific block */}
            <Card title="Role Summary" subtitle="What you can do in IntelliHR (based on your role)">
              {user.role === "HR" && (
                <ul style={S.list}>
                  <li>Manage users, roles, and departments</li>
                  <li>Review workforce analytics and skills coverage</li>
                  <li>Export reports and audit decisions</li>
                </ul>
              )}

              {user.role === "MANAGER" && (
                <ul style={S.list}>
                  <li>Monitor team skills and progression</li>
                  <li>Validate recommended activities</li>
                  <li>Track gaps and plan training</li>
                </ul>
              )}

              {user.role === "EMPLOYEE" && (
                <ul style={S.list}>
                  <li>View your skill profile and progress</li>
                  <li>Follow recommended learning activities</li>
                  <li>Track history and achievements</li>
                </ul>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={S.col}>
            {/* Editable (self) */}
            <Card
              title="Edit My Profile"
              subtitle="Personal settings you can update"
              right={<Pill text={canEditSensitive ? "HR: Full access" : "Limited access"} tone="neutral" />}
            >
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

                <Button variant="primary" onClick={onSaveBasics} disabled={!canEditSelfBasics || savingBasics}>
                  {savingBasics ? "Saving..." : "Save changes"}
                </Button>

                <div style={S.mutedSmall}>
                  Note: Email, role, department, matricule, hire date are controlled by HR.
                </div>
              </div>
            </Card>

            {/* Change password */}
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
            </Card>

            {/* HR-only: edit sensitive fields */}
            {canEditSensitive ? (
              <Card title="HR Controls" subtitle="Company-owned fields (HR only)">
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

                  <Input label="Department" value={editDepartment} onChange={setEditDepartment} placeholder="Department" />
                  <Input label="Matricule" value={editMatricule} onChange={setEditMatricule} placeholder="EMP-0001" />

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
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
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
                      <option value="employee">employee</option>
                      <option value="manager">manager</option>
                      <option value="hr">hr</option>
                    </select>
                  </div>

                  <Input label="Status (optional)" value={editStatus} onChange={setEditStatus} placeholder="ACTIVE / ... " />

                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>isActive</div>
                  </div>

                  <Button variant="primary" onClick={onSaveHr} disabled={savingHr}>
                    {savingHr ? "Saving..." : "Save HR changes"}
                  </Button>

                  <div style={S.mutedSmall}>
                    This updates company-owned fields. Regular employees should not edit these.
                  </div>
                </div>
              </Card>
            ) : null}

            {/* Quick Actions */}
            <Card title="Quick Actions" subtitle="Common actions">
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

              {error ? <div style={{ ...S.errorText, marginTop: 10 }}>{error}</div> : null}
            </Card>

            <Card title="System Status" subtitle="Live status overview">
              <Field label="Presence" value={user.en_ligne ? "Online (active session)" : "Offline"} />
              <Field label="Role" value={user.role.toUpperCase()} />
              <Field label="Department" value={user.department} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   Styles
   ======================= */

const PILL_TONES: Record<Tone, { bg: string; bd: string; fg: string }> = {
  neutral: { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.20)", fg: "#334155" },
  success: { bg: "rgba(22,163,74,0.12)", bd: "rgba(22,163,74,0.20)", fg: "#166534" },
  danger: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#b91c1c" },
};

const BTN_BASE: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  fontWeight: 1000,
  cursor: "pointer",
  border: "1px solid #e6ebf1",
  background: "#fff",
  color: "#0f172a",
  textDecoration: "none",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  outline: BTN_BASE,
  primary: {
    ...BTN_BASE,
    border: "1px solid rgba(31,122,90,0.20)",
    background: "rgba(31,122,90,0.10)",
    color: "#145a41",
  },
  danger: {
    ...BTN_BASE,
    border: "1px solid rgba(239,68,68,0.22)",
    background: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
  },
};

const S: Record<string, React.CSSProperties> = {
  page: { padding: 18, maxWidth: 1080, margin: "0 auto" },

  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerRight: { display: "flex", gap: 10, flexWrap: "wrap" },

  h1: { fontSize: 24, fontWeight: 1100, color: "#0f172a" },
  hSubtitle: { color: "#64748b", marginTop: 4 },

  topBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e6ebf1",
    background: "#fff",
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 900,
  },

  grid: { display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 14 },
  col: { display: "grid", gap: 14 },

  card: {
    background: "#fff",
    border: "1px solid #e6ebf1",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
  },
  cardHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: 1000, color: "#0f172a" },
  cardSubtitle: { marginTop: 4, fontSize: 13, color: "#64748b" },
  cardBody: { marginTop: 12 },

  pillsRow: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },

  identityRow: { display: "flex", alignItems: "center", gap: 14 },
  identityMain: { flex: 1, minWidth: 0 },

  name: { fontSize: 18, fontWeight: 1100, color: "#0f172a" },
  miniTagsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 },

  miniTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(248,250,252,0.7)",
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    cursor: "pointer",
    maxWidth: "100%",
  },

  helperText: { color: "#64748b", marginTop: 8, fontSize: 13, lineHeight: 1.6 },

  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid #eef2f7",
  },
  fieldLabel: { color: "#64748b", fontSize: 13, fontWeight: 800 },
  fieldValue: { color: "#0f172a", fontSize: 13, fontWeight: 900, textAlign: "right" },

  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 900,
  },

  list: { margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13, lineHeight: 1.7 },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    color: "#0f172a",
    border: "1px solid rgba(15,23,42,0.08)",
  },

  pill: {
    padding: "7px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },

  actionsCol: { display: "grid", gap: 10 },
  actionsHint: { marginTop: 10, color: "#64748b", fontSize: 13, lineHeight: 1.6 },

  muted: { color: "#64748b" },
  mutedSmall: { color: "#64748b", fontSize: 12, lineHeight: 1.5 },

  errorText: { color: "#ef4444", fontWeight: 900 },
};