const User = require("../user/user.model")
const jwt = require("jsonwebtoken")
const { requestOTP, verifyOTPCheck } = require("../../utils/twilio.utils")

async function verifyOTP(phone, code) {
  if (!phone || !code) throw new Error("Phone and code are required")

  try {
    const verificationCheck = await verifyOTPCheck(phone, code)

    if (verificationCheck.status !== "approved") {
      throw new Error("Invalid or expired OTP")
    }

    // 2️⃣ Find or create user
    let user = await User.findOne({ phone })
    if (!user) {
      user = await User.create({ phone })
    }

    // 3️⃣ Issue backend JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    return {
      token,
      user,
      isProfileComplete: user.isProfileComplete
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

module.exports = { requestOTP, verifyOTP }


