const express = require("express");
const router = express.Router();

const Product = require("../models/product");


// ADD PRODUCT
router.post("/add", async (req, res) => {

  try {

    const body = { ...req.body };
    const gallery = Array.isArray(body.images)
      ? body.images.filter(Boolean)
      : [];

    if (!body.image && gallery.length) {
      body.image = gallery[0];
    }

    if (body.image && !gallery.includes(body.image)) {
      body.images = [body.image, ...gallery];
    } else {
      body.images = gallery;
    }

    const newProduct =
      new Product(body);

    const savedProduct =
      await newProduct.save();

    res.status(201).json(
      savedProduct
    );

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});


// GET ALL PRODUCTS
router.get("/", async (req, res) => {

  try {

    const products =
      await Product.find().sort({ createdAt: -1 });

    res.status(200).json(
      products
    );

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});


// DELETE PRODUCT
router.delete(
  "/delete/:id",

  async (req, res) => {

    try {

      await Product.findByIdAndDelete(
        req.params.id
      );

      res.status(200).json({
        message:
          "Product deleted successfully"
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);


// UPDATE PRODUCT
router.put(
  "/update/:id",

  async (req, res) => {

    try {

      const updatedProduct =
        await Product.findByIdAndUpdate(

          req.params.id,

          {
            name: req.body.name,
            price: req.body.price
          },

          { new: true, returnDocument: "after" }

        );

      res.status(200).json(
        updatedProduct
      );

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);


// UPDATE PRODUCT STOCK
router.put(
  "/stock/:id",

  async (req, res) => {

    try {

      const updatedProduct =
        await Product.findByIdAndUpdate(

          req.params.id,

          {
            stock: req.body.stock
          },

          { new: true, returnDocument: "after" }

        );

      res.status(200).json(
        updatedProduct
      );

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);


module.exports = router;