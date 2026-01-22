// Yelo-Backend/src/modules/cart/cart.routes.js

const router = require("express").Router()
const {
  fetchCart,
  addProductToCart,
  updateCartProduct,
  removeCartItem
} = require("./cart.controller")
const auth = require("../../middlewares/auth.middleware")

// All cart routes require authentication
router.get("/", auth, fetchCart)
router.post("/", auth, addProductToCart)
router.put("/", auth, updateCartProduct)
router.delete("/:itemId", auth, removeCartItem)

module.exports = router
