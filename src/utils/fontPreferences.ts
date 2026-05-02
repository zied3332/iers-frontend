export const FONT_SCALE_STORAGE_KEY = "fontScale";

const DEFAULT_FONT_SCALE = 1;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.3;

const FONT_SIZES_PX = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 31, 32, 34, 38, 42, 44, 46,
] as const;

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
  const scope = getCurrentUserScope();
  const scoped = localStorage.getItem(`${baseKey}:${scope}`);
  if (scoped != null) return scoped;
  if (scope !== "guest") return null;
  return localStorage.getItem(baseKey);
}

function clampScale(value: number): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
}

function normalizeScale(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_FONT_SCALE;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_FONT_SCALE;
  return clampScale(n);
}

function legacyFontScaleFromSize(raw: string | null | undefined): number | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "small") return 0.9;
  if (v === "medium") return 1;
  if (v === "large") return 1.1;
  return null;
}

export function readStoredFontScale(): number {
  try {
    const stored = getStoredValueWithFallback(FONT_SCALE_STORAGE_KEY);
    if (stored != null) return normalizeScale(stored);
    // Migration: ancien stockage "fontSize" -> scale
    const legacy = legacyFontScaleFromSize(getStoredValueWithFallback("fontSize"));
    return legacy ?? DEFAULT_FONT_SCALE;
  } catch {
    return DEFAULT_FONT_SCALE;
  }
}

export function applyFontPreferences({
  scale,
  persist = true,
}: {
  scale?: number;
  persist?: boolean;
}) {
  const resolvedScale = clampScale(scale ?? readStoredFontScale());

  document.documentElement.style.setProperty("--app-font-scale", String(resolvedScale));
  for (const basePx of FONT_SIZES_PX) {
    const scaled = Math.round(basePx * resolvedScale * 10) / 10;
    document.documentElement.style.setProperty(`--fz-${basePx}`, `${scaled}px`);
  }

  if (persist) {
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(resolvedScale));
      localStorage.setItem(scopedStorageKey(FONT_SCALE_STORAGE_KEY), String(resolvedScale));
    } catch {
      // ignore storage errors
    }
  }

  window.dispatchEvent(
    new CustomEvent("app-font-updated", {
      detail: { scale: resolvedScale },
    }),
  );
}

