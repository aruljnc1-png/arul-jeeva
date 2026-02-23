import crypto from "crypto";

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export default async function handler(req, res) {
  // CORS for GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

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

    const body = req.body || {};
    const albumName = typeof body.albumName === "string" ? body.albumName.trim() : "";

    if (!albumName) {
      return res.status(400).json({ ok: false, error: "Missing albumName" });
    }

    // Use EXACT folder name as your album (keeps spaces like 'Valentines 2026')
    const folder = albumName;

    const timestamp = Math.floor(Date.now() / 1000);

    // Params to sign (must match what frontend sends to Cloudinary)
    const paramsToSign = {
      folder,
      timestamp,
    };

    const toSign = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");

    const signature = sha1(toSign + api_secret);

    return res.status(200).json({
      ok: true,
      cloudName: cloud_name,
      apiKey: api_key,
      folder,
      timestamp,
      signature,
    });
  } catch (err) {
    console.error("POST /api/upload failed:", err);
    const detail =
      err?.error?.message || err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err));

    return res.status(500).json({ ok: false, error: "Failed to create upload signature", detail });
  }
}
