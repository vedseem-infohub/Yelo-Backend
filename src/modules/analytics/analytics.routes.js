const router = require("express").Router();
const { getAnalytics } = require("./analytics.controller");

// Admin analytics routes
router.get("/", getAnalytics);

module.exports = router;
