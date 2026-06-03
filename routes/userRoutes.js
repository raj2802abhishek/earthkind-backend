
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const transporter = require("../config/email");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
};


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
    _id: user._id,

    name: user.name || "",

    email: user.email || "",

    phone: user.phone || "",

    profileImage:
      user.profileImage || "",

    loginAlerts:
      user.loginAlerts ?? true,

    profileAlerts:
      user.profileAlerts ?? true,

    emailVerified:
      user.emailVerified ?? true,

    phoneVerified:
      user.phoneVerified ?? false,

    isAdmin: user.isAdmin
  }
});



  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});






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

    


const info = await transporter.sendMail({

 from: `"Earthkind Naturals 🌿" <no-reply@earthkindnaturals.shop>`,

  to: email,

  subject:
    "Verify Your New Email - Earthkind Naturals",

  html: `

    <div style="
      font-family:Arial;
      padding:30px;
      background:#f5f7f4;
    ">

      <div style="
        max-width:520px;
        margin:auto;
        background:white;
        border-radius:18px;
        padding:40px;
        border:1px solid #e8eee8;
      ">

        <h1 style="
          color:#163923;
          margin-top:0;
        ">
          Earthkind Naturals 🌿
        </h1>

        <p style="
          font-size:16px;
          color:#444;
        ">
          Your email verification OTP:
        </p>

        <div style="
          margin:30px 0;
          font-size:42px;
          letter-spacing:10px;
          font-weight:700;
          color:#163923;
          text-align:center;
        ">
          ${otp}
        </div>

        <p style="
          color:#777;
          font-size:14px;
        ">
          This OTP is valid for 10 minutes.
        </p>

      </div>

    </div>

  `
});

console.log(
  "MAIL SENT SUCCESSFULLY:",
  info.response
);




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

router.put(
  "/update-profile",
  authMiddleware,
  async (req, res) => {
    try {

      const {
        name,
        phone,
        profileImage,
        loginAlerts,
        profileAlerts
      } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

     if (name !== undefined) {
  user.name = name;
}

if (phone !== undefined) {
  user.phone = phone;
}

if (profileImage !== undefined) {
  user.profileImage = profileImage;
}

if (loginAlerts !== undefined) {
  user.loginAlerts = loginAlerts;
}

if (profileAlerts !== undefined) {
  user.profileAlerts = profileAlerts;
}
      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user
      });

    } catch (error) {

      console.log("UPDATE PROFILE ERROR:", error);

      res.status(500).json({
        message: "Server Error"
      });
    }
  }
);




// SEND EMAIL CHANGE OTP
router.post(
  "/send-email-change-otp",
  authMiddleware,
  async (req, res) => {

    try {

      console.log("EMAIL OTP ROUTE HIT");

      console.log("REQ BODY:", req.body);

      console.log("USER ID:", req.user?.id);

      const { email } = req.body;

      if (!email) {

        return res.status(400).json({
          message: "Email required"
        });

      }

      const existingUser =
        await User.findOne({ email });

      if (existingUser) {

        return res.status(400).json({
          message: "Email already in use"
        });

      }

      const otp =
        Math.floor(
          100000 + Math.random() * 900000
        ).toString();

      const user =
        await User.findById(req.user.id);

      if (!user) {

        return res.status(404).json({
          message: "User not found"
        });

      }

      user.emailOTP = otp;

      user.emailOTPExpire =
        Date.now() + 10 * 60 * 1000;

      await user.save();

      console.log("EMAIL OTP TO:", email);

      console.log("EMAIL OTP:", otp);


await transporter.sendMail({

  from: `"Earthkind Naturals 🌿" <no-reply@earthkindnaturals.shop>`,

  to: email,

  subject: "Verify Your New Email - Earthkind Naturals",

  html: `

  <div style="
    background:#f5f7f4;
    padding:40px;
    font-family:Arial,sans-serif;
  ">

<div style="
  max-width:540px;
  margin:auto;
  background:#ffffff;
  border-radius:24px;
  overflow:hidden;
  border:1px solid #e8efe8;
">

  <div style="
    background:linear-gradient(135deg,#163923,#285b37);
    padding:35px;
    text-align:center;
    color:white;
  ">

    <h1 style="
      margin:0;
      font-size:32px;
    ">
      Earthkind Naturals 🌿
    </h1>

    <p style="
      margin-top:10px;
      opacity:.9;
      font-size:15px;
    ">
      Secure Email Verification
    </p>

  </div>

  <div style="padding:40px;">

    <h2 style="
      color:#163923;
      margin-top:0;
    ">
      Verify Your New Email
    </h2>

    <p style="
      color:#555;
      line-height:1.7;
      font-size:15px;
    ">
      Use the verification code below
      to securely verify your account.
    </p>

    <div style="
      margin:35px 0;
      text-align:center;
    ">

      <div style="
        display:inline-block;
        background:#f3f8f3;
        border:1px solid #dbe8db;
        border-radius:18px;
        padding:22px 36px;
        font-size:42px;
        letter-spacing:10px;
        font-weight:700;
        color:#163923;
      ">
        ${otp}
      </div>

    </div>

    <p style="
      color:#777;
      font-size:14px;
    ">
      This OTP expires in 10 minutes.
    </p>

  </div>

</div>

  </div>

`
});



      return res.json({
        success: true,
        message: "OTP sent successfully"
      });

    } catch (error) {

      console.log(
        "SEND EMAIL CHANGE OTP ERROR:"
      );

      console.log(error);

      return res.status(500).json({

        message:
          error.message ||
          "Mail send failed"

      });

    }
  }
);




module.exports = router;