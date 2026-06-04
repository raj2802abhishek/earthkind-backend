const express = require("express");

const router = express.Router();

const Reward =
require("../models/Reward");

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

module.exports = router;