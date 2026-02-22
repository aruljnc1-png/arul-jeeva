const express = require("express");
const cloudinary = require("cloudinary").v2;

const app = express();

/**
 * HARD CORS (works reliably on Vercel)
 */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
});

// Root health check (optional)
app.get("/", (req, res) => {
  res.send("OK - backend running. Try /albums");
});

// Albums endpoint
app.get("/albums", async (req, res) => {
  try {
    const result = await cloudinary.api.sub_folders("/");
    const folders = result.folders || [];

    const albums = await Promise.all(
      folders.map(async (folder) => {
        const resources = await cloudinary.api.resources({
          type: "upload",
          prefix: folder.path + "/",
          max_results: 500
        });

        const items = resources.resources || [];
        return {
          name: folder.name,
          thumbnail: items[0]?.secure_url || "",
          photos: items.map((r) => r.secure_url)
        };
      })
    );

    res.json(albums);
  } catch (err) {
    console.error("Error fetching albums:", err);
    res.status(200).json([]); // never crash the frontend
  }
});

module.exports = app;
