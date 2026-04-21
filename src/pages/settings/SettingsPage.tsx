import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentUser, requestPasswordReset, type CurrentUser } from "../../services/auth.service";
import { getMyEmployeeRecord, patchMyEmployeeRecord } from "../../services/employee.service";
import { getAllSkills } from "../../services/skills.service";
import { getAllDomains, type Domain } from "../../services/domains.service";
import { changeMyPassword, patchMe } from "../profile/profile.api";
import type { ExperienceSegmentInput } from "../../utils/experienceSegments";
import {
  ExperienceSegmentsEditor,
  mapApiSegmentsToInput,
  mapApiSkillsToOptions,
  validateExperienceSegmentsForSave,
  type SkillOption,
} from "../../components/ExperienceSegmentsEditor";
import {
  applyThemePreferences,
  DEFAULT_THEME_COLOR,
  readStoredThemeColor,
  readStoredThemeMode,
  THEME_COLOR_OPTIONS,
} from "../../utils/themePreferences";

type ThemeMode = "light" | "dark";
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
  | "Edit Profile";

type SeniorityLevel = "JUNIOR" | "MID" | "SENIOR";
type EditFormState = {
  name: string;
  email: string;
  matricule: string;
  telephone: string;
  date_embauche: string;
  jobTitle: string;
  experienceYears: number;
  seniorityLevel: SeniorityLevel;
};

type SettingsState = {
  themeMode: ThemeMode;
  themeColor: string;
  layoutDensity: LayoutDensity;
  fontSize: FontSize;
  language: Language;
  dateFormat: DateFormat;
  timeZone: TimeZone;
  currency: Currency;
};

const STORAGE_KEY = "workspaceSettings";

const DEFAULT_SETTINGS: SettingsState = {
  themeMode: "light",
  themeColor: DEFAULT_THEME_COLOR,
  layoutDensity: "comfortable",
  fontSize: "medium",
  language: "English",
  dateFormat: "DD/MM/YYYY",
  timeZone: "GMT +01:00 — Tunis",
  currency: "TND — Tunisian Dinar",
};

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

