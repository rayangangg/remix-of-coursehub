// Serves root-level files from the "course-materials" Supabase bucket
// directly at the site's own domain, e.g. yourdomain.com/google123.html
//
// Only single-segment, root-level filenames are ever served here (no
// subfolders) — this matches the "Anyone can read shared root files"
// storage policy, so course materials in subfolders stay private even
// if this endpoint is called directly.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = "course-materials";

module.exports = async function handler(req, res) {
  try {
    const rawPath = typeof req.query.path === "string" ? req.query.path : "";
    const filename = rawPath.replace(/^\/+/, "");

    // Only allow a single, root-level filename — never traverse into subfolders.
    if (!filename || filename.includes("/") || filename.includes("..")) {
      res.status(404).send("Not found");
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send("Storage not configured");
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.storage.from(BUCKET).download(filename);

    if (error || !data) {
      res.status(404).send("Not found");
      return;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", data.type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
    res.status(200).send(buffer);
  } catch (e) {
    res.status(500).send("Internal error");
  }
};
