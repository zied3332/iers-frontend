import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, requestPasswordReset } from "../../services/auth.service";
import { changeMyPassword } from "../profile/profile.api";

function roleBaseFromPath(pathname: string): "hr" | "super-manager" | "manager" | "me" {
  const first = String(pathname.split("/")[1] || "").toLowerCase();
  if (first === "hr") return "hr";
  if (first === "super-manager") return "super-manager";
  if (first === "manager") return "manager";
  return "me";
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roleBase = useMemo(() => roleBaseFromPath(location.pathname), [location.pathname]);
  const settingsPath = `/${roleBase}/settings`;

  const [email, setEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetCurrentPassword, setResetCurrentPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingEmail(true);
    getCurrentUser()
      .then((u) => {
        if (!active) return;
        setEmail(String(u?.email || ""));
      })
      .catch(() => {
        if (!active) return;
        setEmail("");
      })
      .finally(() => {
        if (!active) return;
        setLoadingEmail(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onChangePassword = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const onSendResetLink = async () => {
    setError("");
    setSuccess("");

    if (!resetCurrentPassword.trim()) {
      setError("Enter your current password before sending a reset link.");
      return;
    }
    if (!email) {
      setError("No account email available.");
      return;
    }

    setSendingReset(true);
    try {
      const res = await requestPasswordReset(email);
      setSuccess(
        String(
          res?.message || "If this email is registered, a reset link has been sent.",
        ),
      );
      setResetCurrentPassword("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reset link.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 16 }}>
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Change password</h1>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Use one of the secure options below to update your password.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(settingsPath)}>
            Back to settings
          </button>
        </div>

        {success ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--primary-border)", background: "var(--primary-weak)", color: "var(--primary-soft-text)", fontWeight: 700 }}>
            {success}
          </div>
        ) : null}
        {error ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        <section className="card section-card" style={{ padding: 20 }}>
          <div className="section-title">Option 1 - Change now with your current password</div>
          <p className="muted" style={{ marginTop: 8 }}>
            Enter your old password, then your new password twice for confirmation.
          </p>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              maxWidth: 520,
            }}
          >
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => void onChangePassword()} disabled={saving || sendingReset}>
              {saving ? "Changing..." : "Change password"}
            </button>
          </div>
        </section>

        <section className="card section-card" style={{ padding: 20 }}>
          <div className="section-title">Option 2 - Send reset link</div>
          <p className="muted" style={{ marginTop: 8 }}>
            For security, enter your current password before requesting a reset link.
          </p>
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            {loadingEmail ? "Loading account email..." : email || "No email found"}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 10,
              alignItems: "start",
              maxWidth: 520,
            }}
          >
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={resetCurrentPassword}
              onChange={(e) => setResetCurrentPassword(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => void onSendResetLink()}
              disabled={sendingReset || saving || loadingEmail || !email}
            >
              {sendingReset ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