function toInputDate(raw?: string): string {
  if (!raw) return "";
  const normalized = String(raw).trim();
  if (!normalized) return "";
  return normalized.includes("T") ? normalized.split("T")[0] : normalized;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Appearance");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [employeeRecordId, setEmployeeRecordId] = useState("");
  const [experienceSegments, setExperienceSegments] = useState<ExperienceSegmentInput[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [profileForm, setProfileForm] = useState<EditFormState>({
    name: "",
    email: "",
    matricule: "",
    telephone: "",
    date_embauche: "",
    jobTitle: "",
    experienceYears: 0,
    seniorityLevel: "JUNIOR",
  });

  const [loadingEmail, setLoadingEmail] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCurrentPassword, setResetCurrentPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const stored = readStoredSettings();
    const storedMode = readStoredThemeMode();
    const storedColor = readStoredThemeColor();
    const domThemeAttr = String(document.documentElement.getAttribute("data-theme") || "").toLowerCase();
    const activeDomMode: ThemeMode =
      domThemeAttr === "dark" || domThemeAttr === "light"
        ? (domThemeAttr as ThemeMode)
        : storedMode;
    const activeDomColorRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    const activeDomColor = THEME_COLOR_OPTIONS.find(
      (option) => option.value.toLowerCase() === activeDomColorRaw.toLowerCase(),
    )?.value;

    setSettings({
      ...stored,
      themeMode: activeDomMode,
      themeColor: activeDomColor || storedColor || stored.themeColor || DEFAULT_THEME_COLOR,
    });
    setSettingsReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingProfile(true);
    setLoadingEmail(true);
    setProfileError("");

    (async () => {
      try {
        const me = await getCurrentUser();
        if (!active) return;
        setCurrentUser(me);
        setProfileForm({
          name: String(me.name || ""),
          email: String(me.email || ""),
          matricule: String(me.matricule || ""),
          telephone: String(me.telephone || ""),
          date_embauche: toInputDate(me.date_embauche),
          jobTitle: "",
          experienceYears: 0,
          seniorityLevel: "JUNIOR",
        });

        if (String(me.role || "").toUpperCase() === "EMPLOYEE") {
          try {
            const [employee, skillsList, domainList] = await Promise.all([
              getMyEmployeeRecord(),
              getAllSkills().catch(() => []),
              getAllDomains().catch(() => []),
            ]);
            if (!active || !employee) return;
            setEmployeeRecordId(String(employee._id || ""));
            setSkillOptions(mapApiSkillsToOptions(skillsList));
            setDomains(Array.isArray(domainList) ? domainList : []);
            setExperienceSegments(mapApiSegmentsToInput(employee.experienceSegments));
            setProfileForm((prev) => ({
              ...prev,
              jobTitle: String(employee.jobTitle || ""),
              experienceYears: Number(employee.experienceYears || 0),
              seniorityLevel: (employee.seniorityLevel || "JUNIOR") as SeniorityLevel,
            }));
          } catch {
            // Keep settings usable when employee extras fail.
          }
        }
      } catch (e: unknown) {
        if (!active) return;
        setProfileError(e instanceof Error ? e.message : "Failed to load profile data.");
      } finally {
        if (!active) return;
        setLoadingProfile(false);
        setLoadingEmail(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    applyThemePreferences({
      mode: settings.themeMode,
      color: settings.themeColor,
      persist: true,
    });
  }, [settings.themeMode, settings.themeColor, settingsReady]);

  const isEmployee = String(currentUser?.role || "").toUpperCase() === "EMPLOYEE";
  const accountEmail = String(currentUser?.email || "").trim();

  const previewAccent = useMemo(
    () => settings.themeColor,
    [settings.themeColor]
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
      applyThemePreferences({
        mode: settings.themeMode,
        color: settings.themeColor,
        persist: true,
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      // ignore storage issues
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      applyThemePreferences({
        mode: DEFAULT_SETTINGS.themeMode,
        color: DEFAULT_SETTINGS.themeColor,
        persist: true,
      });
    } catch {
      // ignore storage issues
    }
    setSavedAt("Defaults restored");
  };

  const onSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      await patchMe({
        name: profileForm.name.trim() || undefined,
        email: profileForm.email.trim() || undefined,
        matricule: profileForm.matricule.trim() || undefined,
        telephone: profileForm.telephone.trim() || undefined,
        date_embauche: profileForm.date_embauche || undefined,
      });

      if (isEmployee && employeeRecordId) {
        const years = Math.max(0, Number(profileForm.experienceYears || 0));
        const segErr = validateExperienceSegmentsForSave(years, experienceSegments);
        if (segErr) throw new Error(segErr);
        await patchMyEmployeeRecord({
          jobTitle: profileForm.jobTitle.trim() || "Not Assigned",
          experienceYears: years,
          seniorityLevel: profileForm.seniorityLevel,
          experienceSegments: years > 0 ? experienceSegments : [],
        });
      }

      const merged = {
        ...(currentUser as any),
        name: profileForm.name.trim() || currentUser.name,
        email: profileForm.email.trim() || currentUser.email,
        matricule: profileForm.matricule.trim() || undefined,
        telephone: profileForm.telephone.trim() || undefined,
        date_embauche: profileForm.date_embauche || undefined,
      };
      localStorage.setItem("user", JSON.stringify(merged));
      setCurrentUser(merged);
      setProfileSuccess("Profile updated successfully.");
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : "Failed to save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword.trim()) return setPasswordError("Please enter your current password.");
    if (!newPassword.trim()) return setPasswordError("Please enter a new password.");
    if (newPassword.length < 8) return setPasswordError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New password and confirmation do not match.");
    if (newPassword === currentPassword) return setPasswordError("New password must be different from current password.");

    setSavingPassword(true);
    try {
      await changeMyPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const onSendResetLink = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!resetCurrentPassword.trim()) {
      setPasswordError("Enter your current password before sending a reset link.");
      return;
    }
    if (!accountEmail) {
      setPasswordError("No account email available.");
      return;
    }

    setSendingReset(true);
    try {
      const res = await requestPasswordReset(accountEmail);
      setPasswordSuccess(
        String(res?.message || "If this email is registered, a reset link has been sent."),
      );
      setResetCurrentPassword("");
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Failed to send reset link.");
    } finally {
      setSendingReset(false);
    }
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
    background: settings.themeMode === "dark" ? "#1e293b" : "#f8fafc",
    border:
      settings.themeMode === "dark"
        ? "1px solid rgba(255,255,255,0.14)"
        : "1px solid #cbd5e1",
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
    border:
      settings.themeMode === "dark"
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid var(--border, #e2e8f0)",
    borderRadius: 18,
    background: settings.themeMode === "dark" ? "#111827" : "#fbfcfe",
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
    background: settings.themeMode === "dark" ? "#0f172a" : "#f1f5f9",
    border:
      settings.themeMode === "dark"
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid #e2e8f0",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const segmentedBtn: CSSProperties = {
    border: "none",
    background: "transparent",
    color: settings.themeMode === "dark" ? "#cbd5e1" : "#334155",
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

  const themeModeChoicesWrap: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
    gap: 10,
    minWidth: 280,
    maxWidth: 360,
  };

  const themeModeChoice = (active: boolean): CSSProperties => ({
    border: active ? "2px solid var(--primary)" : "1px solid var(--border, #dbe3ef)",
    borderRadius: 14,
    background: "var(--surface, #ffffff)",
    color: "var(--text, #0f172a)",
    padding: "10px 12px",
    minHeight: 88,
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    alignContent: "space-between",
    gap: 8,
    boxShadow: active ? "0 0 0 3px var(--primary-weak)" : "none",
  });

  const modeIconRow: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--muted, #64748b)",
  };

  const sunIcon: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#f59e0b",
    boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.25)",
  };

  const moonIconWrap: CSSProperties = {
    position: "relative",
    width: 14,
    height: 14,
    display: "inline-block",
  };

  const moonIcon: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#334155",
    display: "inline-block",
  };

  const moonCutout: CSSProperties = {
    position: "absolute",
    top: 1,
    left: 5,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: settings.themeMode === "dark" ? "#111827" : "#ffffff",
  };

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
          ["Appearance", "Language & Region", "Notifications", "Security", "Edit Profile"] as SettingsTab[]
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

                    <div style={themeModeChoicesWrap}>
                      <button
                        style={themeModeChoice(settings.themeMode === "light")}
                        onClick={() => updateSetting("themeMode", "light")}
                      >
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Light</span>
                        <span style={modeIconRow}>
                          <span style={sunIcon} />
                          <span>Sun</span>
                        </span>
                      </button>
                      <button
                        style={themeModeChoice(settings.themeMode === "dark")}
                        onClick={() => updateSetting("themeMode", "dark")}
                      >
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Dark</span>
                        <span style={modeIconRow}>
                          <span style={moonIconWrap}>
                            <span style={moonIcon} />
                            <span style={moonCutout} />
                          </span>
                          <span>Moon</span>
                        </span>
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
                      {THEME_COLOR_OPTIONS.map((item) => (
                        <span
                          key={item.value}
                          style={colorDot(
                            item.value,
                            settings.themeColor.toLowerCase() === item.value.toLowerCase()
                          )}
                          onClick={() => updateSetting("themeColor", item.value)}
                          title={item.label}
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
                  Keep your account secure by updating your password when needed.
                </p>
              </div>

              {passwordError ? (
                <div style={{ padding: "12px 14px", borderRadius: 12, border: settings.themeMode === "dark" ? "1px solid rgba(248,113,113,0.45)" : "1px solid #fecaca", background: settings.themeMode === "dark" ? "rgba(127,29,29,0.28)" : "#fff1f2", color: settings.themeMode === "dark" ? "#fecaca" : "#b91c1c", fontWeight: 700, marginBottom: 12 }}>
                  {passwordError}
                </div>
              ) : null}
              {passwordSuccess ? (
                <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--primary-border)", background: "var(--primary-weak)", color: "var(--primary-soft-text)", fontWeight: 700, marginBottom: 12 }}>
                  {passwordSuccess}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ ...rowStyle, gridTemplateColumns: "1fr" }}>
                  <div style={rowLabelWrap}>
                    <span style={rowTitle}>Change password now</span>
                    <span style={rowHint}>Enter your current password and your new password.</span>
                  </div>
                  <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
                    <input className="input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <input className="input" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <input className="input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <div>
                      <button style={primaryButton} onClick={() => void onChangePassword()} disabled={savingPassword || sendingReset}>
                        {savingPassword ? "Changing..." : "Change password"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ ...rowStyle, gridTemplateColumns: "1fr" }}>
                  <div style={rowLabelWrap}>
                    <span style={rowTitle}>Send reset link</span>
                    <span style={rowHint}>For security, confirm your current password before requesting a reset email.</span>
                  </div>
                  <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
                    <div style={{ fontWeight: 700 }}>
                      {loadingEmail ? "Loading account email..." : accountEmail || "No email found"}
                    </div>
                    <input className="input" type="password" placeholder="Current password" value={resetCurrentPassword} onChange={(e) => setResetCurrentPassword(e.target.value)} />
                    <div>
                      <button style={primaryButton} onClick={() => void onSendResetLink()} disabled={sendingReset || savingPassword || loadingEmail || !accountEmail}>
                        {sendingReset ? "Sending..." : "Send reset link"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "Edit Profile" && (
            <section style={sectionCardStyle}>
              <div style={sectionHeaderStyle}>
                <h2 style={sectionTitleStyle}>Edit Profile</h2>
                <p style={sectionTextStyle}>
                  Update your personal and professional information from the profile editor.
                </p>
              </div>
              {profileError ? (
                <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", fontWeight: 700, marginBottom: 12 }}>
                  {profileError}
                </div>
              ) : null}
              {profileSuccess ? (
                <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--primary-border)", background: "var(--primary-weak)", color: "var(--primary-soft-text)", fontWeight: 700, marginBottom: 12 }}>
                  {profileSuccess}
                </div>
              ) : null}
              {loadingProfile ? (
                <div style={rowHint}>Loading profile fields...</div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={rowTitle}>Full name</span>
                      <input className="input" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your full name" />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={rowTitle}>Email</span>
                      <input className="input" type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="name@company.com" />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={rowTitle}>Matricule</span>
                      <input className="input" value={profileForm.matricule} onChange={(e) => setProfileForm((prev) => ({ ...prev, matricule: e.target.value }))} placeholder="EMP-0001" />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={rowTitle}>Phone</span>
                      <input className="input" value={profileForm.telephone} onChange={(e) => setProfileForm((prev) => ({ ...prev, telephone: e.target.value }))} placeholder="+216..." />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={rowTitle}>Hire date</span>
                      <input className="input" type="date" value={profileForm.date_embauche} onChange={(e) => setProfileForm((prev) => ({ ...prev, date_embauche: e.target.value }))} />
                    </label>

                    {isEmployee ? (
                      <>
                        <label style={{ display: "grid", gap: 8 }}>
                          <span style={rowTitle}>Job title</span>
                          <input className="input" value={profileForm.jobTitle} onChange={(e) => setProfileForm((prev) => ({ ...prev, jobTitle: e.target.value }))} placeholder="Software Engineer" />
                        </label>
                        <label style={{ display: "grid", gap: 8 }}>
                          <span style={rowTitle}>Experience years</span>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={profileForm.experienceYears}
                            onChange={(e) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                experienceYears: Math.max(0, Number(e.target.value || 0)),
                              }))
                            }
                          />
                        </label>
                        <label style={{ display: "grid", gap: 8 }}>
                          <span style={rowTitle}>Seniority level</span>
                          <select
                            className="select"
                            value={profileForm.seniorityLevel}
                            onChange={(e) =>
                              setProfileForm((prev) => ({
                                ...prev,
                                seniorityLevel: e.target.value as SeniorityLevel,
                              }))
                            }
                          >
                            <option value="JUNIOR">JUNIOR</option>
                            <option value="MID">MID</option>
                            <option value="SENIOR">SENIOR</option>
                          </select>
                        </label>
                      </>
                    ) : null}
                  </div>

                  {isEmployee ? (
                    <ExperienceSegmentsEditor
                      experienceYears={Math.max(0, Number(profileForm.experienceYears || 0))}
                      segments={experienceSegments}
                      onChange={setExperienceSegments}
                      domains={domains}
                      skills={skillOptions}
                      disabled={savingProfile}
                    />
                  ) : null}

                  <div>
                    <button style={primaryButton} onClick={() => void onSaveProfile()} disabled={savingProfile || loadingProfile}>
                      {savingProfile ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
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
              {(() => {
                const themeColorLabel =
                  THEME_COLOR_OPTIONS.find(
                    (option) => option.value.toLowerCase() === settings.themeColor.toLowerCase(),
                  )?.label || settings.themeColor;
                return [
                  ["Theme", settings.themeMode],
                  ["Theme color", themeColorLabel],
                  ["Density", settings.layoutDensity],
                  ["Font size", settings.fontSize],
                  ["Language", settings.language],
                  ["Date format", settings.dateFormat],
                  ["Time zone", settings.timeZone],
                  ["Currency", settings.currency],
                ];
              })().map(([label, value], index, arr) => (
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