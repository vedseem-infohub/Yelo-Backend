// Yelo-BAckend/src/modules/cart/cart.controller.js
const mongoose = require("mongoose")
const {
  getCart,
  addToCart,
  updateCartItem
} = require("./cart.service")

async function fetchCart(req, res) {
  try {
    const userId = req.user.userId
    const cart = await getCart(userId)
    res.json({ success: true, data: cart || { items: [] } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

async function addProductToCart(req, res) {
  try {
    const userId = req.user.userId
    const { productId, quantity, size, color } = req.body

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" })
    }

    const cart = await addToCart(
      userId,
      productId,
      quantity || 1,
      size,
      color
    )

    res.json({ success: true, data: cart })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

async function updateCartProduct(req, res) {
  try {
    const userId = req.user.userId
    const { productId, quantity, size, color } = req.body

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" })
    }

    const cart = await updateCartItem(
      userId,
      productId,
      quantity,
      size,
      color
    )

    res.json({ success: true, data: cart })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

async function removeCartItem(req, res) {
  try {
    const userId = req.user.userId
    const { itemId } = req.params

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid itemId" })
    }

    const cart = await removeFromCart(userId, itemId)

    res.json({ success: true, data: cart })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  fetchCart,
  addProductToCart,
  updateCartProduct,
  removeCartItem
}
