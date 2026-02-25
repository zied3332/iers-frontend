// src/pages/auth/Login.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/auth.service";
import "../../auth-pages.css";

// ✅ same image used in Signup
import authBg from "../../assets/logbackimg.png";

function redirectByRole(nav: ReturnType<typeof useNavigate>, roleRaw: unknown) {
  const role = String(roleRaw || "").toLowerCase();

  if (role === "hr") nav("/hr/dashboard", { replace: true });
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="auth-split">
      {/* LEFT */}
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

          <h1 className="auth-hero-title">Welcome back</h1>
          <p className="auth-hero-sub">
            Sign in to access your dashboard, manage your team, and track your professional development.
          </p>

          <div className="auth-bullets">
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Secure internal access
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Workforce intelligence
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Performance & skill tracking
            </div>
          </div>

          <div className="auth-left-foot">© {new Date().getFullYear()} IntelliHR</div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>

          <div className="auth-title">Sign in</div>
          <div className="auth-sub">Use your company account to continue.</div>

          {/* ✅ session switch */}
          {tokenNow ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="auth-btn"
                onClick={() => {
                  clearSession();
                  setEmail("");
                  setPassword("");
                  setError("");
                }}
              >
                Use another account
              </button>
            </div>
          ) : null}

          {error ? <div className="auth-alert">{error}</div> : null}

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

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="auth-links">
              <Link className="auth-link" to="/auth/signup">
                Create account
              </Link>
              <span className="auth-muted">•</span>
              <button
                type="button"
                className="auth-link"
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => alert("Later: reset flow")}
              >
                Forgot password?
              </button>
            </div>

            <div className="auth-help">
              Having trouble? <b>Contact HR:</b> hr@company.com
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}