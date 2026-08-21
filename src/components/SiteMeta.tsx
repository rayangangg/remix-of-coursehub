import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const SiteMeta = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;

    const title = settings.site_name
      ? `${settings.site_name} - Premium Online Courses`
      : "Premium Course - Premium Online Courses";

    document.title = title;

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", settings.hero_description || "");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", settings.hero_description || "");

    if (settings.og_image_url) {
      setMeta("property", "og:image", settings.og_image_url);
      setMeta("name", "twitter:image", settings.og_image_url);
    }

    // Favicon
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings]);

  return null;
};

export default SiteMeta;
