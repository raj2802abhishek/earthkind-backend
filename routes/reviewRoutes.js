const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/product");
const Order = require("../models/Order");

// Helper function to recalculate product rating and total reviews count
const updateProductRatingSummary = async (productId) => {
  try {
    const reviews = await Review.find({ productId, status: "Approved" });
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      reviews: totalReviews
    });
  } catch (err) {
    console.error("Error updating product rating summary:", err);
  }
};

// GET /api/reviews/product/:productId
// Fetch approved reviews with sorting, filtering, and breakdown stats
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort, stars, photosOnly, verifiedOnly } = req.query;

    const baseFilter = { productId, status: "Approved" };

    // All approved reviews for summary calculation
    const allApprovedReviews = await Review.find(baseFilter);
    const totalReviews = allApprovedReviews.length;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumRating = 0;

    allApprovedReviews.forEach((rev) => {
      sumRating += rev.rating;
      if (breakdown[rev.rating] !== undefined) {
        breakdown[rev.rating]++;
      }
    });

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    // Filter Query for list
    const filterQuery = { ...baseFilter };

    if (stars && !isNaN(Number(stars))) {
      filterQuery.rating = Number(stars);
    }

    if (photosOnly === "true") {
      filterQuery.images = { $exists: true, $not: { $size: 0 } };
    }

    if (verifiedOnly === "true") {
      filterQuery.isVerifiedPurchase = true;
    }

    // Sort Query
    let sortOptions = { createdAt: -1 }; // default recent
    if (sort === "highest") sortOptions = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortOptions = { rating: 1, createdAt: -1 };
    if (sort === "helpful") sortOptions = { helpfulCount: -1, createdAt: -1 };

    const reviews = await Review.find(filterQuery).sort(sortOptions);

    res.status(200).json({
      reviews,
      summary: {
        averageRating,
        totalReviews,
        breakdown
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reviews/can-review
// Check if user is eligible to write a review
router.get("/can-review", async (req, res) => {
  try {
    const { email, productId, productName } = req.query;

    if (!email || (!productId && !productName)) {
      return res.status(200).json({
        canReview: false,
        isVerifiedPurchase: false,
        reason: "Email and Product info required"
      });
    }

    // Check if user already submitted a review
    const existingReview = await Review.findOne({ productId, userEmail: email.toLowerCase() });
    if (existingReview) {
      return res.status(200).json({
        canReview: false,
        isVerifiedPurchase: existingReview.isVerifiedPurchase,
        alreadyReviewed: true,
        reason: "You have already reviewed this product"
      });
    }

    // Search user orders
    const orders = await Order.find({ email: email.toLowerCase() });

    let isPurchased = false;
    orders.forEach((ord) => {
      if (Array.isArray(ord.products)) {
        ord.products.forEach((p) => {
          if (
            (productId && String(p._id) === String(productId)) ||
            (productName && p.name && p.name.toLowerCase() === productName.toLowerCase())
          ) {
            isPurchased = true;
          }
        });
      }
    });

    if (!isPurchased) {
      return res.status(200).json({
        canReview: false,
        isVerifiedPurchase: false,
        alreadyReviewed: false,
        reason: "Reviews are restricted to verified purchasers who bought this item."
      });
    }

    return res.status(200).json({
      canReview: true,
      isVerifiedPurchase: true,
      alreadyReviewed: false,
      reason: "Verified purchaser"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/reviews/add
// Create a new review
router.post("/add", async (req, res) => {
  try {
    const { productId, userEmail, userName, userAvatar, rating, title, comment, images } = req.body;

    if (!productId || !userEmail || !rating || !title || !comment) {
      return res.status(400).json({ message: "Please provide all required review fields" });
    }

    // Verify purchase
    const orders = await Order.find({ email: userEmail.toLowerCase() });
    let isVerified = false;

    orders.forEach((ord) => {
      if (Array.isArray(ord.products)) {
        ord.products.forEach((p) => {
          if (String(p._id) === String(productId)) {
            isVerified = true;
          }
        });
      }
    });

    // Check if user already reviewed
    const existing = await Review.findOne({ productId, userEmail: userEmail.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const newReview = new Review({
      productId,
      userEmail: userEmail.toLowerCase(),
      userName: userName || "Verified Customer",
      userAvatar: userAvatar || "",
      rating: Number(rating),
      title,
      comment,
      images: Array.isArray(images) ? images : [],
      isVerifiedPurchase: isVerified,
      status: "Approved"
    });

    const savedReview = await newReview.save();

    // Recalculate Product rating
    await updateProductRatingSummary(productId);

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/reviews/helpful/:reviewId
// Toggle helpful upvote
router.post("/helpful/:reviewId", async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userIdentifier } = req.body;

    if (!userIdentifier) {
      return res.status(400).json({ message: "User identifier required" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const alreadyVoted = review.helpfulUsers.includes(userIdentifier);

    if (alreadyVoted) {
      review.helpfulUsers = review.helpfulUsers.filter((id) => id !== userIdentifier);
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      review.helpfulUsers.push(userIdentifier);
      review.helpfulCount += 1;
    }

    await review.save();

    res.status(200).json({
      helpfulCount: review.helpfulCount,
      isHelpful: !alreadyVoted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reviews/admin/all
// Admin fetch all reviews
router.get("/admin/all", async (req, res) => {
  try {
    const reviews = await Review.find().populate("productId", "name image price").sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/reviews/admin/status/:reviewId
// Admin update review status
router.put("/admin/status/:reviewId", async (req, res) => {
  try {
    const { status } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { status },
      { new: true, returnDocument: "after" }
    );

    if (review) {
      await updateProductRatingSummary(review.productId);
    }

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/reviews/admin/:reviewId
// Admin delete review
router.delete("/admin/:reviewId", async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);
    if (review) {
      await updateProductRatingSummary(review.productId);
    }
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
