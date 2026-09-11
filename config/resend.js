const { Resend } = require("resend");

let resendInstance = null;

const getResendClient = () => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: RESEND_API_KEY is not defined in environment variables");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

/**
 * Send an email using Resend
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email or array of emails
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML content
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.from] - Sender email address
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const sendEmail = async ({ to, subject, html, text, from }) => {
  try {
    const resend = getResendClient();
    const sender = from || process.env.EMAIL_FROM || "Earthkind Naturals <onboarding@resend.dev>";
    const recipients = Array.isArray(to) ? to : [to];

    const payload = {
      from: sender,
      to: recipients,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {})
    };

    const response = await resend.emails.send(payload);

    if (response.error) {
      console.error("❌ Resend Email Error:", response.error);
      return { success: false, error: response.error };
    }

    console.log(`✉️ Email sent successfully via Resend to ${recipients.join(", ")} (ID: ${response.data?.id})`);
    return { success: true, data: response.data };
  } catch (err) {
    console.error("❌ Resend Email Exception:", err.message);
    return { success: false, error: err };
  }
};

module.exports = {
  getResendClient,
  sendEmail
};
