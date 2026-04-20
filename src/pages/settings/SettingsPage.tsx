import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type AppLanguage = "en" | "fr";

const LANGUAGE_STORAGE_KEY = "appLanguage";

function readLanguage(): AppLanguage {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return raw === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

function saveLanguage(value: AppLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function roleBaseFromPath(pathname: string): "hr" | "super-manager" | "manager" | "me" {
  const first = String(pathname.split("/")[1] || "").toLowerCase();
  if (first === "hr") return "hr";
  if (first === "super-manager") return "super-manager";
  if (first === "manager") return "manager";
  return "me";
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const roleBase = useMemo(() => roleBaseFromPath(location.pathname), [location.pathname]);
  const editProfilePath = `/${roleBase}/settings/edit-profile`;
  const changePasswordPath = `/${roleBase}/settings/change-password`;
  const appearancePath = `/${roleBase}/settings/appearance`;

  const [language, setLanguage] = useState<AppLanguage>(() => readLanguage());

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  const clickableCardBase: React.CSSProperties = {
    cursor: "pointer",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 16 }}>
        <div className="page-header">
          <h1 className="page-title" style={{ margin: 0 }}>Settings</h1>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Manage profile access, password, appearance, and language preferences.
          </p>
        </div>

        <section
          className="card section-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate(editProfilePath)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(editProfilePath);
            }
          }}
          style={clickableCardBase}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="section-title">Edit profile</div>
              <p className="muted" style={{ marginTop: 8 }}>
                Open the dedicated edit page to update your personal and work information.
              </p>
            </div>
          </div>
        </section>

        <section
          className="card section-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate(changePasswordPath)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(changePasswordPath);
            }
          }}
          style={clickableCardBase}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="section-title">Change password</div>
              <p className="muted" style={{ marginTop: 8 }}>
                Open the dedicated page to change password now or request a reset link securely.
              </p>
            </div>
          </div>
        </section>

        <section
          className="card section-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate(appearancePath)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(appearancePath);
            }
          }}
          style={clickableCardBase}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="section-title">Appearance</div>
              <p className="muted" style={{ marginTop: 8 }}>
                Open appearance settings to choose dark/light mode and theme color.
              </p>
            </div>
          </div>
        </section>

        <section className="card section-card">
          <div className="section-head">
            <div className="section-title">Language</div>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Save your preferred app language.
          </p>
          <div style={{ marginTop: 12 }}>
            <select
              className="select"
              value={language}
              onChange={(e) => setLanguage(e.target.value === "fr" ? "fr" : "en")}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
