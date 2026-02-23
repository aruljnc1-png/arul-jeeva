import { v2 as cloudinary } from "cloudinary";

export default async function handler(req, res) {
  // Enable CORS (so GitHub Pages frontend can call this)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    // Read env vars from Vercel
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
      return res.status(500).json({
        ok: false,
        error: "Missing Cloudinary environment variables",
        detail:
          "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel project settings.",
      });
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });

    // Optional root folder
    const root = (process.env.CLOUDINARY_FOLDER_ROOT || "")
      .replace(/^\/|\/$/g, "");

    // Allow override via query param
    const prefix = (req.query?.prefix
      ? String(req.query.prefix)
      : root
    ).replace(/^\/|\/$/g, "");

    let result;

    if (!prefix) {
      // List root folders
      result = await cloudinary.api.root_folders();
    } else {
      // List subfolders of specific folder
      result = await cloudinary.api.sub_folders(prefix);
    }

    // Format albums list
    const albums = (result.folders || [])
      .map((folder) => ({
        name: folder.name,
        path: folder.path,
        albumId: folder.path,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      ok: true,
      root: prefix || "",
      count: albums.length,
      albums,
    });

  } catch (err) {
    console.error("GET /api/albums failed:", err);

    // Extract readable error message
    let detail;

    if (err?.error?.message) {
      detail = err.error.message;
    } else if (err?.message) {
      detail = err.message;
    } else {
      detail = JSON.stringify(err, Object.getOwnPropertyNames(err));
    }

    return res.status(500).json({
      ok: false,
      error: "Failed to list albums",
      detail,
    });
  }
}
