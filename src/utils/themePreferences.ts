export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "themeMode";
export const THEME_COLOR_STORAGE_KEY = "themeColor";
export const DEFAULT_THEME_COLOR = "#10b981";

export const THEME_COLOR_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Emerald", value: "#10b981" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Sky", value: "#38bdf8" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pastel Pink", value: "#f9a8d4" },
  { label: "Amber", value: "#f59e0b" },
];

const COLOR_SET = new Set(THEME_COLOR_OPTIONS.map((item) => item.value.toLowerCase()));

function getCurrentUserScope(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "guest";
    const user = JSON.parse(raw) as {
      _id?: string;
      id?: string;
      email?: string;
    };
    const scoped = String(user?._id || user?.id || user?.email || "").trim();
    return scoped || "guest";
  } catch {
    return "guest";
  }
}

function scopedStorageKey(baseKey: string): string {
  return `${baseKey}:${getCurrentUserScope()}`;
}

function getStoredValueWithFallback(baseKey: string): string | null {
  const scoped = localStorage.getItem(scopedStorageKey(baseKey));
  if (scoped != null) return scoped;
  return localStorage.getItem(baseKey);
}

function normalizeHexColor(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_THEME_COLOR;
  const value = raw.trim().toLowerCase();
  return COLOR_SET.has(value) ? value : DEFAULT_THEME_COLOR;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "").trim();
  const full = cleaned.length === 3
    ? `${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`
    : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(16, 185, 129, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(baseHex: string, mixHexColor: string, weight: number): string {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHexColor);
  if (!base || !mix) return baseHex;
  const w = Math.min(1, Math.max(0, weight));
  return rgbToHex(
    Math.round(base.r * (1 - w) + mix.r * w),
    Math.round(base.g * (1 - w) + mix.g * w),
    Math.round(base.b * (1 - w) + mix.b * w),
  );
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const normalize = (n: number) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
}

export function readStoredThemeMode(): ThemeMode {
  try {
    const stored = getStoredValueWithFallback(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function readStoredThemeColor(): string {
  try {
    const stored = getStoredValueWithFallback(THEME_COLOR_STORAGE_KEY);
    return normalizeHexColor(stored);
  } catch {
    return DEFAULT_THEME_COLOR;
  }
}

export function applyThemePreferences({
  mode,
  color,
  persist = true,
}: {
  mode?: ThemeMode;
  color?: string;
  persist?: boolean;
}) {
  const resolvedMode = mode ?? readStoredThemeMode();
  const resolvedColor = normalizeHexColor(color ?? readStoredThemeColor());
  const primaryHover = mixHex(resolvedColor, "#000000", 0.14);
  const primaryActive = mixHex(resolvedColor, "#000000", 0.26);
  const primarySoftText = mixHex(resolvedColor, "#000000", 0.46);
  const auth1 = mixHex(resolvedColor, "#ffffff", 0.06);
  const auth2 = mixHex(resolvedColor, "#000000", 0.12);
  const auth3 = mixHex(resolvedColor, "#000000", 0.24);
  const auth4 = mixHex(resolvedColor, "#000000", 0.34);
  const auth5 = mixHex(resolvedColor, "#000000", 0.42);
  const onPrimary = luminance(resolvedColor) > 0.58 ? "#0f172a" : "#ffffff";

  document.documentElement.setAttribute("data-theme", resolvedMode);
  document.body.setAttribute("data-theme", resolvedMode);
  document.body.style.colorScheme = resolvedMode;

  document.documentElement.style.setProperty("--primary", resolvedColor);
  document.documentElement.style.setProperty("--sidebar-link-active-pill", resolvedColor);
  document.documentElement.style.setProperty("--primary-weak", toRgba(resolvedColor, 0.12));
  document.documentElement.style.setProperty("--primary-border", toRgba(resolvedColor, 0.22));
  document.documentElement.style.setProperty("--primary-hover", primaryHover);
  document.documentElement.style.setProperty("--primary-active", primaryActive);
  document.documentElement.style.setProperty("--primary-soft-text", primarySoftText);
  document.documentElement.style.setProperty("--primary-on", onPrimary);
  document.documentElement.style.setProperty("--auth-gradient-1", auth1);
  document.documentElement.style.setProperty("--auth-gradient-2", auth2);
  document.documentElement.style.setProperty("--auth-gradient-3", auth3);
  document.documentElement.style.setProperty("--auth-gradient-4", auth4);
  document.documentElement.style.setProperty("--auth-gradient-5", auth5);

  if (persist) {
    try {
      localStorage.setItem(scopedStorageKey(THEME_STORAGE_KEY), resolvedMode);
      localStorage.setItem(scopedStorageKey(THEME_COLOR_STORAGE_KEY), resolvedColor);
    } catch {
      // ignore storage errors
    }
  }

  window.dispatchEvent(
    new CustomEvent("app-theme-updated", {
      detail: { mode: resolvedMode, color: resolvedColor },
    }),
  );
}
