// src/pages/auth/ResetPassword.tsx
// Page utilisée quand l'utilisateur clique sur le lien reçu par email (token dans l'URL).
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/auth.service";
import "../../auth-pages.css";
import authBg from "../../assets/logbackimg.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token.trim()) setError("Lien invalide ou expiré. Demandez un nouveau lien.");
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => nav("/auth/login", { replace: true }), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
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
          <h1 className="auth-hero-title">Nouveau mot de passe</h1>
          <p className="auth-hero-sub">
            Choisissez un mot de passe sécurisé pour accéder à votre compte.
          </p>
          <div className="auth-left-foot">© {new Date().getFullYear()} IntelliHR</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-brand">IntelliHR</div>
          </div>
          <div className="auth-title">Définir un nouveau mot de passe</div>
          <div className="auth-sub">
            {token ? "Entrez et confirmez votre nouveau mot de passe." : "Utilisez le lien reçu par email."}
          </div>

          {error ? <div className="auth-alert">{error}</div> : null}
          {done ? (
            <div className="auth-success">
              Mot de passe mis à jour. Redirection vers la page de connexion…
            </div>
          ) : token ? (
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="auth-field">
                <label className="auth-label">Nouveau mot de passe</label>
                <input
                  className="auth-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirmer le mot de passe</label>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Réinitialiser le mot de passe"}
              </button>
            </form>
          ) : null}

          <div className="auth-links" style={{ marginTop: 20 }}>
            <Link className="auth-link" to="/auth/login">
              Retour à la connexion
            </Link>
            <span className="auth-muted">•</span>
            <Link className="auth-link" to="/auth/forgot-password">
              Renvoyer un lien
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
