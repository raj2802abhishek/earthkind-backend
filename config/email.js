const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",

  port: 465,

  secure: true,

  auth: {

    user: process.env.EMAIL_USER,

    pass: process.env.EMAIL_PASS

  }

});

transporter.verify((error, success) => {

  if (error) {

    console.log("EMAIL CONFIG ERROR:");
    console.log(error);

  } else {

    console.log("MAIL SERVER READY");

  }

});

module.exports = transporter;