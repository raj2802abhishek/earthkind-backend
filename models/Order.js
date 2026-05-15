const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    address: {
      type: String,
      required: true
    },

    email: {
  type: String,
  required: true
},

    products: [
      {
        name: String,
        price: Number,
        quantity: Number
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    discount: {
      type: Number,
      default: 0
    },

    finalAmount: {
      type: Number,
      required: true
    },

    paymentMethod: {
      type: String,
      required: true
    },
    deliveryInstruction: {
  type: String,
  default: ""
},

saturdayDelivery: {
  type: Boolean,
  default: false
},

sundayDelivery: {
  type: Boolean,
  default: false
},
    

    status: {
  type: String,
  default: "Pending"
},

deliveredAt: {
  type: Date,
  default: null
}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);