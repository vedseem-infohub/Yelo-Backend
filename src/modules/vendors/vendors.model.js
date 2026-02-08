const mongoose = require("mongoose")

const vendorSchema = new mongoose.Schema(
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
      lowercase: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    phone: String,

    address: String,

    ownerName: String,
    owner: String,

    commission: {
      type: Number,
      default: 15,
      min: 0,
      max: 100
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"],
      default: "PENDING"
    },

    totalRevenue: {
      type: Number,
      default: 0
    },

    revenue: {
      type: Number,
      default: 0
    },

    rating: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Vendor", vendorSchema)
