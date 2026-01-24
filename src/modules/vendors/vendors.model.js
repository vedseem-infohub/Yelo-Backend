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

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Vendor", vendorSchema)
