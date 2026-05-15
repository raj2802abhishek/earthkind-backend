const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/product");

const Razorpay = require("razorpay");

const crypto = require("crypto");

const nodemailer = require("nodemailer");


// ===============================
// NODEMAILER CONFIG
// ===============================

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {

    user: process.env.EMAIL_USER,

    pass: process.env.EMAIL_PASS
  }
});


// ===============================
// PLACE ORDER
// ===============================

router.post("/create", async (req, res) => {

  try {

    const newOrder =
      new Order(req.body);

    const savedOrder =
      await newOrder.save();

      // UPDATE PRODUCT STOCK + SOLD

for (const item of savedOrder.products) {

  const product =
    await Product.findOne({
      name: item.name
    });

  if (product) {

    // REDUCE STOCK
    product.stock =
      Math.max(
        0,
        product.stock - item.quantity
      );

    // INCREASE SOLD COUNT
    product.sold += item.quantity;

    await product.save();
    // LOW STOCK EMAIL ALERT

if (product.stock <= 5) {

  await transporter.sendMail({

    from: process.env.EMAIL_USER,

    to: process.env.EMAIL_USER,

    subject:
      `⚠ Low Stock Alert - ${product.name}`,

    html: `

      <div style="
        font-family: Arial;
        padding: 24px;
        background: #f9fafb;
      ">

        <div style="
          background: white;
          border-radius: 18px;
          padding: 24px;
          box-shadow:
            0 4px 18px rgba(0,0,0,0.06);
        ">

          <h1 style="
            color:#dc2626;
            margin-bottom:10px;
          ">
            ⚠ Low Stock Alert
          </h1>

          <p>
            A product inventory is running low.
          </p>

          <hr />

          <h2>
            Product Details
          </h2>

          <p>
            <strong>Product:</strong>
            ${product.name}
          </p>

          <p>
            <strong>Category:</strong>
            ${product.category}
          </p>

          <p>
            <strong>Stock Left:</strong>
            ${product.stock}
          </p>

          <p>
            Please restock this product soon.
          </p>

          <div style="
            margin-top:24px;
            color:#6b7280;
          ">

            Earthkind Naturals
            Inventory System

          </div>

        </div>

      </div>

    `
  });

}
  }
}


    // ===============================
    // SEND ADMIN EMAIL
    // ===============================

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: process.env.EMAIL_USER,

      subject:
        "🛒 New Order Received - Earthkind Naturals",

      html: `

        <div style="
          font-family: Arial, sans-serif;
          padding: 24px;
          background: #f9fafb;
          color: #111827;
        ">

          <div style="
            background:#ffffff;
            padding:24px;
            border-radius:18px;
            box-shadow:0 4px 18px rgba(0,0,0,0.06);
          ">

            <h1 style="
              color:#123524;
              margin-bottom:8px;
            ">
              🌿 New Order Received
            </h1>

            <p style="
              color:#6b7280;
              margin-bottom:24px;
            ">
              A customer has placed a new order on Earthkind Naturals.
            </p>

            <hr />

            <h2 style="
              color:#123524;
              margin-top:24px;
            ">
              Customer Details
            </h2>

            <p>
              <strong>Name:</strong>
              ${savedOrder.customerName}
            </p>

            <p>
              <strong>Phone:</strong>
              ${savedOrder.phone}
            </p>

            <p>
              <strong>Email:</strong>
              ${savedOrder.email}
            </p>

            <p>
              <strong>Address:</strong>
              ${savedOrder.address}
            </p>

            <p>
              <strong>Payment Method:</strong>
              ${savedOrder.paymentMethod}
            </p>

            <p>
              <strong>Status:</strong>
              ${savedOrder.status}
            </p>

            <p>
              <strong>Order Date:</strong>
              ${new Date(savedOrder.createdAt)
                .toLocaleDateString()}
            </p>

            <p>
              <strong>Order Time:</strong>
              ${new Date(savedOrder.createdAt)
                .toLocaleTimeString()}
            </p>

            <hr />

            <h2 style="
              color:#123524;
              margin-top:24px;
            ">
              Ordered Products
            </h2>

            ${savedOrder.products.map(product => `

              <div style="
                background:#f3f4f6;
                padding:14px;
                border-radius:14px;
                margin-bottom:12px;
              ">

                <p style="
                  margin:0;
                  font-size:16px;
                  font-weight:600;
                ">
                  ${product.name}
                </p>

                <p style="
                  margin-top:8px;
                  color:#6b7280;
                ">
                  Quantity:
                  ${product.quantity}
                </p>

                <p style="
                  margin-top:4px;
                  color:#6b7280;
                ">
                  Price:
                  ₹${product.price}
                </p>

              </div>

            `).join("")}

            <hr />

            <h2 style="
              color:#123524;
              margin-top:24px;
            ">
              Payment Summary
            </h2>

            <p>
              <strong>Total Amount:</strong>
              ₹${savedOrder.totalAmount}
            </p>

            <p>
              <strong>Discount:</strong>
              ₹${savedOrder.discount}
            </p>

            <p>
              <strong>Final Amount:</strong>
              ₹${savedOrder.finalAmount}
            </p>

            <div style="
              margin-top:30px;
              text-align:center;
              color:#6b7280;
              font-size:14px;
            ">

              Earthkind Naturals Admin Notification System 🌿

            </div>

          </div>

        </div>

      `
    });


    // ===============================
    // RESPONSE
    // ===============================

    res.status(201).json(savedOrder);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
});


