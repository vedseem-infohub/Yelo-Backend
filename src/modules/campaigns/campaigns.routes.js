const router = require("express").Router();
const {
    fetchAllCampaigns,
    fetchCampaignById,
    fetchCampaignBySlug,
    createCampaignHandler,
    updateCampaignHandler,
    deleteCampaignHandler,
    checkSlugAvailability,
} = require("./campaigns.controller");
const auth = require("../../middlewares/auth.middleware");

router.get("/", fetchAllCampaigns);
router.get("/slug/:slug", fetchCampaignBySlug);
router.get("/check-slug/:slug", checkSlugAvailability);
router.get("/:id", fetchCampaignById);

router.post("/", auth, createCampaignHandler);
router.put("/:id", auth, updateCampaignHandler);
router.patch("/:id", auth, updateCampaignHandler); // Reuse update handler as it uses findByIdAndUpdate
router.delete("/:id", auth, deleteCampaignHandler);

module.exports = router;
