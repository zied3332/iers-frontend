// src/pages/auth/ResetPassword.tsx
// Page used when the user clicks the link received by email (token in the URL).
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/auth.service";
import "../../auth-pages.css";

const logoSrc = "/images/logo.png";

export default function ResetPassword() {
  const heroImages = ["/images/bg1.png", "/images/bg2.png", "/images/bg3.png", "/images/bg4.png"];
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(3);

  useEffect(() => {
    if (!token.trim()) setError("Invalid or expired link. Request a new link.");
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);

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
    <div className="auth-hero-shell">
      {heroImages.map((img, index) => (
        <div
          key={img}
          className={`auth-bg-layer ${index === activeIndex ? "active" : ""}`}
          style={{ backgroundImage: `url(${img})` }}
        />
      ))}
      <div className="auth-overlay" />

      <nav className="auth-top-nav">
        <div className="auth-logo-wrap">
          <img className="auth-logo-img" src={logoSrc} alt="IntelliHR logo" />
          <div className="auth-logo-text">IntelliHR</div>
        </div>
        <div className="auth-nav-links">
          <a href="#">Who we are</a>
          <a href="#">Services</a>
          <a href="#">Case studies</a>
          <a href="#">Blog</a>
        </div>
        <a href="#" className="auth-nav-btn">Get in touch</a>
      </nav>

      <div className="auth-hero-content">
        <div className="auth-hero-copy">
          <h1>
            Set a new
            <span> password</span>
          </h1>
          <p>
            Choose a strong password to secure your account and continue using your workspace.
          </p>
        </div>

        <div className="modern-auth-card">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
            <span>IntelliHR</span>
          </div>
          <h2>Set New Password</h2>
          <p className="auth-subtitle">
            {token ? "Enter and confirm your new password." : "Use the link you received by email."}
          </p>

          {error ? <div className="auth-alert">{error}</div> : null}
          {done ? (
            <div className="auth-success">
              Password updated. Redirecting to login page...
            </div>
          ) : token ? (
            <form className="modern-auth-form" onSubmit={onSubmit}>
              <div className="field">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="field">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Reset Password"}
              </button>
            </form>
          ) : null}

          <p className="switch-text" style={{ marginTop: 16 }}>
            <Link className="text-btn-link" to="/auth/login">Back to login</Link>
            <span style={{ margin: "0 10px", color: "#94a3b8" }}>•</span>
            <Link className="text-btn-link" to="/auth/forgot-password">Resend link</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
