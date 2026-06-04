const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true
    },

    discount: {
      type: Number,
      required: true
    },

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed"
    },

   isActive: {
  type: Boolean,
  default: true
},

rewardCoupon: {
  type: Boolean,
  default: false
},

ownerEmail: {
  type: String,
  default: ""
}
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Coupon",
  couponSchema
);