const campaignService = require("./campaigns.service");

/**
 * Async handler wrapper to avoid try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/campaigns
 * Fetch all campaigns with optional filters
 */
const fetchAllCampaigns = asyncHandler(async (req, res) => {
    const { active, live, limit = 50, page = 1 } = req.query;

    const options = {
        activeOnly: active === "true",
        liveOnly: live === "true",
        limit: Math.min(parseInt(limit) || 50, 100),
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50),
    };

    const [campaigns, total] = await Promise.all([
        campaignService.getAllCampaigns(options),
        campaignService.getCampaignCount(
            options.liveOnly
                ? { active: true, startDate: { $lte: new Date() }, endDate: { $gte: new Date() } }
                : options.activeOnly
                    ? { active: true }
                    : {}
        ),
    ]);

    res.json({
        success: true,
        data: campaigns,
        pagination: {
            page: parseInt(page) || 1,
            limit: options.limit,
            total,
            pages: Math.ceil(total / options.limit),
        },
    });
});

/**
 * GET /api/campaigns/:id
 * Fetch campaign by MongoDB ID
 */
const fetchCampaignById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: "Invalid campaign ID format",
        });
    }

    const campaign = await campaignService.getCampaignById(id);

    if (!campaign) {
        return res.status(404).json({
            success: false,
            message: "Campaign not found",
        });
    }

    res.json({
        success: true,
        data: campaign,
    });
});

/**
 * GET /api/campaigns/slug/:slug
 * Fetch campaign by slug (for frontend)
 */
const fetchCampaignBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    if (!slug || slug.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Invalid slug",
        });
    }

    const campaign = await campaignService.getCampaignBySlug(slug);

    if (!campaign) {
        return res.status(404).json({
            success: false,
            message: "Campaign not found",
        });
    }

    res.json({
        success: true,
        data: campaign,
    });
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
const createCampaignHandler = asyncHandler(async (req, res) => {
    console.log("Create Campaign Payload:", JSON.stringify(req.body, null, 2));
    const campaignData = req.body;

    // Required field validation
    const requiredFields = ["name", "startDate", "endDate"];
    const missingFields = requiredFields.filter((field) => !campaignData[field]);

    if (missingFields.length > 0) {
        console.log("Missing fields:", missingFields);
        return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    // Date validation
    const startDate = new Date(campaignData.startDate);
    const endDate = new Date(campaignData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log("Invalid dates:", startDate, endDate);
        return res.status(400).json({
            success: false,
            message: "Invalid date format",
        });
    }

    if (endDate <= startDate) {
        console.log("Date mismatch:", startDate, endDate);
        return res.status(400).json({
            success: false,
            message: "End date must be after start date",
        });
    }

    const campaign = await campaignService.createCampaign(campaignData);
    console.log("Campaign created:", campaign._id);

    res.status(201).json({
        success: true,
        data: campaign,
        message: "Campaign created successfully",
    });
});

/**
 * PUT /api/campaigns/:id
 * Update an existing campaign
 */
const updateCampaignHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`Update Campaign ${id} Payload:`, JSON.stringify(req.body, null, 2));
    const updateData = req.body;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: "Invalid campaign ID format",
        });
    }

    // Date validation if updating dates
    if (updateData.startDate && updateData.endDate) {
        const startDate = new Date(updateData.startDate);
        const endDate = new Date(updateData.endDate);

        if (endDate <= startDate) {
            return res.status(400).json({
                success: false,
                message: "End date must be after start date",
            });
        }
    }

    const campaign = await campaignService.updateCampaign(id, updateData);

    res.json({
        success: true,
        data: campaign,
        message: "Campaign updated successfully",
    });
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
const deleteCampaignHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
            success: false,
            message: "Invalid campaign ID format",
        });
    }

    const campaign = await campaignService.deleteCampaign(id);

    res.json({
        success: true,
        data: campaign,
        message: "Campaign deleted successfully",
    });
});

/**
 * GET /api/campaigns/check-slug/:slug
 * Check if a slug is available
 */
const checkSlugAvailability = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const available = await campaignService.isSlugAvailable(slug);

    res.json({
        success: true,
        available,
        slug,
    });
});

module.exports = {
    fetchAllCampaigns,
    fetchCampaignById,
    fetchCampaignBySlug,
    createCampaignHandler,
    updateCampaignHandler,
    deleteCampaignHandler,
    checkSlugAvailability,
};
