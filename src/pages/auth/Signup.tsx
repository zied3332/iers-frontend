// src/pages/auth/Signup.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginWithGoogle } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import SiteNav from "../../components/SiteNav";
import AuthFooter from "../../components/AuthFooter";
import "../../auth-pages.css";

const logoSrc = "/images/logo-160.webp";

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
}

export default function Signup() {
  const nav = useNavigate();
  const heroImages = [
    "/images/bg1.webp",
    "/images/bg2.webp",
    "/images/bg3.webp",
    "/images/bg4.webp",
  ];

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
        setDeptError("");
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

  function normalizeError(err: any): string {
    const responseData = err?.response?.data;

    if (Array.isArray(responseData?.message)) {
      return responseData.message.join(", ");
    }

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof err?.message === "string") {
      return err.message;
    }

    return "Signup failed";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTelephone = telephone.trim();
    const normalizedMatricule = matricule.trim().toUpperCase();

    if (trimmedName.length < 2) {
      setError("Full name must contain at least 2 characters.");
      return;
    }

    if (normalizedMatricule.length === 0) {
      setError("Matricule is required.");
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!dateEmbauche) {
      setError("Hire date is required.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password: password.trim(),
        departement_id: departementId || undefined,
        matricule: normalizedMatricule,
        telephone: trimmedTelephone,
        date_embauche: dateEmbauche,
      });

      nav("/auth/account-pending");
    } catch (err: any) {
      setError(normalizeError(err));
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

      <SiteNav />

      <div className="auth-hero-content">
        <div className="auth-hero-copy">
          <h1>
            Create your
            <span> account</span>
          </h1>
          <p>
            Join the company platform and manage your employee access with a
            premium experience.
          </p>
        </div>

        <div className="modern-auth-card modern-auth-card-register">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="IntelliHR logo" />
          </div>

          <h2>Create account</h2>
          <p className="auth-subtitle">
            Internal access only (company users).
          </p>

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
                {deptError ? (
                  <div className="auth-alert auth-inline-alert">{deptError}</div>
                ) : null}

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
                  onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                  placeholder="EEE333"
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
                minLength={6}
              />
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
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
                width={20}
                height={20}
              />
              Sign up with Google
            </button>

            <p className="switch-text">
              Already have an account?
              <Link className="text-btn-link" to="/auth/login">
                Sign in
              </Link>
            </p>

            <p className="help-text">
              Having trouble? <strong>Contact HR:</strong> hr@company.com
            </p>
          </form>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}