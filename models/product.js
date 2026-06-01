const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(

  {

    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    /* ====================================
       MAIN IMAGE
    ==================================== */

    image: {
      type: String,
      required: true
    },

    /* ====================================
       MULTIPLE IMAGES
    ==================================== */

    images: {
      type: [String],
      default: []
    },

    /* ====================================
       PRODUCT STORY
    ==================================== */

    story: {
      type: String,
      default: ""
    },

    /* ====================================
       HOW TO USE
    ==================================== */

    howToUse: {
      type: [String],
      default: []
    },

    /* ====================================
       BENEFITS
    ==================================== */

    benefits: {
      type: [String],
      default: []
    },

    /* ====================================
       INGREDIENTS
    ==================================== */

    ingredients: {
      type: [String],
      default: []
    },

    /* ====================================
       TAGS
    ==================================== */

    tags: {
      type: [String],
      default: []
    },

    /* ====================================
       INVENTORY
    ==================================== */

    stock: {
      type: Number,
      required: true,
      default: 0
    },

    sold: {
      type: Number,
      default: 0
    },

    featured: {
      type: Boolean,
      default: false
    },

    /* ====================================
       RATINGS
    ==================================== */

    rating: {
      type: Number,
      default: 0
    },

    reviews: {
      type: Number,
      default: 0
    }

  },

  { timestamps: true }

);

const Product =
  mongoose.model(
    "Product",
    productSchema
  );

module.exports = Product;