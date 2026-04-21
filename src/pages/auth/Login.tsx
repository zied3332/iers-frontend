// src/pages/auth/Login.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle, verifyLoginTwoFactor } from "../../services/auth.service";
import SiteNav from "../../components/SiteNav";
import AuthFooter from "../../components/AuthFooter";
import "../../auth-pages.css";
const logoSrc = "/images/logo.png";
const logoSrc1 = "/images/logo1.png";
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
  const [otpCode, setOtpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
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
      if (!("access_token" in res)) {
        setChallengeToken(res.challengeToken);
        setOtpCode("");
        setBackupCode("");
        return;
      }

      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));

      redirectByRole(nav, res.user?.role);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await verifyLoginTwoFactor({
        challengeToken,
        code: useBackupCode ? undefined : otpCode,
        backupCode: useBackupCode ? backupCode : undefined,
      });
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setChallengeToken("");
      redirectByRole(nav, res.user?.role);
    } catch (err: any) {
      setError(err?.message || "2FA verification failed");
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

      <SiteNav />

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
       <div className="brand-icon">
<img src="/images/logo1.png" alt="IntelliHR Logo" /></div>
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

          {challengeToken ? (
            <form className="modern-auth-form" onSubmit={onVerifyTwoFactor}>
              <div className="auth-success">
                Password verified. Enter your {useBackupCode ? "backup code" : "authenticator code"} to continue.
              </div>
              {!useBackupCode ? (
                <div className="field">
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              ) : (
                <div className="field">
                  <input
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="Backup code (e.g. ABC123-DEF456)"
                    required
                  />
                </div>
              )}

              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify and sign in"}
              </button>

              <button
                type="button"
                className="text-btn"
                onClick={() => setUseBackupCode((prev) => !prev)}
              >
                {useBackupCode ? "Use authenticator code instead" : "Use backup code instead"}
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setChallengeToken("");
                  setOtpCode("");
                  setBackupCode("");
                  setUseBackupCode(false);
                }}
              >
                Back to login
              </button>
            </form>
          ) : (
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

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="google-btn"
                onClick={loginWithGoogle}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  width={10}
                  height={10}
                />
                Continue with Google
              </button>

              <p className="switch-text">
                Don't have an account?
                <Link className="text-btn-link" to="/auth/signup">Create one</Link>
              </p>

              <p className="help-text">
                Having trouble? <strong>Contact HR:</strong> hr@company.com
              </p>
            </form>
          )}
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}