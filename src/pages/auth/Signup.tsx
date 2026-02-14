import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../index.css";

export default function Signup() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("Adam Taylor");
  const [email, setEmail] = useState("adam.taylor@company.com");
  const [dept, setDept] = useState("Engineering");
  const [password, setPassword] = useState("demo1234");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ✅ Fake signup -> go login
    nav("/auth/login");
  }

  return (
    <div className="auth-body">
      <div className="auth-title">Create account</div>
      <div className="auth-sub muted">Internal access only (company users).</div>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-grid2">
          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <input
              className="input w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Department</label>
            <input
              className="input w-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="Engineering"
            />
          </div>
        </div>

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
            placeholder="Create a password"
          />
        </div>

        <div className="auth-row">
          <button className="btn btn-primary w-full" type="submit">
            Create account
          </button>
        </div>

        <div className="auth-links">
          <span className="muted">Already have an account?</span>{" "}
          <Link className="auth-link" to="/auth/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}