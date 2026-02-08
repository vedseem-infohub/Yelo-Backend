const Order = require("./order.model")
const User = require("../user/user.model")
const { placeOrder } = require("./order.service")
const PDFDocument = require("pdfkit")

async function getOrders(req, res) {
  try {
    const userId = req.user.userId
    
    const orders = await Order.find({ userId })
      .populate("items.productId", "name slug images price")
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      success: true,
      data: orders
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function getRemainingOrders(req, res) {
  try {
    const userId = req.user.userId
    
    // Get all orders that are not completed or cancelled
    const orders = await Order.find({ 
      userId,
      orderStatus: { $nin: ["COMPLETED", "CANCELLED"] }
    })
      .populate("items.productId", "name slug images price")
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      success: true,
      data: orders,
      count: orders.length
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params
    const userId = req.user.userId
    
    const order = await Order.findOne({ _id: id, userId })
      .populate("items.productId", "name slug images price brand")
      .lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      })
    }

    res.json({
      success: true,
      data: order
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function createOrder(req, res) {
  try {
    const userId = req.user.userId
    const order = await placeOrder(userId, req.body)
    
    res.status(201).json({
      success: true,
      data: order,
      message: "Order placed successfully"
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

async function downloadInvoice(req, res) {
  try {
    const { id } = req.params
    const userId = req.user.userId
    
    const order = await Order.findOne({ _id: id, userId })
      .populate("items.productId", "name slug images price brand")
      .lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      })
    }

    // Get user details
    const user = await User.findById(userId).lean()

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id.toString().slice(-8)}.pdf`)
    
    // Pipe PDF to response
    doc.pipe(res)

    // Company/Store Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Yeahlo Fashion', 50, 50, { align: 'center' })
    
    doc.fontSize(12)
       .font('Helvetica')
       .text('Invoice', 50, 80, { align: 'center' })
    
    doc.moveDown()

    // Invoice Details
    const orderNumber = order._id.toString().slice(-8).toUpperCase()
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Order Number: #${orderNumber}`, 50, 130)
       .text(`Order Date: ${orderDate}`, 50, 145)
       .text(`Status: ${order.orderStatus || 'PLACED'}`, 50, 160)

    // Customer Details
    let customerY = 130
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Bill To:', 400, customerY)
    
    customerY += 20
    doc.fontSize(10)
       .font('Helvetica')
    
    if (order.deliveryAddress) {
      // Display full name if available
      if (order.deliveryAddress.fullName) {
        doc.font('Helvetica-Bold')
        doc.text(order.deliveryAddress.fullName, 400, customerY, { width: 150 })
        doc.font('Helvetica')
        customerY += 15
      }
      
      // Display phone if available
      if (order.deliveryAddress.phone) {
        doc.text(`Phone: ${order.deliveryAddress.phone}`, 400, customerY, { width: 150 })
        customerY += 15
      } else if (user?.phone) {
        doc.text(`Phone: ${user.phone}`, 400, customerY, { width: 150 })
        customerY += 15
      }
      
      // Display address line 1 (House/Flat No., Building Name)
      if (order.deliveryAddress.addressLine1) {
        doc.text(order.deliveryAddress.addressLine1, 400, customerY, { width: 150 })
        customerY += 15
      } else if (order.deliveryAddress.address) {
        // Fallback to old address field
        doc.text(order.deliveryAddress.address, 400, customerY, { width: 150 })
        customerY += 15
      }
      
      // Display address line 2 (Street, Area, Locality)
      if (order.deliveryAddress.addressLine2) {
        doc.text(order.deliveryAddress.addressLine2, 400, customerY, { width: 150 })
        customerY += 15
      }
      
      // Display area and block if available
      const areaBlock = [
        order.deliveryAddress.area,
        order.deliveryAddress.block
      ].filter(Boolean).join(', ')
      if (areaBlock) {
        doc.text(areaBlock, 400, customerY, { width: 150 })
        customerY += 15
      }
      
      // Display landmark if available
      if (order.deliveryAddress.landmark) {
        doc.text(`Landmark: ${order.deliveryAddress.landmark}`, 400, customerY, { width: 150 })
        customerY += 15
      }
      
      // Display city, state, pincode
      const cityStatePincode = [
        order.deliveryAddress.city,
        order.deliveryAddress.state,
        order.deliveryAddress.pincode
      ].filter(Boolean).join(', ')
      if (cityStatePincode) {
        doc.text(cityStatePincode, 400, customerY, { width: 150 })
        customerY += 15
      }
    }

    // Items Table Header
    let tableY = 220
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Item', 50, tableY)
       .text('Quantity', 300, tableY)
       .text('Price', 380, tableY)
       .text('Total', 450, tableY)
    
    // Table Line
    doc.moveTo(50, tableY + 15)
       .lineTo(550, tableY + 15)
       .stroke()

    // Items
    tableY += 25
    doc.font('Helvetica')
    
    order.items.forEach((item) => {
      const product = item.productId || item
      const productName = typeof product === 'object' ? product.name : 'Product'
      const quantity = item.quantity || 1
      const price = item.price || item.priceAtAdd || 0
      const itemTotal = quantity * price

      doc.text(productName, 50, tableY, { width: 240 })
      doc.text(quantity.toString(), 300, tableY)
      doc.text(`₹${price.toFixed(2)}`, 380, tableY)
      doc.text(`₹${itemTotal.toFixed(2)}`, 450, tableY)
      
      tableY += 20

      // Page break if needed
      if (tableY > 700) {
        doc.addPage()
        tableY = 50
      }
    })

    // Total
    tableY += 10
    doc.moveTo(50, tableY)
       .lineTo(550, tableY)
       .stroke()
    
    tableY += 15
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Total Amount:', 300, tableY)
       .text(`₹${(order.totalAmount || 0).toFixed(2)}`, 450, tableY)

    // Payment Information
    tableY += 30
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Payment Method: ${order.paymentMethod || 'Not specified'}`, 50, tableY)
       .text(`Payment Status: ${order.paymentStatus || 'PENDING'}`, 50, tableY + 15)

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your order!', 50, 750, { align: 'center' })
       .text('For queries, contact: info@yeahlo.in', 50, 765, { align: 'center' })

    // Finalize PDF
    doc.end()

  } catch (err) {
    console.error('Error generating invoice:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function completeOrder(req, res) {
  try {
    const { id } = req.params
    const userId = req.user.userId
    
    const order = await Order.findOne({ _id: id, userId })
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      })
    }

    // Check if order is already completed
    if (order.orderStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Order is already completed"
      })
    }

    // Check if order is cancelled
    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot complete a cancelled order"
      })
    }

    // Check if order is delivered (should be delivered before marking as completed)
    if (order.orderStatus !== "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: `Order must be delivered before marking as completed. Current status: ${order.orderStatus}`,
        currentStatus: order.orderStatus
      })
    }

    // Check if payment is completed
    if (order.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Order payment must be completed before marking as completed"
      })
    }

    // Update order status to COMPLETED
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus: "COMPLETED" },
      { new: true }
    )
      .populate("items.productId", "name slug images price brand")
      .lean()

    res.json({
      success: true,
      message: "Order marked as completed successfully",
      data: updatedOrder
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function requestRefund(req, res) {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user.userId
    
    const order = await Order.findOne({ _id: id, userId })
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      })
    }

    // Check if order can be refunded
    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled"
      })
    }

    // In a real app, you would integrate with Razorpay refund API here
    // For now, we'll just log the refund request
    
    res.json({
      success: true,
      message: "Refund request submitted successfully. Our team will process it within 5-7 business days.",
      data: {
        orderId: id,
        reason: reason || "Not specified",
        status: "PENDING"
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function requestExchange(req, res) {
  try {
    const { id } = req.params
    const { reason, newSize, newColor } = req.body
    const userId = req.user.userId
    
    const order = await Order.findOne({ _id: id, userId })
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      })
    }

    // Check if order can be exchanged
    if (order.orderStatus === "CANCELLED" || order.orderStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be exchanged. Current status: ${order.orderStatus}`
      })
    }

    res.json({
      success: true,
      message: "Exchange request submitted successfully. Our team will contact you soon.",
      data: {
        orderId: id,
        reason: reason || "Not specified",
        newSize,
        newColor,
        status: "PENDING"
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = {
  getOrders,
  getRemainingOrders,
  getOrderById,
  createOrder,
  downloadInvoice,
  completeOrder,
  requestRefund,
  requestExchange
}
