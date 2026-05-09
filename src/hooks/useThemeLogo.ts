import { useEffect, useState } from "react";
import { getThemeLogoSrc, readStoredThemeColor } from "../utils/themePreferences";

type ThemeUpdatedDetail = {
  color?: string;
};

export function useThemeLogo() {
  const [logoSrc, setLogoSrc] = useState(() => getThemeLogoSrc(readStoredThemeColor()));

  useEffect(() => {
    const updateLogo = (event?: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as ThemeUpdatedDetail | undefined) : undefined;
      setLogoSrc(getThemeLogoSrc(detail?.color ?? readStoredThemeColor()));
    };

    updateLogo();
    globalThis.addEventListener("app-theme-updated", updateLogo as EventListener);

    return () => {
      globalThis.removeEventListener("app-theme-updated", updateLogo as EventListener);
    };
  }, []);

  return logoSrc;
}