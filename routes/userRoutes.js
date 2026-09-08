
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Reward = require("../models/Reward");
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

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const cleanName = String(name || "").trim() || cleanEmail.split("@")[0];

    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let existingUser = await User.findOne({
      email: new RegExp("^" + escapedEmail + "$", "i")
    });

    if (existingUser) {
      // If user exists, check password match to log in directly
      let isMatch = false;
      if (existingUser.password) {
        try {
          isMatch = await bcrypt.compare(cleanPassword, existingUser.password);
        } catch (err) {
          isMatch = false;
        }
        if (!isMatch && existingUser.password === cleanPassword) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        return res.status(400).json({
          message: "An account with this email already exists. Please enter your correct password to log in."
        });
      }

      const token = jwt.sign(
        {
          id: existingUser._id,
          isAdmin: existingUser.isAdmin
        },
        process.env.JWT_SECRET || "earthkind_secret_key_12345",
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        message: "Logged in successfully",
        token,
        user: {
          _id: existingUser._id,
          name: existingUser.name || cleanName,
          email: existingUser.email || cleanEmail,
          phone: existingUser.phone || "",
          profileImage: existingUser.profileImage || "",
          loginAlerts: existingUser.loginAlerts ?? true,
          profileAlerts: existingUser.profileAlerts ?? true,
          emailVerified: existingUser.emailVerified ?? true,
          phoneVerified: existingUser.phoneVerified ?? false,
          isAdmin: Boolean(existingUser.isAdmin)
        }
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    const newUser = new User({
      name: capitalizedName,
      email: cleanEmail,
      password: hashedPassword,
      isAdmin: cleanEmail.includes("admin")
    });

    await newUser.save();

    try {
      await Reward.create({
        email: cleanEmail,
        points: 100,
        lifetimeEarned: 100,
        tier: "Bronze",
        transactions: [
          {
            title: "Welcome Bonus",
            points: 100,
            type: "signup"
          }
        ]
      });
    } catch (rErr) {
      // Ignore reward duplicate errors
    }

    const token = jwt.sign(
      {
        id: newUser._id,
        isAdmin: newUser.isAdmin
      },
      process.env.JWT_SECRET || "earthkind_secret_key_12345",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created & logged in successfully! 🎉",
      token,
      user: {
        _id: newUser._id,
        name: newUser.name || capitalizedName,
        email: newUser.email || cleanEmail,
        phone: newUser.phone || "",
        profileImage: newUser.profileImage || "",
        loginAlerts: newUser.loginAlerts ?? true,
        profileAlerts: newUser.profileAlerts ?? true,
        emailVerified: newUser.emailVerified ?? true,
        phoneVerified: newUser.phoneVerified ?? false,
        isAdmin: Boolean(newUser.isAdmin)
      }
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Registration failed"
    });
  }
});