// ===============================
// GET ALL ORDERS
// ===============================

router.get("/", async (req, res) => {

  try {

    const orders =
      await Order.find();

    res.status(200).json(orders);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });
  }
});


// ===============================
// UPDATE ORDER STATUS
// ===============================

router.put("/update/:id", async (req, res) => {

  try {

    const updateData = {
      status: req.body.status
    };

    // IF DELIVERED
    if (req.body.status === "Delivered") {

      updateData.deliveredAt =
        new Date();

    } else {

      updateData.deliveredAt = null;
    }

    const updatedOrder =
      await Order.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

    res.json(updatedOrder);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});


// ===============================
// RAZORPAY CONFIG
// ===============================

const razorpay = new Razorpay({

  key_id:
    process.env.RAZORPAY_KEY_ID,

  key_secret:
    process.env.RAZORPAY_KEY_SECRET
});


// ===============================
// CREATE RAZORPAY ORDER
// ===============================

router.post("/razorpay", async (req, res) => {

  try {

    const { amount } = req.body;

    const options = {

      amount: amount * 100,

      currency: "INR",

      receipt:
        "receipt_" + Date.now()
    };

    const order =
      await razorpay.orders.create(options);

    res.json(order);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });
  }
});


// ===============================
// VERIFY PAYMENT
// ===============================

router.post("/verify", (req, res) => {

  const {

    razorpay_order_id,

    razorpay_payment_id,

    razorpay_signature

  } = req.body;

  const generated_signature =
    crypto

      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )

      .update(
        razorpay_order_id +
        "|" +
        razorpay_payment_id
      )

      .digest("hex");

  if (
    generated_signature ===
    razorpay_signature
  ) {

    res.json({
      success: true
    });

  } else {

    res.status(400).json({
      success: false
    });
  }
});


// ===============================
// GET USER ORDERS
// ===============================

router.get("/my-orders/:email", async (req, res) => {

  try {

    const orders =
      await Order.find({

        email:
          req.params.email

      }).sort({
        createdAt: -1
      });

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });
  }
});


// AUTO DELETE DELIVERED ORDERS
setInterval(async () => {

  try {

    const fourteenDaysAgo =
      new Date(
        Date.now() -
        14 * 24 * 60 * 60 * 1000
      );

    await Order.deleteMany({
      status: "Delivered",

      deliveredAt: {
        $lte: fourteenDaysAgo
      }
    });

    console.log(
      "Old delivered orders cleaned"
    );

  } catch (error) {

    console.log(error);

  }

}, 24 * 60 * 60 * 1000);

module.exports = router;