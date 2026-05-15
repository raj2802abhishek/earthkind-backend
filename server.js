require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const couponRoutes = require("./routes/couponRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();



// Middleware
app.use(
  cors({
    origin: [
      "https://earthkind-frontend.vercel.app"
    ],
    credentials: true
  })
);

app.use(express.json());



// Routes
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/upload", uploadRoutes);



// Test Route
app.get("/", (req, res) => {
  res.send("EARTHKIND NATURALS Backend Running 🚀");
});



// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected Successfully");
})
.catch((err) => {
  console.log("MongoDB Connection Failed:", err);
});



// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});