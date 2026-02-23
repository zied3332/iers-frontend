import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth.service";
import "../../index.css";

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

      
      nav("/employee/profile");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-layout">
      {/* Left side - 30% green gradient */}
      <div className="auth-gradient-side">
        <div className="auth-gradient-content">
          <div className="auth-gradient-logo">IntelliHR</div>
          <h1 className="auth-gradient-title">Welcome to IntelliHR</h1>
        </div>
      </div>

      {/* Right side - 70% form centered */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-title">Create account</div>
          <div className="auth-sub muted">Internal access only (company users).</div>

          {error && (
            <div style={{ marginTop: 12, padding: 10, border: "1px solid #ef4444", borderRadius: 10 }}>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-grid2">
              <div className="auth-field">
                <label className="auth-label">Full name</label>
                <input className="input w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="auth-field">
                <label className="auth-label">Department</label>
                <input className="input w-full" value={dept} onChange={(e) => setDept(e.target.value)} />
              </div>
            </div>

            <div className="auth-grid2">
              <div className="auth-field">
                <label className="auth-label">Matricule</label>
                <input className="input w-full" value={matricule} onChange={(e) => setMatricule(e.target.value)} required />
              </div>

              <div className="auth-field">
                <label className="auth-label">Telephone</label>
                <input className="input w-full" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Date d&apos;embauche</label>
              <input
                className="input w-full"
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="input w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="auth-row">
              <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </button>
            </div>

            <div className="auth-links">
              <span className="muted">Already have an account?</span>{" "}
              <Link className="auth-link" to="/auth/login">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}