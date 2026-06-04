const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
{
  email: {
    type: String,
    required: true,
    unique: true
  },

  points: {
    type: Number,
    default: 0
  },

  lifetimeEarned: {
    type: Number,
    default: 0
  },

  tier: {
    type: String,
    default: "Bronze"
  },

  lastLoginReward: {
    type: Date,
    default: null
  },

  transactions: [
    {
      title: String,

      points: Number,

      type: {
        type: String,
        enum: [
          "signup",
          "login",
          "purchase",
          "redeem"
        ]
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
},
{
  timestamps: true
}
);

module.exports =
mongoose.model(
  "Reward",
  rewardSchema
);