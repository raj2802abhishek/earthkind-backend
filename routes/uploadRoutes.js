const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const safeName = (file.originalname || "image")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    return {
      folder: "earthkind-products",
      resource_type: "image",
      public_id: `${Date.now()}-${safeName}-${Math.round(Math.random() * 1e6)}`
    };
  }
});

const upload = multer({
  storage,
  limits: {
    files: 20,
    fileSize: 8 * 1024 * 1024
  }
});

router.post(
  "/",
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("MULTER UPLOAD ERROR:", err);
        return res.status(400).json({
          message: err.message || "File upload error",
          error: err.message
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];

      if (!files.length) {
        return res.status(400).json({
          message: "No file uploaded"
        });
      }

      const imageUrls = files
        .map((file) => file.path || file.secure_url || file.url)
        .filter(Boolean);

      if (!imageUrls.length) {
        return res.status(500).json({
          message: "Image upload failed"
        });
      }

      res.status(200).json({
        imageUrl: imageUrls[0],
        imageUrls
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: "Image upload failed",
        error: error.message
      });
    }
  }
);

module.exports = router;
