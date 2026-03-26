// src/pages/auth/ResetPassword.tsx
// Page used when the user clicks the link received by email (token in the URL).
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/auth.service";
import "../../auth-pages.css";
import authBg from "../../assets/logbackimg.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token.trim()) setError("Invalid or expired link. Request a new link.");
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => nav("/auth/login", { replace: true }), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <div
        className="auth-left"
        style={{
          backgroundImage: `
            linear-gradient(rgba(12, 79, 61, 0.85), rgba(12, 79, 61, 0.85)),
            url(${authBg})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="auth-left-inner">
          <div className="auth-brand-mark">IntelliHR</div>
          <h1 className="auth-hero-title">New Password</h1>
          <p className="auth-hero-sub">
            Choose a secure password to access your account.
          </p>
          <div className="auth-left-foot">© {new Date().getFullYear()} IntelliHR</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>
          <div className="auth-title">Set New Password</div>
          <div className="auth-sub">
            {token ? "Enter and confirm your new password." : "Use the link you received by email."}
          </div>

          {error ? <div className="auth-alert">{error}</div> : null}
          {done ? (
            <div className="auth-success">
              Password updated. Redirecting to login page…
            </div>
          ) : token ? (
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="auth-field">
                <label className="auth-label">New Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Reset Password"}
              </button>
            </form>
          ) : null}

          <div className="auth-links" style={{ marginTop: 20 }}>
            <Link className="auth-link" to="/auth/login">
              Back to login
            </Link>
            <span className="auth-muted">•</span>
            <Link className="auth-link" to="/auth/forgot-password">
              Resend link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
