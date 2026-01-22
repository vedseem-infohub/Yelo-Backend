// Yelo-Backend/src/modules/cart/cart.service.js
const Cart = require("./cart.model")
const Product = require("../product/product.model")
const Vendor = require("../vendors/vendors.model")

/**
 * GET CART
 */
async function getCart(userId) {
  const cart = await Cart.findOne({ userId })
    .populate("items.productId")
    .populate("items.vendorId")

  return cart
}

/**
 * ADD TO CART
 */
async function addToCart(userId, productId, quantity = 1, size = null, color = null) {
  const product = await Product.findById(productId)

  if (!product) {
    throw new Error("Product not found")
  }

  let vendorId = product.vendorId

  // 🔥 FIX: vendorId missing but vendorSlug present
  if (!vendorId && product.vendorSlug) {
    const vendor = await Vendor.findOne({ slug: product.vendorSlug })

    if (!vendor) {
      throw new Error("Vendor not found for product")
    }

    vendorId = vendor._id

    // save for future so ye issue dobara na aaye
    product.vendorId = vendorId
    await product.save()
  }

  if (!vendorId) {
    throw new Error("VendorId missing for product")
  }

  let cart = await Cart.findOne({ userId })

  // 🟢 First item in cart
  if (!cart) {
    return Cart.create({
      userId,
      items: [
        {
          productId,
          vendorId,
          quantity,
          priceAtAdd: product.price,
          size,
          color
        }
      ]
    })
  }

  const existingItem = cart.items.find(
    item => 
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
  )

  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.items.push({
      productId,
      vendorId,
      quantity,
      priceAtAdd: product.price,
      size,
      color
    })
  }

  await cart.save()
  return cart
}

async function updateCartItem(userId, productId, quantity, size = null, color = null) {
  const cart = await Cart.findOne({ userId })

  if (!cart) return null

  const itemIndex = cart.items.findIndex(
    item => 
      item.productId.toString() === productId &&
      (!size || item.size === size) &&
      (!color || item.color === color)
  )

  if (itemIndex === -1) return cart

  //  Remove item
  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1)
  } 
  // Update quantity
  else {
    cart.items[itemIndex].quantity = quantity
    if (size) cart.items[itemIndex].size = size
    if (color) cart.items[itemIndex].color = color
  }

  await cart.save()
  return cart
}

/**
 * REMOVE FROM CART
 */
async function removeFromCart(userId, itemId) {
  const cart = await Cart.findOne({ userId })

  if (!cart) return null

  cart.items = cart.items.filter(
    item => item._id.toString() !== itemId
  )

  await cart.save()
  return cart
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart
}
