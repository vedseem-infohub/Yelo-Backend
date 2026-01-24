const router = require("express").Router()
const { requestOTPHandler, verifyOTPHandler } = require("./auth.controller")

router.post("/request-otp", requestOTPHandler)
router.post("/verify-otp", verifyOTPHandler)

module.exports = router

