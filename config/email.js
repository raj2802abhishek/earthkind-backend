
const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

console.log("RESEND EMAIL SYSTEM READY");

module.exports = resend;
