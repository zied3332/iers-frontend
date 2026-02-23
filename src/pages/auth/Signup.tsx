// src/pages/auth/Signup.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth.service";
import "../../auth-pages.css";

// ✅ Import image from src/assets
import authBg from "../../assets/logbackimg.png";

export default function Signup() {
  const nav = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");

  const [matricule, setMatricule] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerUser({
        name: fullName,
        email,
        password,
        department: dept,
        matricule,
        telephone,
        date_embauche: dateEmbauche,
      });

      nav("/auth/login");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

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

          <h1 className="auth-hero-title">Welcome to IntelliHR</h1>
          <p className="auth-hero-sub">
            Internal access for company staff. Create your account to start using
            your workspace.
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

          <div className="auth-left-foot">
            © {new Date().getFullYear()} IntelliHR
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>

          <div className="auth-title">Create account</div>
          <div className="auth-sub">Internal access only (company users).</div>

          {error ? <div className="auth-alert">{error}</div> : null}

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-grid2">
              <div className="auth-field">
                <label className="auth-label">Full name</label>
                <input
                  className="auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Department</label>
                <input
                  className="auth-input"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="HR / IT / Sales..."
                />
              </div>
            </div>

            <div className="auth-grid2">
              <div className="auth-field">
                <label className="auth-label">Matricule</label>
                <input
                  className="auth-input"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="EMP-1023"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Telephone</label>
                <input
                  className="auth-input"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Hire date</label>
              <input
                className="auth-input"
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
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
                required
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>

            <div className="auth-links">
              <span className="auth-muted">Already have an account?</span>
              <Link className="auth-link" to="/auth/login">
                Sign in
              </Link>
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