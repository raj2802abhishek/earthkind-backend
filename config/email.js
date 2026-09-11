const { sendEmail, getResendClient } = require("./resend");

const transporter = {
  sendMail: async ({ from, to, subject, html, text }) => {
    const result = await sendEmail({ from, to, subject, html, text });
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to send email via Resend");
    }
    return {
      messageId: result.data?.id,
      response: `250 Message accepted with ID ${result.data?.id}`
    };
  }
};

module.exports = transporter;
module.exports.sendEmail = sendEmail;
module.exports.getResendClient = getResendClient;