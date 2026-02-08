const sgMail = require("@sendgrid/mail");

const sendEmail = async ({ email, subject, message, html }) => {
  try {
    console.log(`[Mail System] Preparing to send email via SendGrid API...`);

    // Ensure API Key is set (Lazy loading to handle dotenv load order)
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      console.error("[Mail System] CRITICAL: SENDGRID_API_KEY is missing!");
      throw new Error("SENDGRID_API_KEY is not configured in .env");
    }

    const senderEmail = process.env.MAIL_FROM || "info@yeahlo.in";
    console.log(`[Mail System] Configured Sender (MAIL_FROM): ${senderEmail}`);

    const msg = {
      to: email,
      // Use verified sender identity from SendGrid
      from: {
        email: senderEmail,
        name: "YEAHLO Fashion"
      },
      subject: subject,
      text: message,
      html: html,
    };

    console.log(`[Mail System] Sending email to: ${email} | Subject: "${subject}"`);
    console.log(`[Mail System] Verified Sender: ${msg.from.email} (${msg.from.name})`);

    const response = await sgMail.send(msg);

    // responses[0] is the response object
    console.log("[Mail System] Email sent successfully!");
    console.log(`[Mail System] Status Code: ${response[0].statusCode}`);
    console.log(`[Mail System] X-Message-Id: ${response[0].headers['x-message-id']}`);

    return response;
  } catch (error) {
    console.error("[Mail System] CRITICAL ERROR sending email via SendGrid:", error);

    if (error.response) {
      console.error("[Mail System] SendGrid API Error Body:", JSON.stringify(error.response.body, null, 2));
    }

    throw new Error("Email could not be sent: " + (error.message || "Unknown SendGrid Error"));
  }
};

module.exports = sendEmail;
