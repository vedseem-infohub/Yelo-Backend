const router = require("express").Router();
const {
  getUserStats,
  getUsersList,
  getUserDetails,
  deleteUser
} = require("./user.admin.controller");

// Admin routes for user management
router.get("/stats", getUserStats);
router.get("/list", getUsersList);
// DELETE route must come before GET /:id to avoid route conflicts
router.delete("/:id", deleteUser);
router.get("/:id", getUserDetails);

module.exports = router;
