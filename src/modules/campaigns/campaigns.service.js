const Campaign = require("./campaigns.model");

/**
 * Generate slug from name
 * @param {string} name - Campaign name
 * @returns {string} - URL-friendly slug
 */
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
}

/**
 * Get all campaigns with optional filters
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Filter active campaigns
 * @param {boolean} options.liveOnly - Filter currently live campaigns
 * @param {number} options.limit - Limit results
 * @param {number} options.skip - Skip results (for pagination)
 * @returns {Promise<Array>} - Array of campaigns
 */
async function getAllCampaigns(options = {}) {
    const { activeOnly = false, liveOnly = false, limit = 50, skip = 0 } = options;

    const query = {};

    if (liveOnly) {
        const now = new Date();
        query.active = true;
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
    } else if (activeOnly) {
        query.active = true;
    }

    return Campaign.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
}

/**
 * Get campaign by MongoDB ID
 * @param {string} id - Campaign MongoDB ID
 * @returns {Promise<Object|null>} - Campaign or null
 */
async function getCampaignById(id) {
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return null;
    }
    return Campaign.findById(id).lean().exec();
}

/**
 * Get campaign by slug
 * @param {string} slug - Campaign slug
 * @returns {Promise<Object|null>} - Campaign or null
 */
async function getCampaignBySlug(slug) {
    if (!slug || typeof slug !== "string") {
        return null;
    }
    const cleanSlug = slug.toLowerCase().trim();
    // Try finding the slug as provided, or with/without a leading slash to handle inconsistencies
    const variations = [
        cleanSlug,
        cleanSlug.startsWith("/") ? cleanSlug.substring(1) : `/${cleanSlug}`
    ];

    return Campaign.findOne({ slug: { $in: variations } }).lean().exec();
}

/**
 * Create a new campaign
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<Object>} - Created campaign
 * @throws {Error} - If validation fails or slug exists
 */
async function createCampaign(campaignData) {
    // Generate slug from name if not provided
    if (!campaignData.slug && campaignData.name) {
        campaignData.slug = generateSlug(campaignData.name);
    }

    // Check for existing slug
    const existing = await Campaign.findOne({ slug: campaignData.slug }).lean();
    if (existing) {
        const error = new Error("Campaign with this slug already exists");
        error.statusCode = 409;
        throw error;
    }

    // Create campaign
    const campaign = await Campaign.create(campaignData);
    return campaign.toObject();
}

/**
 * Update an existing campaign
 * @param {string} id - Campaign MongoDB ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} - Updated campaign
 * @throws {Error} - If campaign not found
 */
async function updateCampaign(id, updateData) {
    // If slug is being updated, check for uniqueness
    if (updateData.slug) {
        const existing = await Campaign.findOne({
            slug: updateData.slug,
            _id: { $ne: id } // Exclude current campaign
        }).lean();

        if (existing) {
            const error = new Error("Campaign with this slug already exists");
            error.statusCode = 409;
            throw error;
        }
    }

    const campaign = await Campaign.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .lean()
        .exec();

    if (!campaign) {
        const error = new Error("Campaign not found");
        error.statusCode = 404;
        throw error;
    }

    return campaign;
}

/**
 * Delete a campaign
 * @param {string} id - Campaign MongoDB ID
 * @returns {Promise<Object>} - Deleted campaign
 * @throws {Error} - If campaign not found
 */
async function deleteCampaign(id) {
    const campaign = await Campaign.findByIdAndDelete(id).lean().exec();

    if (!campaign) {
        const error = new Error("Campaign not found");
        error.statusCode = 404;
        throw error;
    }

    return campaign;
}

/**
 * Check if a slug is available
 * @param {string} slug - Slug to check
 * @returns {Promise<boolean>} - True if available
 */
async function isSlugAvailable(slug) {
    const existing = await Campaign.findOne({ slug }).select("_id").lean();
    return !existing;
}

/**
 * Get campaign count for pagination
 * @param {Object} filter - Query filter
 * @returns {Promise<number>} - Total count
 */
async function getCampaignCount(filter = {}) {
    return Campaign.countDocuments(filter).exec();
}

module.exports = {
    getAllCampaigns,
    getCampaignById,
    getCampaignBySlug,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    isSlugAvailable,
    getCampaignCount,
    generateSlug,
};
