// src/pages/auth/Login.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/auth.service";
import "../../auth-pages.css";

const logoSrc = "/images/logo.png";

function redirectByRole(nav: ReturnType<typeof useNavigate>, roleRaw: unknown) {
  const role = String(roleRaw || "").toLowerCase().replace(/\s+/g, "_");

  if (role === "super_manager" || role === "super_manger") nav("/super-manager/dashboard", { replace: true });
  else if (role === "hr") nav("/hr/dashboard", { replace: true });
  else if (role === "manager") nav("/manager/dashboard", { replace: true });
  else nav("/me/profile", { replace: true });
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const heroImages = ["/images/bg1.png", "/images/bg2.png", "/images/bg3.png", "/images/bg4.png"];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ If already authenticated, redirect away from login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      redirectByRole(nav, user?.role);
    } catch {
      localStorage.removeItem("user");
    }
  }, [nav]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser({ email, password });

      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));

      redirectByRole(nav, res.user?.role);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const tokenNow = localStorage.getItem("token");

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
            Welcome back to your
            <span> workspace</span>
          </h1>
          <p>
            Manage employees, skills, activities, and HR operations in one powerful system.
          </p>
        </div>

        <div className="modern-auth-card">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
            <span>IntelliHR</span>
          </div>
          <h2>Let's login</h2>
          <p className="auth-subtitle">Access your HR workspace securely.</p>

          {tokenNow ? (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                clearSession();
                setEmail("");
                setPassword("");
                setError("");
              }}
            >
              Use another account
            </button>
          ) : null}

          {error ? <div className="auth-alert">{error}</div> : null}

          <form className="modern-auth-form" onSubmit={onSubmit}>
            <div className="field">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="form-options">
              <span className="auth-muted">Secure login</span>
              <Link to="/auth/forgot-password">Forgot password?</Link>
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="switch-text">
              Don't have an account?
              <Link className="text-btn-link" to="/auth/signup">Create one</Link>
            </p>

            <p className="help-text">
              Having trouble? <strong>Contact HR:</strong> hr@company.com
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}