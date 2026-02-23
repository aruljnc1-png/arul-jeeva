import { v2 as cloudinary } from "cloudinary";

export default async function handler(req, res) {
  // CORS for GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

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

    const album = req.query?.album ? String(req.query.album) : "";
    if (!album) return res.status(400).json({ ok: false, error: "Missing ?album=" });

    const max = Math.min(parseInt(req.query?.max || "80", 10) || 80, 200);
    const next_cursor = req.query?.next_cursor ? String(req.query.next_cursor) : undefined;

    // Prefix must include trailing slash to limit to that folder
    const prefix = album.endsWith("/") ? album : album + "/";

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix,
      max_results: max,
      next_cursor,
    });

    const images = (result.resources || []).map((r) => ({
      public_id: r.public_id,
      format: r.format,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      created_at: r.created_at,
      resource_type: r.resource_type, // "image" or "video"
      secure_url: r.secure_url,
    }));

    return res.status(200).json({
      ok: true,
      album,
      count: images.length,
      next_cursor: result.next_cursor || null,
      images,
    });
  } catch (err) {
    console.error("GET /api/images failed:", err);
    const detail =
      err?.error?.message || err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err));

    return res.status(500).json({ ok: false, error: "Failed to list images", detail });
  }
}
