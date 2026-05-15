
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// REGISTER USER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// LOGIN USER
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

   res.status(200).json({
  message: "Login successful",
  token,

  user: {
    name: user.name,
    email: user.email,

    isAdmin: user.isAdmin
  }
});

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


const transporter = require("../config/email");



// SEND PHONE OTP (TEST MODE)
router.post("/send-phone-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone required" });
    }

    // create or find user
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ phone, name: "User" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.phoneOTP = otp;
    user.phoneOTPExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    console.log("PHONE OTP:", otp); // 🔥 TEST MODE

    res.json({ message: "OTP sent (check server console)" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// VERIFY PHONE OTP
router.post("/verify-phone-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (
      user.phoneOTP !== otp ||
      user.phoneOTPExpire < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    user.phoneOTP = undefined;
    user.phoneOTPExpire = undefined;

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        name: user.name || "User",
        phone: user.phone
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SEND OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
  html: `
  <div style="font-family: Arial, sans-serif; text-align:center; padding:20px;">

    <!-- LOGO -->
    <img 
      src="https://res.cloudinary.com/dzq3q5skk/image/upload/v1777744528/logo_3_khoyqd.png" 
      alt="Earthkind Naturals"
      style="width:120px;margin-bottom:10px;"
    />

    <!-- BRAND NAME -->
    <h2 style="color:#234d2c; margin:5px 0;">
      Pure Nature, Pure Wellness 🌿
    </h2>

    <p style="font-size:16px;">
      Your password reset OTP is:
    </p>
    <!-- OTP -->
    <h1 style="letter-spacing:6px; font-size:32px;">
      ${otp}
    </h1>
    <p style="color:#555;">
      This OTP is valid for 10 minutes
    </p>

    <hr style="margin:10px 0;" />

    <small style="color:#888;">
      If you didn’t request this, ignore this email
    </small>

  </div>
`
    });

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (
      user.resetOTP != otp ||
      user.resetOTPExpire < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save();

    res.json({
      message: "Password reset successful"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// TOTAL USERS COUNT
router.get("/count", async (req, res) => {

  try {

    const totalUsers =
      await User.countDocuments();

    res.status(200).json({
      totalUsers
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});

module.exports = router;