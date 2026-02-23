import { v2 as cloudinary } from "cloudinary";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
      return res.status(500).json({
        ok: false,
        error: "Missing Cloudinary environment variables",
        detail: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Vercel.",
      });
    }

    cloudinary.config({ cloud_name, api_key, api_secret });

    // IMPORTANT: default = root folders
    const hasPrefixParam = Object.prototype.hasOwnProperty.call(req.query || {}, "prefix");
    const prefix = hasPrefixParam ? String(req.query.prefix ?? "").replace(/^\/|\/$/g, "") : "";

    let result;
    if (!prefix) result = await cloudinary.api.root_folders();
    else result = await cloudinary.api.sub_folders(prefix);

    const albums = (result.folders || [])
      .map((f) => ({ name: f.name, path: f.path, albumId: f.path }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ ok: true, root: prefix, count: albums.length, albums });
  } catch (err) {
    console.error("GET /api/albums failed:", err);

    const detail =
      err?.error?.message || err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err));

    return res.status(500).json({ ok: false, error: "Failed to list albums", detail });
  }
}
