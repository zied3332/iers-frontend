import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/auth.service";
import "../../index.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser({ email, password });

      // ✅ store token + user
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));

      const role = (res.user.role || "").toLowerCase();

      // ✅ redirect based on role
      if (role === "hr") nav("/hr/dashboard");
      else if (role === "manager") nav("/manager/dashboard");
      else nav("/me/profile");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-layout auth-split-login">
      {/* Left side - 60% green gradient */}
      <div className="auth-gradient-side auth-gradient-login">
        <div className="auth-gradient-content">
          <div className="auth-gradient-logo">IntelliHR</div>
          <h1 className="auth-gradient-title">Welcome Back!</h1>
          <p className="auth-gradient-text">
            Sign in to access your dashboard, manage your team, and track your professional development.
          </p>
        </div>
      </div>

      {/* Right side - 40% form centered */}
      <div className="auth-form-side auth-form-login">
        <div className="auth-form-container">
          <div className="auth-title">Sign in</div>
          <div className="auth-sub muted">Use your company account to continue.</div>

          {error && (
            <div style={{ marginTop: 12, padding: 10, border: "1px solid #ef4444", borderRadius: 10 }}>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                type="email"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="input w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="auth-row">
              <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>

            <div className="auth-links">
              <Link className="auth-link" to="/auth/signup">Create account</Link>
              <span className="dot">•</span>
              <button type="button" className="auth-link-btn" onClick={() => alert("Later: reset flow")}>
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}