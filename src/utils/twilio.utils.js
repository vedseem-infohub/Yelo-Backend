const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const serviceSid = process.env.TWILIO_SERVICE_SID;

/**
 * Send OTP via Twilio Verify
 */
async function requestOTP(phone) {
  if (!phone) throw new Error("Phone number is required");

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });
    return verification;
  } catch (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
}

/**
 * Verify OTP via Twilio Verify
 */
async function verifyOTPCheck(phone, code) {
  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code });
    return verificationCheck;
  } catch (error) {
    throw new Error(`OTP verification failed: ${error.message}`);
  }
}

/**
 * Send WhatsApp notification
 * Note: From number should be whatsapp:+14155238886 for Twilio Sandbox or your verified number
 */
async function sendWhatsAppMessage(to, body) {
  try {
    // For trial accounts, always use the Twilio Sandbox number unless explicitly overridden
    // Sandbox number: whatsapp:+14155238886
    const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
    
    // Clean and format recipient number
    let cleanTo = to.replace(/\D/g, "");
    if (cleanTo.length === 10) cleanTo = "91" + cleanTo;
    const formattedTo = `whatsapp:+${cleanTo}`;

    console.log(`[WhatsApp] Sending message from ${from} to ${formattedTo}...`);

    const message = await client.messages.create({
      body: body,
      from: from,
      to: formattedTo
    });
    
    console.log(`[WhatsApp] Message sent successfully! SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("[WhatsApp] Failed to send message:", error.message);
    if (error.code === 21608) {
      console.error("[WhatsApp] Tip: The recipient number is not verified in Twilio Sandbox. Ask them to join your sandbox by sending the code to your Twilio number.");
    }
    // Don't throw error to prevent breaking the main process (like order placement)
    return null;
  }
}

module.exports = {
  requestOTP,
  verifyOTPCheck,
  sendWhatsAppMessage
};
