const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  phone: {
  type: String,
  unique: true,
  sparse: true
},

phoneOTP: String,
phoneOTPExpire: Date,
  
  name: {
    type: String,
    required: true
  },

  email: {
  type: String,
  unique: true,
  sparse: true   // ✅ IMPORTANT
},

password: {
  type: String
},

  isAdmin: {
    type: Boolean,
    default: false
  },
  resetOTP: Number,
  resetOTPExpire: Date

  
  

}, { timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;