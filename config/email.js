const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",

  port: 587,

  secure: false,

  requireTLS: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((error, success) => {

  if (error) {

    console.log("EMAIL ERROR:", error);

  } else {

    console.log("EMAIL SERVER READY");
  }
});

module.exports = transporter;