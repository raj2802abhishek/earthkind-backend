const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");


// CREATE COUPON
router.post("/", async (req, res) => {
  try {
    const { code, discount, type } = req.body;

    const newCoupon = new Coupon({
      code,
      discount,
      type
    });

    await newCoupon.save();

    res.status(201).json({
      message: "Coupon created successfully",
      coupon: newCoupon
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating coupon",
      error
    });
  }
});


// GET ALL COUPONS
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching coupons",
      error
    });
  }
});



router.get(
  "/user/:email",

  async (req, res) => {

    try {

      const coupons =
        await Coupon.find({

          ownerEmail:
            req.params.email

        }).sort({
          createdAt: -1
        });

      res.json(coupons);

    } catch (error) {

      res.status(500).json({
        message:
          error.message
      });

    }

  }
);


// DELETE COUPON
router.delete("/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Coupon deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting coupon",
      error
    });
  }
});

module.exports = router;