// src/pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/auth.service";
import "../../auth-pages.css";

const logoSrc = "/images/logo.png";

export default function ForgotPassword() {
  const heroImages = ["/images/bg1.png", "/images/bg2.png", "/images/bg3.png", "/images/bg4.png"];
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [activeIndex, setActiveIndex] = useState(2);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);

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
            Forgot your
            <span> password</span>
          </h1>
          <p>
            Enter your work email and we will send a secure reset link if your account exists.
          </p>
        </div>

        <div className="modern-auth-card">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
            <span>IntelliHR</span>
          </div>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">Please enter your account email.</p>

          {error ? <div className="auth-alert">{error}</div> : null}
          {sent ? (
            <div className="auth-success">
              An email has been sent to <strong>{email}</strong>. Check your inbox and click the link to set a new password.
            </div>
          ) : null}

          {!sent ? (
            <form className="modern-auth-form" onSubmit={onSubmit}>
              <div className="field">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Link"}
              </button>
            </form>
          ) : null}

          <p className="switch-text" style={{ marginTop: 16 }}>
            <Link className="text-btn-link" to="/auth/login">Back to login</Link>
            <span style={{ margin: "0 10px", color: "#94a3b8" }}>•</span>
            <Link className="text-btn-link" to="/auth/signup">Create account</Link>
          </p>

          <p className="help-text">
            Problem? <strong>Contact HR:</strong> hr@company.com
          </p>
        </div>
      </div>
    </div>
  );
}
