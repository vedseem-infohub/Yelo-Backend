// Yelo-BAckend/src/modules/cart/cart.model.js
const mongoose = require("mongoose")

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },

  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  priceAtAdd: {
    type: Number,
    required: true
  },

  size: {
    type: String
  },

  color: {
    type: String
  }
})

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    items: [cartItemSchema]
  },
  { timestamps: true }
)

module.exports = mongoose.model("Cart", cartSchema)
