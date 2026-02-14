import React from "react";
import { Outlet, Link } from "react-router-dom";
import "../../index.css";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-brand">
          <div className="auth-logo">IntelliHR</div>
          <div className="badge">Internal</div>
        </div>

        <Outlet />

        <div className="auth-footer">
          <span className="muted">© {new Date().getFullYear()} IntelliHR</span>
          <span className="dot">•</span>
          <Link className="hr-back" to="/hr/dashboard">Go to app</Link>
        </div>
      </div>
    </div>
  );
}