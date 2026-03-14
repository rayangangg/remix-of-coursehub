export const getEmbeddableVideoUrl = (rawUrl?: string | null): string | null => {
  const value = rawUrl?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host.includes("youtu.be")) {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] ?? null;
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] ?? null;
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }

    return isDirectPlayableVideoUrl(value) ? value : null;
  } catch {
    return isDirectPlayableVideoUrl(value) ? value : null;
  }
};

export const isDirectPlayableVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};
