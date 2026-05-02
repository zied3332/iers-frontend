import React from "react";
import { Link } from "react-router-dom";
import SiteNav from "../../components/SiteNav";
import AuthFooter from "../../components/AuthFooter";
import "../../auth-pages.css";

const logoSrc = "/images/logo-160.webp";

export default function AccountPending() {
  return (
    <div className="auth-hero-shell">
      <div
        className="auth-bg-layer active"
        style={{ backgroundImage: `url("/images/bg1.webp")` }}
      />
      <div className="auth-overlay" />

      <SiteNav />

      <div className="auth-hero-content auth-centered-content">
        <div className="modern-auth-card pending-card">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
          </div>

          <h2>Account pending approval</h2>
          <p className="auth-subtitle">
            Your account has been created successfully.
          </p>

          <div className="pending-message-box">
            <strong>Please wait for HR approval.</strong>
            <p>
              Your request has been sent to the HR team. You will be able to sign
              in once your account is approved.
            </p>
          </div>

          <div className="pending-actions">
            <Link to="/auth/login" className="primary-btn pending-btn-link">
              Back to login
            </Link>
          </div>

          <p className="help-text">
            Need help? <strong>Contact HR:</strong> hr@company.com
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}