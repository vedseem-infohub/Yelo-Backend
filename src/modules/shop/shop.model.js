const mongoose = require("mongoose")

const shopSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true
    },

    route: {
      type: String,
      required: true
    },

    majorCategory: {
      type: String,
      enum: ["AFFORDABLE", "LUXURY"],
      required: true,
      index: true
    },

    shopType: {
      type: String,
      enum: [
        "PRICE_BASED",
        "PERFORMANCE_BASED",
        "DISCOUNT_BASED",
        "TIME_BASED",
        "TRENDING_BASED",
        "CATEGORY_BASED",
        "BRAND_BASED",
        "EDITORIAL"
      ],
      required: true
    },

    parentShopSlug: {
      type: String,
      default: null
    },

    criteria: {
      priceMin: Number,
      priceMax: Number,
      minRating: Number,
      minReviews: Number,
      hasDiscount: Boolean,
      daysSinceAdded: Number,
      categoryMatch: String,
      nameMatch: String,
      brandMatch: [String], // Array of brand names for brand-based shops
      isTrending: Boolean
    },

    defaultSort: {
      type: String,
      default: "popular"
    },

    hasSidebar: {
      type: Boolean,
      default: false
    },

    hasBottomBar: {
      type: Boolean,
      default: true
    },

    uiTheme: {
      type: String,
      default: "default"
    },

    banner: {
      type: String, // URL to banner image
      default: null
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Shop", shopSchema)
