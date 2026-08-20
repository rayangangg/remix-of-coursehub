// Serves root-level files from the "course-materials" Supabase bucket
// directly at the site's own domain, e.g. yourdomain.com/google123.html
//
// Only single-segment, root-level filenames are ever served here (no
// subfolders) — this matches the "Anyone can read shared root files"
// storage policy, so course materials in subfolders stay private even
// if this endpoint is called directly.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = "course-materials";

export default async function handler(req, res) {
  try {
    let rawPath = "";
    if (typeof req.query?.path === "string") {
      rawPath = req.query.path;
    } else if (req.url) {
      try {
        const u = new URL(req.url, "http://localhost");
        rawPath = u.searchParams.get("path") || "";
      } catch {
        rawPath = "";
      }
    }

    const filename = String(rawPath).replace(/^\/+/, "").trim();

    // Only allow a single, root-level filename — never traverse into subfolders.
    if (!filename || filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
      res.status(404).setHeader("Cache-Control", "no-store").send("Not found");
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
      res.status(500).setHeader("Cache-Control", "no-store").send("Storage not configured");
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.storage.from(BUCKET).download(filename);

    if (error || !data) {
      // Important: do not cache 404s for long, so deletes take effect quickly
      res.status(404).setHeader("Cache-Control", "public, max-age=10, s-maxage=10").send("Not found");
      return;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = data.type || "application/octet-stream";
    if (!contentType || contentType === "application/octet-stream") {
      const ext = filename.split(".").pop()?.toLowerCase();
      const map = {
        html: "text/html; charset=utf-8",
        htm: "text/html; charset=utf-8",
        txt: "text/plain; charset=utf-8",
        css: "text/css; charset=utf-8",
        js: "application/javascript; charset=utf-8",
        json: "application/json; charset=utf-8",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        pdf: "application/pdf",
        xml: "application/xml",
      };
      if (ext && map[ext]) contentType = map[ext];
    }

    res.setHeader("Content-Type", contentType);
    // Short cache so admin delete/upload becomes visible quickly
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
    res.setHeader("Content-Length", buffer.length);
    res.status(200).send(buffer);
  } catch (e) {
    console.error("public-file handler error:", e);
    res.status(500).setHeader("Cache-Control", "no-store").send("Internal error");
  }
}
