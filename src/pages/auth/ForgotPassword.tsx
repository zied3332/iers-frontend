// src/pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/auth.service";
import "../../auth-pages.css";
import authBg from "../../assets/logbackimg.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSent(false);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Une erreur est survenue.";
      const isBackendMissing =
        typeof raw === "string" &&
        (raw.includes("Cannot POST") || raw.includes("404") || raw.includes("Not Found"));
      const message = isBackendMissing
        ? "Cette fonctionnalité n'est pas encore disponible sur le serveur. Contactez les RH pour réinitialiser votre mot de passe : hr@company.com"
        : raw;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
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
          <h1 className="auth-hero-title">Mot de passe oublié</h1>
          <p className="auth-hero-sub">
            Entrez votre adresse email professionnelle. Si un compte existe, vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <div className="auth-bullets">
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Lien sécurisé par email
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Lien valide pendant 1 heure
            </div>
            <div className="auth-bullet">
              <span className="auth-check">✓</span> Aucun mot de passe envoyé en clair
            </div>
          </div>
          <div className="auth-left-foot">© {new Date().getFullYear()} IntelliHR</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>
          <div className="auth-title">Réinitialiser le mot de passe</div>
          <div className="auth-sub">Indiquez l'email de votre compte.</div>

          {error ? <div className="auth-alert">{error}</div> : null}
          {sent ? (
            <div className="auth-success">
              Un email a été envoyé à <strong>{email}</strong>. Consultez votre boîte de réception et suivez le lien pour définir un nouveau mot de passe.
            </div>
          ) : null}

          {!sent && (
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </button>
            </form>
          )}

          <div className="auth-links" style={{ marginTop: 20 }}>
            <Link className="auth-link" to="/auth/login">
              Retour à la connexion
            </Link>
            <span className="auth-muted">•</span>
            <Link className="auth-link" to="/auth/signup">
              Créer un compte
            </Link>
          </div>
          <div className="auth-help">
            Problème ? <b>Contacter les RH :</b> hr@company.com
          </div>
        </div>
      </div>
    </div>
  );
}
