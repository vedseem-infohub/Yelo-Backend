const { requestOTP, verifyOTP } = require("./auth.service")

async function requestOTPHandler(req, res) {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      })
    }

    await requestOTP(phone)

    res.json({
      success: true,
      message: "OTP sent successfully"
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function verifyOTPHandler(req, res) {
  try {
    const { phone, code } = req.body

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Phone and code are required"
      })
    }

    const data = await verifyOTP(phone, code)

    res.json({
      success: true,
      ...data
    })
  } catch (err) {
    const statusCode = err.message.includes("Invalid") || err.message.includes("expired") ? 401 : 500
    res.status(statusCode).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = { requestOTPHandler, verifyOTPHandler }

