export type PlayableVideo = {
  url: string;
  kind: "iframe" | "file";
};

const YOUTUBE_HOSTS = ["youtube.com", "youtu.be", "youtube-nocookie.com", "m.youtube.com"];

export const isDirectPlayableVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg|ogv|m4v|mov)(\?.*)?$/i.test(url);
};

const idFromPath = (pathname: string, index: number): string | null =>
  pathname.split("/").filter(Boolean)[index] ?? null;

/**
 * Resolves a video link from any common provider into something we can render.
 * Falls back to embedding the original URL in an iframe so a valid link is
 * never reported as invalid.
 */
export const resolveVideo = (rawUrl?: string | null): PlayableVideo | null => {
  const value = rawUrl?.trim();
  if (!value) return null;

  // Raw iframe embed code pasted by an admin
  const iframeSrc = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  if (iframeSrc) return { url: iframeSrc, kind: "iframe" };

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname;

  // YouTube (watch, short links, shorts, live, embed, playlists)
  if (YOUTUBE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    let videoId: string | null = null;
    if (host.includes("youtu.be")) videoId = idFromPath(path, 0);
    else if (path === "/watch") videoId = url.searchParams.get("v");
    else if (path.startsWith("/embed/")) videoId = idFromPath(path, 1);
    else if (path.startsWith("/shorts/")) videoId = idFromPath(path, 1);
    else if (path.startsWith("/live/")) videoId = idFromPath(path, 1);
    else if (path.startsWith("/v/")) videoId = idFromPath(path, 1);

    const list = url.searchParams.get("list");
    if (videoId) {
      const extra = list ? `&list=${list}` : "";
      return { url: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${extra}`, kind: "iframe" };
    }
    if (list) {
      return { url: `https://www.youtube.com/embed/videoseries?list=${list}`, kind: "iframe" };
    }
  }

  // Google Drive
  if (host.endsWith("drive.google.com")) {
    const fileId = path.match(/\/d\/([^/]+)/)?.[1] || url.searchParams.get("id");
    if (fileId) return { url: `https://drive.google.com/file/d/${fileId}/preview`, kind: "iframe" };
  }

  // Vimeo
  if (host.endsWith("vimeo.com")) {
    if (host.startsWith("player.")) return { url: normalized, kind: "iframe" };
    const parts = path.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) {
      const hash = parts[parts.indexOf(id) + 1];
      return { url: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`, kind: "iframe" };
    }
  }

  // Dailymotion
  if (host.endsWith("dailymotion.com") || host.endsWith("dai.ly")) {
    const id = host.endsWith("dai.ly") ? idFromPath(path, 0) : path.match(/\/video\/([^/?]+)/)?.[1];
    if (id) return { url: `https://www.dailymotion.com/embed/video/${id}`, kind: "iframe" };
  }

  // Facebook / Instagram
  if (host.endsWith("facebook.com") || host.endsWith("fb.watch")) {
    return {
      url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false`,
      kind: "iframe",
    };
  }

  // Streamable
  if (host.endsWith("streamable.com")) {
    const id = idFromPath(path, 0);
    if (id && id !== "e") return { url: `https://streamable.com/e/${id}`, kind: "iframe" };
  }

  // Loom
  if (host.endsWith("loom.com")) {
    const id = path.match(/\/(?:share|embed)\/([^/?]+)/)?.[1];
    if (id) return { url: `https://www.loom.com/embed/${id}`, kind: "iframe" };
  }

  // Wistia
  if (host.endsWith("wistia.com") || host.endsWith("wi.st")) {
    const id = path.match(/\/(?:medias|embed\/iframe)\/([^/?]+)/)?.[1];
    if (id) return { url: `https://fast.wistia.net/embed/iframe/${id}`, kind: "iframe" };
  }

  // Twitch
  if (host.endsWith("twitch.tv")) {
    const id = idFromPath(path, 0);
    if (id) {
      return {
        url: `https://player.twitch.tv/?channel=${id}&parent=${window.location.hostname}`,
        kind: "iframe",
      };
    }
  }

  // Direct files (mp4/webm/…), incl. cloud storage links
  if (isDirectPlayableVideoUrl(normalized)) return { url: normalized, kind: "file" };

  // Anything else (Bunny/mediadelivery, Odysee, Rumble, custom players, …)
  return { url: normalized, kind: "iframe" };
};

/** Backwards compatible helper: returns an embeddable URL or null. */
export const getEmbeddableVideoUrl = (rawUrl?: string | null): string | null =>
  resolveVideo(rawUrl)?.url ?? null;
