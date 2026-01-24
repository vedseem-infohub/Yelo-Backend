const mongoose = require("mongoose")

const freeSubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    image: {
      type: String,
      default: null
    },
    icon: {
      type: String,
      default: null
    },
    productCount: {
      type: Number,
      default: 0
    },
    originalCategorySlug: {
      type: String,
      required: true
    },
    originalCategoryName: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Index for faster lookups
freeSubcategorySchema.index({ originalCategorySlug: 1 })
freeSubcategorySchema.index({ isActive: 1 })

module.exports = mongoose.model("FreeSubcategory", freeSubcategorySchema)

