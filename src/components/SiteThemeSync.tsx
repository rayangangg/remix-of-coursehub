import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const SiteThemeSync = () => {
  const { data: settings, dataUpdatedAt } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;
    const hue = clamp(Number(settings.primary_hue) || 28, 0, 360);
    const saturation = clamp(Number(settings.primary_saturation) || 95, 0, 100);
    const lightness = clamp(Number(settings.primary_lightness) || 50, 0, 100);
    const foreground = lightness > 60 ? "0 0% 10%" : "0 0% 100%";
    const value = `${hue} ${saturation}% ${lightness}%`;

    root.style.setProperty("--primary", value);
    root.style.setProperty("--accent", value);
    root.style.setProperty("--ring", value);
    root.style.setProperty("--sidebar-primary", value);
    root.style.setProperty("--primary-foreground", foreground);
    root.style.setProperty("--accent-foreground", foreground);
    root.style.setProperty("--sidebar-primary-foreground", foreground);
  }, [settings, dataUpdatedAt]);

  return null;
};

export default SiteThemeSync;
