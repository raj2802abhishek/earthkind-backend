const express = require("express");

const router = express.Router();

const Reward =
require("../models/Reward");
const Coupon =
require("../models/Coupon");

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Reward Route Working"
  });
});

router.get("/:email",
async (req, res) => {

  try {

    let reward =
      await Reward.findOne({
        email:
          req.params.email
      });

    if (!reward) {

      reward =
      await Reward.create({

        email:
          req.params.email,

        points: 0,

        lifetimeEarned: 0,

        tier: "Bronze",

        transactions: []

      });

    }

    res.json(reward);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});

router.post(
"/redeem-coupon",
async (req, res) => {

try {

const {
email,
pointsRequired,
couponValue
} = req.body;

const reward =
await Reward.findOne({
email
});

if (!reward) {

return res.status(404).json({
message:
"Reward account not found"
});

}

if (
reward.points <
pointsRequired
) {

return res.status(400).json({
message:
"Not enough reward points"
});

}

reward.points -=
pointsRequired;

reward.transactions.unshift({

title:
`Redeemed ₹${couponValue} Coupon`,

points:
-pointsRequired,

type:
"redeem"

});

await reward.save();

const couponCode =
`RW${Date.now()}`
.slice(-10);


const coupon =
await Coupon.create({

  code: couponCode,

  discount: couponValue,

  type: "fixed",

  isActive: true,

  rewardCoupon: true,

  ownerEmail: email
});

res.json({

success: true,

coupon

});

} catch (error) {

res.status(500).json({
message:
error.message
});

}

});

module.exports = router;