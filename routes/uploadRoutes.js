const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "earthkind-products",
    format: "png",
    public_id: Date.now() + "-" + file.originalname
  })
});

const upload = multer({ storage });

router.post(
  "/",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded"
        });
      }

      res.status(200).json({
        imageUrl: req.file.path
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