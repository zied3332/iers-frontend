import React, { useEffect, useMemo, useState } from "react";
import { getCurrentUser, type CurrentUser } from "../services/auth.service";
import { Link } from "react-router-dom";

/* =======================
   Small UI helpers
   ======================= */

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }, [name]);

  // deterministic color from email
  const hue = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
    return hash % 360;
  }, [email]);

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        fontWeight: 1000,
        color: "#0f172a",
        background: `hsl(${hue} 70% 92%)`,
        border: "1px solid rgba(15,23,42,0.08)",
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

function Pill({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "success" | "danger" }) {
  const map = {
    neutral: { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.20)", fg: "#334155" },
    success: { bg: "rgba(22,163,74,0.12)", bd: "rgba(22,163,74,0.20)", fg: "#166534" },
    danger: { bg: "rgba(239,68,68,0.10)", bd: "rgba(239,68,68,0.20)", fg: "#b91c1c" },
  }[tone];

  return (
    <span
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
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
    <div
      style={{
        background: "#fff",
        border: "1px solid #e6ebf1",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 1000, color: "#0f172a" }}>{title}</div>
          {subtitle && <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderTop: "1px solid #eef2f7",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, textAlign: "right" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function Button({
  children,
  variant = "outline",
  onClick,
  as = "button",
  to,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "danger";
  onClick?: () => void;
  as?: "button" | "link";
  to?: string;
}) {
  const base: React.CSSProperties = {
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

  const styles: Record<string, React.CSSProperties> = {
    outline: base,
    primary: {
      ...base,
      border: "1px solid rgba(31,122,90,0.20)",
      background: "rgba(31,122,90,0.10)",
      color: "#145a41",
    },
    danger: {
      ...base,
      border: "1px solid rgba(239,68,68,0.22)",
      background: "rgba(239,68,68,0.08)",
      color: "#b91c1c",
    },
  };

  if (as === "link" && to) {
    return (
      <Link to={to} style={styles[variant]}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" style={styles[variant]} onClick={onClick}>
      {children}
    </button>
  );
}

/* =======================
   Profile Page
   ======================= */

export default function Profile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await getCurrentUser();
        if (cancelled) return;
        setUser(me);
        setStatus("ready");
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

  const goBackPath = useMemo(() => {
    // ✅ Adjust these paths to your real dashboards if needed
    if (user?.role === "hr") return "/hr/dashboard";
    if (user?.role === "manager") return "/manager";
    return "/employee";
  }, [user?.role]);

  const onlineTone = user?.en_ligne ? "success" : "neutral";
  const onlineLabel = user?.en_ligne ? "Online" : "Offline";

  const createdAt = (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleString() : undefined;
  const updatedAt = (user as any)?.updatedAt ? new Date((user as any).updatedAt).toLocaleString() : undefined;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied!");
    } catch {
      setToast("Copy failed");
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 1080, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 1100, color: "#0f172a" }}>My Profile</div>
          <div style={{ color: "#64748b", marginTop: 4 }}>
            View your account, identity, and platform status.
          </div>

          {toast && (
            <div style={{ marginTop: 10 }}>
              <Pill text={toast} tone="success" />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={goBackPath} style={topBtn}>
            ← Back
          </Link>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {status === "loading" && (
        <Card title="Loading" subtitle="Fetching your profile...">
          <div style={{ color: "#64748b" }}>Please wait a moment.</div>
        </Card>
      )}

      {status === "error" && (
        <Card title="Error" subtitle="We couldn't load your profile">
          <div style={{ color: "#ef4444", fontWeight: 900 }}>{error}</div>
          <div style={{ color: "#64748b", marginTop: 8 }}>
            If this keeps happening, your token might be expired.
          </div>
        </Card>
      )}

      {status === "ready" && user && (
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 14 }}>
          {/* LEFT COLUMN */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Identity */}
            <Card
              title="Identity"
              subtitle="Primary account information"
              right={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Pill text={user.role.toUpperCase()} />
                  <Pill text={onlineLabel} tone={onlineTone as any} />
                </div>
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={user.name} email={user.email} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 1100, color: "#0f172a" }}>{user.name}</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={miniTag} onClick={() => copy(user.email)} title="Click to copy">
                      ✉ {user.email}
                    </span>
                    {user.matricule && (
                      <span style={miniTag} onClick={() => copy(user.matricule!)} title="Click to copy">
                        🆔 {user.matricule}
                      </span>
                    )}
                    {user.telephone && (
                      <span style={miniTag} onClick={() => copy(user.telephone!)} title="Click to copy">
                        📞 {user.telephone}
                      </span>
                    )}
                  </div>

                  <div style={{ color: "#64748b", marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                    Keep your identity info accurate for smoother internal communication and HR processes.
                  </div>
                </div>
              </div>

              <Field label="Department" value={user.department} />
              <Field
                label="Hire date"
                value={user.date_embauche ? new Date(user.date_embauche).toLocaleDateString() : undefined}
              />
              <Field
                label="Last login"
                value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : undefined}
              />
            </Card>

            {/* Account Metadata */}
            <Card title="Account & Security" subtitle="System flags and metadata">
              <Field label="User ID" value={<span style={mono}>{user._id}</span>} />
              {"status" in (user as any) && <Field label="Status" value={(user as any).status} />}
              {"isActive" in (user as any) && <Field label="isActive" value={String((user as any).isActive)} />}
              {"emailVerified" in (user as any) && (
                <Field label="Email verified" value={String((user as any).emailVerified)} />
              )}
              {createdAt && <Field label="Created at" value={createdAt} />}
              {updatedAt && <Field label="Updated at" value={updatedAt} />}
            </Card>

            {/* Role-specific block (simple for now) */}
            <Card
              title="Role Summary"
              subtitle="What you can do in IntelliHR (based on your role)"
            >
              {user.role === "hr" && (
                <ul style={list}>
                  <li>Manage users, roles, and departments</li>
                  <li>Review workforce analytics and skills coverage</li>
                  <li>Export reports and audit decisions</li>
                </ul>
              )}

              {user.role === "manager" && (
                <ul style={list}>
                  <li>Monitor team skills and progression</li>
                  <li>Validate recommended activities</li>
                  <li>Track gaps and plan training</li>
                </ul>
              )}

              {user.role === "employee" && (
                <ul style={list}>
                  <li>View your skill profile and progress</li>
                  <li>Follow recommended learning activities</li>
                  <li>Track history and achievements</li>
                </ul>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "grid", gap: 14 }}>
            <Card title="Quick Actions" subtitle="Common actions">
              <Button as="link" to={goBackPath} variant="primary">
                Go to workspace
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  copy(user._id);
                }}
              >
                Copy User ID
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/auth/signin";
                }}
              >
                Logout
              </Button>

              <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                Next upgrades: edit profile, upload avatar, change password, notification preferences.
              </div>
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

const topBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e6ebf1",
  background: "#fff",
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 900,
};

const miniTag: React.CSSProperties = {
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
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 12,
  color: "#0f172a",
  fontWeight: 900,
};

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.7,
};