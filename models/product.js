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

    image: {
      type: String,
      required: true
    },

    // INVENTORY
    stock: {
      type: Number,
      required: true,
      default: 0
    },

    // PRODUCT ANALYTICS
    sold: {
      type: Number,
      default: 0
    },

    featured: {
      type: Boolean,
      default: false
    },

    // RATINGS
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

const Product = mongoose.model(
  "Product",
  productSchema
);

module.exports = Product;