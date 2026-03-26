// src/pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/auth.service";
import "../../auth-pages.css";
import authBg from "../../assets/logbackimg.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSent(false);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Une erreur est survenue.";
      const isBackendMissing =
        typeof raw === "string" &&
        (raw.includes("Cannot POST") || raw.includes("404") || raw.includes("Not Found"));
      const message = isBackendMissing
        ? "This feature is not yet available on the server. Contact HR to reset your password: hr@company.com"
        : raw;
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
          <h1 className="auth-hero-title">Forgot Password</h1>
          <p className="auth-hero-sub">
            Enter your work email address. If an account exists, you will receive a link to reset your password.
          </p>
          <div className="auth-bullets">
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Secure email link
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Link valid for 1 hour
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> No password sent in plain text
            </div>
          </div>
          <div className="auth-left-foot">© {new Date().getFullYear()} IntelliHR</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>
          <div className="auth-title">Reset Password</div>
          <div className="auth-sub">Please enter your account email.</div>

          {error ? <div className="auth-alert">{error}</div> : null}
          {sent ? (
            <div className="auth-success">
              An email has been sent to <strong>{email}</strong>. Check your inbox and click the link to set a new password.
            </div>
          ) : null}

          {!sent && (
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Link"}
              </button>
            </form>
          )}

          <div className="auth-links" style={{ marginTop: 20 }}>
            <Link className="auth-link" to="/auth/login">
              Back to login
            </Link>
            <span className="auth-muted">•</span>
            <Link className="auth-link" to="/auth/signup">
              Create account
            </Link>
          </div>
          <div className="auth-help">
            Problem? <b>Contact HR:</b> hr@company.com
          </div>
        </div>
      </div>
    </div>
  );
}
