const Order = require("./order.model")
const VendorOrder = require("./vendorOrder.model")
const Cart = require("../cart/cart.model")
const Vendor = require("../vendors/vendors.model")
const User = require("../user/user.model")
const { sendWhatsAppMessage } = require("../../utils/twilio.utils")

async function placeOrder(userId, orderData = {}) {
  let orderItems = []
  let totalAmount = 0
  let itemsForVendorGrouping = []

  // Get user details for notification
  const user = await User.findById(userId)

  // Check if items are provided directly in orderData (from checkout)
  if (orderData.items && orderData.items.length > 0) {
    // Use items from orderData
    orderItems = orderData.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity || 1,
      price: item.price,
      color: item.color,
      size: item.size
    }))
    totalAmount = orderData.totalAmount || orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // For vendor grouping, we'll need to fetch product details
    const Product = require("../product/product.model")
    
    for (const item of orderData.items) {
      const product = await Product.findById(item.productId)
      if (product) {
        let vendorId = product.vendorId
        if (!vendorId && product.vendorSlug) {
          const vendor = await Vendor.findOne({ slug: product.vendorSlug })
          vendorId = vendor?._id
        }
        if (vendorId) {
          itemsForVendorGrouping.push({
            productId: product,
            vendorId: { _id: vendorId },
            quantity: item.quantity || 1,
            priceAtAdd: item.price
          })
        }
      }
    }
  } else {
    // Fetch from cart (backward compatibility)
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.vendorId")

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty")
    }

    orderItems = cart.items.map(i => ({
      productId: i.productId._id,
      quantity: i.quantity,
      price: i.priceAtAdd,
      color: i.color,
      size: i.size
    }))

    totalAmount = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.priceAtAdd,
      0
    )

    itemsForVendorGrouping = cart.items
  }

  // Create master order
  const order = await Order.create({
    userId,
    items: orderItems,
    totalAmount,
    deliveryAddress: orderData.deliveryAddress,
    paymentMethod: orderData.paymentMethod,
  })

  // Group items by vendorId
  const byVendor = {}
  for (const i of itemsForVendorGrouping) {
    const vId = i.vendorId._id.toString()
    if (!byVendor[vId]) byVendor[vId] = []
    byVendor[vId].push(i)
  }

  // 4) Create VendorOrders
  const vendorOrdersSummary = []
  for (const vendorId of Object.keys(byVendor)) {
    const vendor = await Vendor.findById(vendorId)
    const items = byVendor[vendorId]

    const vendorItems = items.map(i => ({
      productId: i.productId._id,
      quantity: i.quantity,
      price: i.priceAtAdd
    }))

    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.priceAtAdd,
      0
    )

    const vOrder = await VendorOrder.create({
      orderId: order._id,
      vendorId,
      vendorName: vendor ? vendor.name : "Unknown Vendor",
      items: vendorItems,
      subtotal
    })

    vendorOrdersSummary.push({
      vendorName: vendor ? vendor.name : "Unknown Vendor",
      itemsCount: vendorItems.length,
      subtotal: subtotal
    })
  }

  // 5) Clear cart after order is placed (always clear, regardless of source)
  const cart = await Cart.findOne({ userId })
  if (cart) {
    cart.items = []
    await cart.save()
  }

  // 6) Send WhatsApp notification to Admin
  const adminWhatsAppNumber = "+916393818467"
  const orderItemsFormatted = itemsForVendorGrouping.map(i => 
    `- ${i.productId.name || 'Product'} (x${i.quantity}) - ₹${i.priceAtAdd}`
  ).join('\n')

  const address = orderData.deliveryAddress || {}
  const addressStr = `${address.address || address.addressLine1 || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`
  
  const whatsappBody = `🛍️ *New Order Received!*

*Order ID:* ${order._id}
*Customer:* ${user?.name || 'Unknown'} (${user?.phone || 'No phone'})
*Total Amount:* ₹${totalAmount}
*Payment Method:* ${orderData.paymentMethod || 'N/A'}

*Items:*
${orderItemsFormatted}

*Delivery Address:*
${addressStr}
${address.phone ? `*Contact:* ${address.phone}` : ''}

*Vendor Breakdown:*
${vendorOrdersSummary.map(vo => `- ${vo.vendorName}: ₹${vo.subtotal}`).join('\n')}

View details in Admin Panel.`

  await sendWhatsAppMessage(adminWhatsAppNumber, whatsappBody)

  // 7) Send WhatsApp confirmation to Customer
  const customerPhone = address.phone || user?.phone
  if (customerPhone) {
    const customerWhatsappBody = `✅ *Order Confirmed!*
    
Hi ${user?.name || 'there'}, thank you for shopping with *YEAHLO*! 

Your order *#${order._id}* has been placed successfully.

*Total Amount:* ₹${totalAmount}
*Items:* ${orderItems.length} items

We'll notify you once your package is on its way. 🛍️

Track your order in the app profile section.`

    // Clean phone number (ensure only numbers)
    const cleanPhone = customerPhone.replace(/\D/g, '')
    // Ensure it has country code for Twilio
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    
    await sendWhatsAppMessage(formattedPhone, customerWhatsappBody)
  }

  return order
}


module.exports = {
  placeOrder
}
