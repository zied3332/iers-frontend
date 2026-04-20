import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ThemeMode = "light" | "dark";
type AccentColor = "green" | "blue" | "purple" | "orange" | "teal";
type LayoutDensity = "comfortable" | "compact";
type FontSize = "small" | "medium" | "large";
type Language = "English" | "Français" | "العربية";
type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY";
type TimeZone = "GMT +01:00 — Tunis" | "GMT +00:00 — London" | "GMT +02:00 — Cairo";
type Currency = "TND — Tunisian Dinar" | "EUR — Euro" | "USD — US Dollar";
type SettingsTab =
  | "Appearance"
  | "Language & Region"
  | "Notifications"
  | "Security"
  | "Workspace";

type SettingsState = {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  layoutDensity: LayoutDensity;
  fontSize: FontSize;
  language: Language;
  dateFormat: DateFormat;
  timeZone: TimeZone;
  currency: Currency;
};

const STORAGE_KEY = "workspaceSettings";
const THEME_STORAGE_KEY = "themeMode";

const DEFAULT_SETTINGS: SettingsState = {
  themeMode: "light",
  accentColor: "green",
  layoutDensity: "comfortable",
  fontSize: "medium",
  language: "English",
  dateFormat: "DD/MM/YYYY",
  timeZone: "GMT +01:00 — Tunis",
  currency: "TND — Tunisian Dinar",
};

const ACCENT_COLORS: Record<AccentColor, string> = {
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#7c3aed",
  orange: "#ea580c",
  teal: "#0f766e",
};

function applyThemeMode(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  document.body.style.colorScheme = theme;
}

function readStoredSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Appearance");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    const stored = readStoredSettings();
    setSettings(stored);
    applyThemeMode(stored.themeMode);
  }, []);

  useEffect(() => {
    applyThemeMode(settings.themeMode);
  }, [settings.themeMode]);

  const previewAccent = useMemo(
    () => ACCENT_COLORS[settings.accentColor],
    [settings.accentColor]
  );

  const previewFontSize = useMemo(() => {
    if (settings.fontSize === "small") return 13;
    if (settings.fontSize === "large") return 17;
    return 15;
  }, [settings.fontSize]);

  const previewCardPadding = settings.layoutDensity === "compact" ? 10 : 14;

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(THEME_STORAGE_KEY, settings.themeMode);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      // ignore storage issues
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    applyThemeMode(DEFAULT_SETTINGS.themeMode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_SETTINGS.themeMode);
    } catch {
      // ignore storage issues
    }
    setSavedAt("Defaults restored");
  };

  const pageStyle: CSSProperties = {
    padding: 32,
    maxWidth: 1440,
    margin: "0 auto",
  };

  const topBarStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 28,
  };

  const eyebrowStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--muted, #64748b)",
    marginBottom: 10,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.05,
    fontWeight: 900,
    color: "var(--text, #0f172a)",
  };

  const descStyle: CSSProperties = {
    margin: "12px 0 0",
    maxWidth: 760,
    fontSize: 16,
    lineHeight: 1.7,
    color: "var(--muted, #64748b)",
  };

  const subtleButton: CSSProperties = {
    border: "1px solid var(--border, #dbe3ef)",
    background: "var(--surface, #ffffff)",
    color: "var(--text, #0f172a)",
    borderRadius: 12,
    padding: "11px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  const primaryButton: CSSProperties = {
    ...subtleButton,
    background: previewAccent,
    border: `1px solid ${previewAccent}`,
    color: "#ffffff",
    boxShadow: `0 8px 20px ${previewAccent}2A`,
  };

  const tabsWrap: CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 26,
    paddingBottom: 6,
  };

  const tabStyle: CSSProperties = {
    border: "1px solid var(--border, #dbe3ef)",
    background: "var(--surface, #ffffff)",
    color: "var(--muted, #475569)",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  const activeTabStyle: CSSProperties = {
    ...tabStyle,
    color: "var(--text, #0f172a)",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.02)",
  };

  const layoutStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.65fr)",
    gap: 24,
    alignItems: "start",
  };

  const sectionCardStyle: CSSProperties = {
    background: "var(--surface, #ffffff)",
    border: "1px solid var(--border, #dbe3ef)",
    borderRadius: 22,
    padding: 28,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  };

  const sectionHeaderStyle: CSSProperties = {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottom: "1px solid var(--border, #e2e8f0)",
  };

  const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: 30,
    fontWeight: 900,
    color: "var(--text, #0f172a)",
    letterSpacing: "-0.02em",
  };

  const sectionTextStyle: CSSProperties = {
    margin: "8px 0 0",
    fontSize: 15,
    lineHeight: 1.65,
    color: "var(--muted, #64748b)",
    maxWidth: 760,
  };

  const settingsListStyle: CSSProperties = {
    display: "grid",
    gap: 14,
  };

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) auto",
    alignItems: "center",
    gap: 18,
    padding: "18px 20px",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: 18,
    background: "#fbfcfe",
  };

  const rowLabelWrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const rowTitle: CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    color: "var(--text, #0f172a)",
  };

  const rowHint: CSSProperties = {
    fontSize: 14,
    lineHeight: 1.55,
    color: "var(--muted, #64748b)",
  };

  const segmentedWrap: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: 4,
    borderRadius: 14,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const segmentedBtn: CSSProperties = {
    border: "none",
    background: "transparent",
    color: "#334155",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  const segmentedBtnActive = (activeColor = "#ffffff"): CSSProperties => ({
    ...segmentedBtn,
    background: activeColor,
    color: activeColor === "#ffffff" ? "#0f172a" : "#ffffff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  });

  const colorWrap: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const colorDot = (color: string, active = false): CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: color,
    border: active ? "3px solid #0f172a" : "2px solid #ffffff",
    boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.12)",
    cursor: "pointer",
  });

  const sideCardTitle: CSSProperties = {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: "var(--text, #0f172a)",
  };

  const sideCardText: CSSProperties = {
    margin: "8px 0 0",
    fontSize: 14,
    lineHeight: 1.65,
    color: "var(--muted, #64748b)",
  };

  const previewFrame: CSSProperties = {
    marginTop: 18,
    borderRadius: 18,
    border: "1px solid var(--border, #e2e8f0)",
    background: settings.themeMode === "dark" ? "#0f172a" : "#ffffff",
    overflow: "hidden",
  };

  const previewTop: CSSProperties = {
    padding: "14px 16px",
    borderBottom:
      settings.themeMode === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid var(--border, #e2e8f0)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const previewBadge: CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    background:
      settings.themeMode === "dark" ? "rgba(255,255,255,0.08)" : "#eef6f2",
    color: settings.themeMode === "dark" ? "#ffffff" : previewAccent,
    fontSize: 12,
    fontWeight: 800,
  };

  const previewBody: CSSProperties = {
    padding: 16,
    display: "grid",
    gap: 12,
    background: settings.themeMode === "dark" ? "#111827" : "#fcfdff",
  };

  const previewLine = (width: string): CSSProperties => ({
    height: settings.layoutDensity === "compact" ? 8 : 10,
    width,
    borderRadius: 999,
    background: settings.themeMode === "dark" ? "#334155" : "#dbe5ef",
  });

  const previewMetricGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 4,
  };

  const previewMetricCard: CSSProperties = {
    border:
      settings.themeMode === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid #e2e8f0",
    borderRadius: 14,
    padding: previewCardPadding,
    background: settings.themeMode === "dark" ? "#1e293b" : "#ffffff",
  };

  const sideList: CSSProperties = {
    marginTop: 18,
    display: "grid",
    gap: 12,
  };

  const noteRow: CSSProperties = {
    display: "grid",
    gap: 4,
    padding: "14px 0",
    borderBottom: "1px solid var(--border, #e2e8f0)",
  };

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={eyebrowStyle}>Workspace preferences</div>
          <h1 style={titleStyle}>Settings</h1>
          <p style={descStyle}>
            Manage how your workspace looks and behaves with cleaner visual
            preferences, localization options, and system-wide experience
            controls.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={subtleButton} onClick={handleReset}>
            Reset defaults
          </button>
          <button style={primaryButton} onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, color: "var(--muted, #64748b)", fontSize: 13 }}>
        {savedAt ? `Last action: ${savedAt}` : "Changes are local until you save them."}
      </div>

      <div style={tabsWrap}>
        {(
          ["Appearance", "Language & Region", "Notifications", "Security", "Workspace"] as SettingsTab[]
        ).map((tab) => (
          <button
            key={tab}
            style={activeTab === tab ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={layoutStyle}>
        <div style={{ display: "grid", gap: 24 }}>
          {(activeTab === "Appearance" || activeTab === "Language & Region") && (
            <>
              <section style={sectionCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h2 style={sectionTitleStyle}>Appearance</h2>
                  <p style={sectionTextStyle}>
                    Personalize the visual style of the workspace while keeping a
                    clean, professional interface for daily HR operations.
                  </p>
                </div>

                <div style={settingsListStyle}>
                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Theme mode</span>
                      <span style={rowHint}>
                        Switch between light and dark appearance.
                      </span>
                    </div>

                    <div style={segmentedWrap}>
                      <button
                        style={
                          settings.themeMode === "light"
                            ? segmentedBtnActive(previewAccent)
                            : segmentedBtn
                        }
                        onClick={() => updateSetting("themeMode", "light")}
                      >
                        Light
                      </button>
                      <button
                        style={
                          settings.themeMode === "dark"
                            ? segmentedBtnActive(previewAccent)
                            : segmentedBtn
                        }
                        onClick={() => updateSetting("themeMode", "dark")}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Theme color</span>
                      <span style={rowHint}>
                        Select the accent color used across buttons, tabs, and key
                        interface highlights.
                      </span>
                    </div>

                    <div style={colorWrap}>
                      {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((colorKey) => (
                        <span
                          key={colorKey}
                          style={colorDot(
                            ACCENT_COLORS[colorKey],
                            settings.accentColor === colorKey
                          )}
                          onClick={() => updateSetting("accentColor", colorKey)}
                          title={colorKey}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Layout density</span>
                      <span style={rowHint}>
                        Choose a more spacious layout or a denser interface for
                        tables and cards.
                      </span>
                    </div>

                    <div style={segmentedWrap}>
                      <button
                        style={
                          settings.layoutDensity === "comfortable"
                            ? segmentedBtnActive(previewAccent)
                            : segmentedBtn
                        }
                        onClick={() => updateSetting("layoutDensity", "comfortable")}
                      >
                        Comfortable
                      </button>
                      <button
                        style={
                          settings.layoutDensity === "compact"
                            ? segmentedBtnActive(previewAccent)
                            : segmentedBtn
                        }
                        onClick={() => updateSetting("layoutDensity", "compact")}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Font size</span>
                      <span style={rowHint}>
                        Adjust text size for readability and accessibility.
                      </span>
                    </div>

                    <div style={segmentedWrap}>
                      {(["small", "medium", "large"] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          style={
                            settings.fontSize === size
                              ? segmentedBtnActive(previewAccent)
                              : segmentedBtn
                          }
                          onClick={() => updateSetting("fontSize", size)}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section style={sectionCardStyle}>
                <div style={sectionHeaderStyle}>
                  <h2 style={sectionTitleStyle}>Language &amp; Region</h2>
                  <p style={sectionTextStyle}>
                    Define workspace localization settings for language, dates,
                    timezone, and currency formatting.
                  </p>
                </div>

                <div style={settingsListStyle}>
                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Language</span>
                      <span style={rowHint}>
                        Set the display language used throughout the workspace.
                      </span>
                    </div>

                    <div style={segmentedWrap}>
                      {(["English", "Français", "العربية"] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          style={
                            settings.language === lang
                              ? segmentedBtnActive(previewAccent)
                              : segmentedBtn
                          }
                          onClick={() => updateSetting("language", lang)}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={rowStyle}>
                    <div style={rowLabelWrap}>
                      <span style={rowTitle}>Date format</span>
                      <span style={rowHint}>
                        Control how dates appear in dashboards, activities, and
                        calendars.
                      </span>
                    </div>

                    <div style={segmentedWrap}>
                      {(["DD/MM/YYYY", "MM/DD/YYYY"] as DateFormat[]).map((format) => (
                        <button
                          key={format}
                          style={
                            settings.dateFormat === format
                              ? segmentedBtnActive(previewAccent)
                              : segmentedBtn
                          }
                          onClick={() => updateSetting("dateFormat", format)}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>

               
                </div>
              </section>
            </>
          )}

          {activeTab === "Notifications" && (
            <section style={sectionCardStyle}>
              <div style={sectionHeaderStyle}>
                <h2 style={sectionTitleStyle}>Notifications</h2>
                <p style={sectionTextStyle}>
                  Placeholder section. Next you can connect real notification
                  preferences here.
                </p>
              </div>
              <div style={rowHint}>
                Add email notifications, in-app alerts, activity reminders, and
                approval updates.
              </div>
            </section>
          )}

          {activeTab === "Security" && (
            <section style={sectionCardStyle}>
              <div style={sectionHeaderStyle}>
                <h2 style={sectionTitleStyle}>Security</h2>
                <p style={sectionTextStyle}>
                  Placeholder section. Next you can add password, sessions, and 2FA.
                </p>
              </div>
              <div style={rowHint}>
                Add password change, active sessions, device management, and
                two-factor authentication.
              </div>
            </section>
          )}

          {activeTab === "Workspace" && (
            <section style={sectionCardStyle}>
              <div style={sectionHeaderStyle}>
                <h2 style={sectionTitleStyle}>Workspace</h2>
                <p style={sectionTextStyle}>
                  Placeholder section. Next you can add workspace-specific preferences.
                </p>
              </div>
              <div style={rowHint}>
                Add default dashboard, panel visibility, and HR workflow settings.
              </div>
            </section>
          )}
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <section style={sectionCardStyle}>
            <h3 style={sideCardTitle}>Preview</h3>
            <p style={sideCardText}>
              A simplified preview of how the selected settings will look inside
              the workspace.
            </p>

            <div style={previewFrame}>
              <div style={previewTop}>
                <strong
                  style={{
                    fontSize: previewFontSize,
                    color: settings.themeMode === "dark" ? "#ffffff" : "#0f172a",
                  }}
                >
                  Workspace overview
                </strong>
                <span style={previewBadge}>
                  {settings.themeMode === "dark" ? "Dark" : "Light"}
                </span>
              </div>

              <div style={previewBody}>
                <div style={previewLine("56%")} />
                <div style={previewLine("82%")} />

                <div style={previewMetricGrid}>
                  {[
                    { label: "Total activities", value: "17", color: settings.themeMode === "dark" ? "#fff" : "#0f172a" },
                    { label: "Active pipeline", value: "12", color: settings.themeMode === "dark" ? "#fff" : "#0f172a" },
                    { label: "Dashboard pulse", value: "96%", color: previewAccent },
                  ].map((item) => (
                    <div key={item.label} style={previewMetricCard}>
                      <div
                        style={{
                          fontSize: Math.max(previewFontSize - 3, 11),
                          color: settings.themeMode === "dark" ? "#94a3b8" : "#64748b",
                          marginBottom: 8,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: previewFontSize + 11,
                          fontWeight: 900,
                          color: item.color,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={sectionCardStyle}>
            <h3 style={sideCardTitle}>Current values</h3>
            <p style={sideCardText}>
              This summary updates live as you change the settings.
            </p>

            <div style={sideList}>
              {[
                ["Theme", settings.themeMode],
                ["Accent", settings.accentColor],
                ["Density", settings.layoutDensity],
                ["Font size", settings.fontSize],
                ["Language", settings.language],
                ["Date format", settings.dateFormat],
                ["Time zone", settings.timeZone],
                ["Currency", settings.currency],
              ].map(([label, value], index, arr) => (
                <div
                  key={label}
                  style={{
                    ...noteRow,
                    borderBottom:
                      index === arr.length - 1 ? "none" : "1px solid var(--border, #e2e8f0)",
                    paddingBottom: index === arr.length - 1 ? 0 : 14,
                  }}
                >
                  <strong style={{ fontSize: 15, color: "#0f172a" }}>{label}</strong>
                  <span style={rowHint}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}