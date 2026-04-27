import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeGoogleProfile } from "../../services/auth.service";
import { getAllDepartments } from "../../services/departments.service";
import SiteNav from "../../components/SiteNav";
import AuthFooter from "../../components/AuthFooter";
import "../../auth-pages.css";

const logoSrc = "/images/logo-160.webp";

interface Department {
  _id: string;
  name: string;
}

function redirectByRole(nav: ReturnType<typeof useNavigate>, role: string) {
  const r = String(role || "").toLowerCase();
  if (r === "super_manager") nav("/super-manager/dashboard", { replace: true });
  else if (r === "hr") nav("/hr/dashboard", { replace: true });
  else if (r === "manager") nav("/manager/dashboard", { replace: true });
  else nav("/me/profile", { replace: true });
}

export default function CompleteProfile() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [matricule, setMatricule] = useState("");
  const [telephone, setTelephone] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Stocker le token Google dès l'arrivée sur la page
  useEffect(() => {
    if (!token) {
      nav("/auth/login", { replace: true });
      return;
    }
    // Stocker temporairement le token pour l'appel API
    localStorage.setItem("token", token);
  }, [token, nav]);

  useEffect(() => {
    getAllDepartments()
      .then(setDepartments)
      .catch(() => setError("Erreur chargement départements"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await completeGoogleProfile({
        matricule,
        telephone,
        departement_id: departementId,
        date_embauche: dateEmbauche,
      });

      // Mettre à jour le token et user
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));

      redirectByRole(nav, res.user?.role);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la complétion du profil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-hero-shell">
      <div
        className="auth-bg-layer active"
        style={{ backgroundImage: "url(/images/bg1.webp)" }}
      />
      <div className="auth-overlay" />

      <SiteNav />

      <div className="auth-hero-content">
        <div className="auth-hero-copy">
          <h1>Almost <span>there!</span></h1>
          <p>Complete your profile to access your workspace.</p>
        </div>

        <div className="modern-auth-card modern-auth-card-register">
          <div className="brand-title">
            <img className="brand-title-logo" src={logoSrc} alt="logo" />
          </div>
          <h2>Complete your profile</h2>
          <p className="auth-subtitle">
            Your Google account is linked. Just fill in the missing info.
          </p>

          {error && <div className="auth-alert">{error}</div>}

          <form className="modern-auth-form" onSubmit={onSubmit}>
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
              <label>Department</label>
              <select
                value={departementId}
                onChange={(e) => setDepartementId(e.target.value)}
                required
              >
                <option value="">Select a department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
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

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Complete & Access Workspace"}
            </button>
          </form>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}