const mongoose = require("mongoose");

const layoutComponentSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["product-row", "product-grid", "banner-marquee", "image-banner", "countdown", "spacer"],
        },
        config: {
            title: String,
            subtitle: String,
            shopSlug: String,
            products: { type: [String], default: [] },
            limit: { type: Number, min: 1, max: 50, default: 8 },
            cols: { type: Number, min: 2, max: 6, default: 4 },
            text: String,
            bgColor: String,
            textColor: String,
            image: String,
            link: String,
            height: String,
        },
    },
    { _id: false }
);

const heroSchema = new mongoose.Schema(
    {
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        bannerImage: { type: String, default: "" },
        images: { type: [String], default: [] },
        overlayOpacity: { type: Number, min: 0, max: 1, default: 0.5 },
        titleAlignment: { type: String, enum: ["left", "center"], default: "center" },
    },
    { _id: false }
);

const themeSchema = new mongoose.Schema(
    {
        themeColor: { type: String, default: "#FF6B6B" },
        accentColor: { type: String, default: "#4ECDC4" },
        secondaryBg: { type: String, default: "#FFF5F5" },
        fontFamily: { type: String, default: "var(--font-geist-sans), sans-serif" },
    },
    { _id: false }
);

const campaignSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: [true, "Campaign slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, "Campaign name is required"],
            trim: true,
            maxlength: 100,
        },
        active: { type: Boolean, default: false, index: true },
        startDate: { type: Date, required: [true, "Start date is required"] },
        endDate: { type: Date, required: [true, "End date is required"] },
        hero: { type: heroSchema, default: () => ({}) },
        theme: { type: themeSchema, default: () => ({}) },
        layout: { type: [layoutComponentSchema], default: [] },
        priority: { type: Number, default: 0, index: true },
        tags: { type: [String], default: [] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Indexes
campaignSchema.index({ active: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ priority: -1, createdAt: -1 });

// Virtuals
campaignSchema.virtual("isLive").get(function () {
    const now = new Date();
    return this.active && this.startDate <= now && this.endDate >= now;
});

campaignSchema.virtual("status").get(function () {
    const now = new Date();
    if (!this.active) return "draft";
    if (now < this.startDate) return "scheduled";
    if (now > this.endDate) return "ended";
    return "live";
});

// Validation
// Validation
campaignSchema.pre("save", function () {
    if (this.endDate <= this.startDate) {
        throw new Error("End date must be after start date");
    }
});

// Static methods
campaignSchema.statics.findLive = function () {
    const now = new Date();
    return this.find({ active: true, startDate: { $lte: now }, endDate: { $gte: now } })
        .sort({ priority: -1 })
        .lean();
};

campaignSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug }).lean();
};

module.exports = mongoose.model("Campaign", campaignSchema);
