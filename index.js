const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors({ origin: "*" }));

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dtamlqfx3",
  api_key: process.env.CLOUD_KEY || "843788176986132",
  api_secret: process.env.CLOUD_SECRET || "GTE9kT99gUvO_sRZeWNEMrMY32s"
});

app.get("/albums", async (req, res) => {
  try {
    const result = await cloudinary.api.sub_folders("/");
    const folders = result.folders;

    const albums = await Promise.all(folders.map(async folder => {
      // get all photos in the folder
      const resources = await cloudinary.api.resources({
        type: "upload",
        prefix: folder.path + "/",
        max_results: 500
      });

      return {
        name: folder.name,
        thumbnail: resources.resources[0]?.secure_url || "", // first photo or blank
        photos: resources.resources.map(r => r.secure_url)
      };
    }));

    res.json(albums);
  } catch (err) {
    console.error("Error fetching albums:", err);
    res.json([]); // return empty array instead of 404
  }
});

module.exports = app;
