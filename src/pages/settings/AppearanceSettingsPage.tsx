import { useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  applyThemePreferences,
  readStoredThemeColor,
  readStoredThemeMode,
  THEME_COLOR_OPTIONS,
  type ThemeMode,
} from "../../utils/themePreferences";

function roleBaseFromPath(pathname: string): "hr" | "super-manager" | "manager" | "me" {
  const first = String(pathname.split("/")[1] || "").toLowerCase();
  if (first === "hr") return "hr";
  if (first === "super-manager") return "super-manager";
  if (first === "manager") return "manager";
  return "me";
}

export default function AppearanceSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const roleBase = useMemo(() => roleBaseFromPath(location.pathname), [location.pathname]);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [themeColor, setThemeColor] = useState<string>(() => readStoredThemeColor());

  const setMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemePreferences({ mode, color: themeColor });
  };

  const setColor = (color: string) => {
    setThemeColor(color);
    applyThemePreferences({ mode: themeMode, color });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 16 }}>
        <div className="page-header" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Appearance</h1>
            <p className="page-subtitle" style={{ marginTop: 8 }}>
              Choose your theme mode and app accent color.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate(`/${roleBase}/settings`)}>
            Back to settings
          </button>
        </div>

        <section className="card section-card" style={{ padding: 20 }}>
          <div className="section-title">Theme</div>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setMode("light")}
              style={themeChoiceStyle(themeMode === "light")}
              aria-label="Use light mode"
            >
              <ThemePreview mode="light" selected={themeMode === "light"} />
              <span style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("dark")}
              style={themeChoiceStyle(themeMode === "dark")}
              aria-label="Use dark mode"
            >
              <ThemePreview mode="dark" selected={themeMode === "dark"} />
              <span style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>Dark</span>
            </button>
          </div>
        </section>

        <section className="card section-card" style={{ padding: 20 }}>
          <div className="section-title">Theme color</div>
          <p className="muted" style={{ marginTop: 8 }}>
            Select the accent color used for buttons, active links, and highlights.
          </p>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 10,
              background: "var(--surface)",
            }}
          >
            {THEME_COLOR_OPTIONS.map((item) => {
              const selected = item.value.toLowerCase() === themeColor.toLowerCase();
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setColor(item.value)}
                  title={item.label}
                  aria-label={`Use ${item.label} theme color`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: selected ? "2px solid var(--text)" : "1px solid rgba(15,23,42,0.18)",
                    background: item.value,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    boxShadow: selected ? "0 0 0 3px var(--primary-weak)" : "none",
                  }}
                >
                  {selected ? <span style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>ON</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function themeChoiceStyle(active: boolean): CSSProperties {
  return {
    border: active ? "2px solid var(--primary)" : "1px solid var(--border)",
    borderRadius: 16,
    background: "var(--surface)",
    color: "var(--text)",
    padding: 18,
    minHeight: 255,
    textAlign: "center",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: active ? "0 0 0 3px var(--primary-weak)" : "none",
  };
}

function ThemePreview({ mode, selected }: { mode: ThemeMode; selected: boolean }) {
  const isDark = mode === "dark";
  const frameBg = isDark ? "#17213a" : "#ffffff";
  const border = isDark ? "#2b3f62" : "#dbe4f3";
  const muted = isDark ? "#64748b" : "#cbd5e1";

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: frameBg,
        padding: 16,
        position: "relative",
        minHeight: 182,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, border: `1px solid ${muted}` }} />
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: selected ? "var(--primary)" : muted,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {selected ? "ON" : ""}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: muted, marginBottom: 10 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        <span style={{ height: 6, borderRadius: 999, background: muted }} />
        <span style={{ height: 6, borderRadius: 999, background: muted }} />
        <span style={{ height: 6, borderRadius: 999, background: muted }} />
      </div>
    </div>
  );
}
