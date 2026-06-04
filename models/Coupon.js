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

oownerEmail: {
  type: String,
  default: ""
},

expiresAt: {

  type: Date,

  default: () => {

    const date =
      new Date();

    date.setDate(
      date.getDate() + 30
    );

    return date;

  }

},
used: {

  type: Boolean,

  default: false

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