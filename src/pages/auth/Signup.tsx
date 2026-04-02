// src/pages/auth/Signup.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import "../../auth-pages.css";

const logoSrc = "/images/logo.png";

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
}

export default function Signup() {
  const nav = useNavigate();
  const heroImages = ["/images/bg1.png", "/images/bg2.png", "/images/bg3.png", "/images/bg4.png"];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [password, setPassword] = useState("");

  const [matricule, setMatricule] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(1);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [deptError, setDeptError] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepts(true);
        const depts = await getAllDepartments();
        setDepartments(depts);
      } catch (err: any) {
        setDeptError(err?.message || "Failed to load departments");
        console.error("Error fetching departments:", err);
      } finally {
        setLoadingDepts(false);
      }
    };

    fetchDepartments();
  }, []);

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
      await registerUser({
        name: fullName,
        email,
        password,
        departement_id: departementId,
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
            Create your
            <span> account</span>
          </h1>
          <p>
            Join the company platform and manage your employee access with a premium experience.
          </p>
        </div>

        <div className="modern-auth-card modern-auth-card-register">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
            <span>IntelliHR</span>
          </div>
          <h2>Create account</h2>
          <p className="auth-subtitle">Internal access only (company users).</p>

          {error ? <div className="auth-alert">{error}</div> : null}

          <form className="modern-auth-form" onSubmit={onSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="field">
                <label>Department</label>
                {deptError ? <div className="auth-alert auth-inline-alert">{deptError}</div> : null}
                <select
                  value={departementId}
                  onChange={(e) => setDepartementId(e.target.value)}
                  disabled={loadingDepts}
                  style={{ cursor: loadingDepts ? "not-allowed" : "pointer" }}
                >
                  <option value="">
                    {loadingDepts ? "Loading departments..." : "Select a department"}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Matricule</label>
                <input
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="EMP-1023"
                  required
                />
              </div>

              <div className="field">
                <label>Telephone</label>
                <input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Hire date</label>
              <input
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>

            <p className="switch-text">
              Already have an account?
              <Link className="text-btn-link" to="/auth/login">Sign in</Link>
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