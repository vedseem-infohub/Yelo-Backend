const router = require("express").Router();
const { updateProfile, getMe, updateAddress } = require("./user.controller");
const auth = require("../../middlewares/auth.middleware");

// Admin routes (MUST be before other routes to avoid conflicts)
router.use("/admin", require("./user.admin.routes"));

router.put("/profile", auth, updateProfile);
router.put("/address", auth, updateAddress);
router.get("/me", auth, getMe); // for frontend use only

module.exports = router;
