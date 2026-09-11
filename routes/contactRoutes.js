const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");

// @route   POST /api/contact
// @desc    Save new contact form submission to MongoDB database
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields (Name, Email, Message).",
      });
    }

    const newContact = new Contact({
      name,
      email,
      phone: phone || "",
      subject: subject || "General Inquiry",
      message,
    });

    const savedContact = await newContact.save();

    console.log("📥 New Contact Form Submission Saved to DB:", savedContact._id);

    // Notify admin via Resend (async, non-blocking)
    const { sendEmail } = require("../config/resend");
    sendEmail({
      to: process.env.ADMIN_EMAIL || "helloearthkindnaturals@gmail.com",
      subject: `📬 New Contact Inquiry: ${subject || "General Inquiry"} - from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f9fafb;">
          <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e5e7eb; max-width: 540px; margin: auto;">
            <h2 style="color: #163923; margin-top: 0;">New Contact Form Submission 🌿</h2>
            <p style="margin: 6px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 6px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 6px 0;"><strong>Phone:</strong> ${phone || "N/A"}</p>
            <p style="margin: 6px 0;"><strong>Subject:</strong> ${subject || "General Inquiry"}</p>
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 16px 0;" />
            <p style="margin: 6px 0;"><strong>Message:</strong></p>
            <div style="white-space: pre-wrap; background: #f3f4f6; padding: 14px; border-radius: 8px; color: #374151; font-size: 14px;">${message}</div>
          </div>
        </div>
      `,
      text: `New contact inquiry from ${name} (${email}): ${message}`
    }).catch(e => console.log("Contact form admin email notification failed:", e.message));

    return res.status(201).json({
      success: true,
      message: "Your message has been sent and saved successfully!",
      contact: savedContact,
    });

  } catch (error) {
    console.error("❌ Error saving contact message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Failed to save message.",
      error: error.message,
    });
  }
});

// @route   GET /api/contact
// @desc    Retrieve all contact form messages (for Admin moderation)
// @access  Public / Admin
router.get("/", async (req, res) => {
  try {
    const messages = await Contact.find().sort({ updatedAt: -1, createdAt: -1 });
    return res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("❌ Error fetching contact messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages.",
      error: error.message,
    });
  }
});

// @route   GET /api/contact/user-messages
// @desc    Retrieve messages for a specific user by email or ID
// @access  Public
router.get("/user-messages", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email query param is required",
      });
    }

    const messages = await Contact.find({
      email: email.trim().toLowerCase(),
    }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching user messages",
      error: error.message,
    });
  }
});

// @route   GET /api/contact/:id
// @desc    Get single contact thread by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact thread not found" });
    }
    return res.json({ success: true, data: contact });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/contact/:id/reply
// @desc    Add a reply message to the contact thread (by Admin or User)
// @access  Public
router.post("/:id/reply", async (req, res) => {
  try {
    const { sender, senderName, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message text cannot be empty.",
      });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    const newReply = {
      sender: sender || "admin",
      senderName: senderName || (sender === "admin" ? "Earthkind Support" : contact.name),
      text: text.trim(),
      createdAt: new Date(),
    };

    contact.replies.push(newReply);

    // If Admin replies and status was 'New', automatically move to 'In Progress'
    if (sender === "admin" && contact.status === "New") {
      contact.status = "In Progress";
    }

    await contact.save();

    console.log(`💬 Reply added to Contact thread ${contact._id} by ${sender}`);

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully!",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Error adding reply:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply.",
      error: error.message,
    });
  }
});

// @route   PUT /api/contact/:id/status
// @desc    Update contact submission status (New, In Progress, Resolved, Archived)
// @access  Public / Admin
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["New", "In Progress", "Resolved", "Archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, returnDocument: "after" }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    return res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: contact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update status.",
      error: error.message,
    });
  }
});

// @route   DELETE /api/contact/:id
// @desc    Delete a contact message thread
// @access  Public / Admin
router.delete("/:id", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    return res.json({
      success: true,
      message: "Contact message thread deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete message.",
      error: error.message,
    });
  }
});

module.exports = router;