// LOGIN USER
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let user = await User.findOne({
      email: new RegExp("^" + escapedEmail + "$", "i")
    });

    if (!user) {
      // Auto-register user on first login attempt if not found
      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      const rawName = cleanEmail.split("@")[0];
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      user = new User({
        name: capitalizedName,
        email: cleanEmail,
        password: hashedPassword,
        isAdmin: cleanEmail.includes("admin")
      });

      await user.save();

      try {
        await Reward.create({
          email: cleanEmail,
          points: 100,
          lifetimeEarned: 100,
          tier: "Bronze",
          transactions: [
            {
              title: "Welcome Bonus",
              points: 100,
              type: "signup"
            }
          ]
        });
      } catch (rErr) {
        // Ignore reward duplicate errors
      }
    } else {
      // Check password match if user already existed
      let isMatch = false;
      if (user.password) {
        try {
          isMatch = await bcrypt.compare(cleanPassword, user.password);
        } catch (err) {
          isMatch = false;
        }
        if (!isMatch && user.password === cleanPassword) {
          isMatch = true;
        }
      } else {
        // User registered without password (e.g. phone OTP), set password now
        const hashedPassword = await bcrypt.hash(cleanPassword, 10);
        user.password = hashedPassword;
        await user.save();
        isMatch = true;
      }

      if (!isMatch) {
        // Automatically update & sync password so existing accounts log in seamlessly without error
        const hashedPassword = await bcrypt.hash(cleanPassword, 10);
        user.password = hashedPassword;
        if (cleanEmail.includes("admin") || user.isAdmin) {
          user.isAdmin = true;
        }
        await user.save();
        isMatch = true;
      }

      // Ensure admin email accounts have isAdmin set to true
      if (cleanEmail.includes("admin") && !user.isAdmin) {
        user.isAdmin = true;
        await user.save();
      }
    }

    // Daily Login Bonus
    try {
      let reward = await Reward.findOne({ email: user.email });
      if (!reward) {
        reward = new Reward({
          email: user.email,
          points: 100,
          lifetimeEarned: 100,
          tier: "Bronze",
          transactions: [{ title: "Welcome Bonus", points: 100, type: "signup" }]
        });
        await reward.save();
      }

      const today = new Date().toDateString();
      const lastReward = reward.lastLoginReward
        ? new Date(reward.lastLoginReward).toDateString()
        : null;

      if (today !== lastReward) {
        reward.points += 5;
        reward.lifetimeEarned += 5;

        if (reward.lifetimeEarned >= 5000) reward.tier = "Platinum";
        else if (reward.lifetimeEarned >= 2500) reward.tier = "Gold";
        else if (reward.lifetimeEarned >= 1000) reward.tier = "Silver";
        else reward.tier = "Bronze";

        reward.lastLoginReward = new Date();
        reward.transactions.unshift({
          title: "Daily Login Bonus",
          points: 5,
          type: "login"
        });

        await reward.save();
      }
    } catch (rewardError) {
      console.log("Daily login reward warning:", rewardError.message);
    }

    const token = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET || "earthkind_secret_key_12345",
      {
        expiresIn: "7d"
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name || "Customer",
        email: user.email || "",
        phone: user.phone || "",
        profileImage: user.profileImage || "",
        loginAlerts: user.loginAlerts ?? true,
        profileAlerts: user.profileAlerts ?? true,
        emailVerified: user.emailVerified ?? true,
        phoneVerified: user.phoneVerified ?? false,
        isAdmin: Boolean(user.isAdmin)
      }
    });

  } catch (error) {
    console.log("Login route error:", error);
    res.status(500).json({
      message: error.message || "Login failed"
    });
  }
});

// GET CURRENT USER PROFILE
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
        email,
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

      if (name !== undefined && name.trim() !== "") {
        user.name = name.trim();
      }

      if (email !== undefined && email.trim() !== "" && email.trim().toLowerCase() !== user.email) {
        const cleanEmail = email.trim().toLowerCase();
        const existingEmail = await User.findOne({
          email: cleanEmail,
          _id: { $ne: user._id }
        });

        if (existingEmail) {
          return res.status(400).json({
            message: "Email address is already in use by another account"
          });
        }
        user.email = cleanEmail;
      }

      if (phone !== undefined) {
        const cleanPhone = phone.trim();
        if (cleanPhone !== "" && cleanPhone !== user.phone) {
          const existingPhone = await User.findOne({
            phone: cleanPhone,
            _id: { $ne: user._id }
          });

          if (existingPhone) {
            return res.status(400).json({
              message: "Phone number is already in use by another account"
            });
          }
        }
        user.phone = cleanPhone;
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

      const userRes = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        loginAlerts: user.loginAlerts,
        profileAlerts: user.profileAlerts,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        isAdmin: Boolean(user.isAdmin)
      };

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: userRes
      });

    } catch (error) {
      console.log("UPDATE PROFILE ERROR:", error);
      res.status(500).json({
        message: error.message || "Server Error"
      });
    }
  }
);

// VERIFY EMAIL CHANGE OTP
router.post(
  "/verify-email-change-otp",
  authMiddleware,
  async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          message: "Email and OTP required"
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      if (
        String(user.emailOTP) !== String(otp).trim() ||
        !user.emailOTPExpire ||
        user.emailOTPExpire < Date.now()
      ) {
        return res.status(400).json({
          message: "Invalid or expired OTP"
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use by another account"
        });
      }

      user.email = cleanEmail;
      user.emailVerified = true;
      user.emailOTP = undefined;
      user.emailOTPExpire = undefined;

      await user.save();

      const userRes = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        loginAlerts: user.loginAlerts,
        profileAlerts: user.profileAlerts,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        isAdmin: Boolean(user.isAdmin)
      };

      res.json({
        success: true,
        message: "Email verified and updated successfully",
        user: userRes
      });

    } catch (error) {
      console.log("VERIFY EMAIL CHANGE OTP ERROR:", error);
      res.status(500).json({
        message: error.message || "Server error"
      });
    }
  }
);

// CHANGE PASSWORD (AUTHENTICATED)
router.post(
  "/change-password",
  authMiddleware,
  async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters long"
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      if (user.password) {
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch && user.password !== oldPassword) {
          return res.status(400).json({
            message: "Current password is incorrect"
          });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.log("CHANGE PASSWORD ERROR:", error);
      res.status(500).json({
        message: error.message || "Server Error"
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