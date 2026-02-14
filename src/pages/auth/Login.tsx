import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../index.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("hr@company.com");
  const [password, setPassword] = useState("demo1234");
  const [role, setRole] = useState<"hr" | "manager" | "employee">("hr");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ Fake login routing (replace later with API + token)
    if (role === "hr") nav("/hr/dashboard");
    if (role === "manager") nav("/manager/dashboard");
    if (role === "employee") nav("/employee/profile");
  }

  return (
    <div className="auth-body">
      <div className="auth-title">Sign in</div>
      <div className="auth-sub muted">Use your company account to continue.</div>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
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
          />
        </div>

        <div className="auth-row">
          <div className="auth-field" style={{ flex: 1 }}>
            <label className="auth-label">Role (demo)</label>
            <select
              className="select w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" style={{ minWidth: 140 }}>
            Sign in
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
  );
}