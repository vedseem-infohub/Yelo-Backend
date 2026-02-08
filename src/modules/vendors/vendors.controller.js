const Vendor = require("./vendors.model")
const Product = require("../product/product.model")

// Helper function to generate slug from name
function generateSlug(name) {
  if (!name) return ''
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')  // Remove special characters except hyphens
    .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '')  // Remove leading/trailing hyphens
}

exports.createVendor = async (req, res) => {
  try {
    // Auto-generate slug from name if not provided
    if (!req.body.slug && req.body.name) {
      let baseSlug = generateSlug(req.body.name)
      let slug = baseSlug
      let counter = 1
      
      // Ensure slug uniqueness
      while (await Vendor.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      
      req.body.slug = slug
    }
    
    // If slug is provided, ensure it's in the correct format
    if (req.body.slug) {
      req.body.slug = generateSlug(req.body.slug)
    }
    
    const vendor = await Vendor.create(req.body)
    res.status(201).json({ success: true, data: vendor })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

exports.getAllVendors = async (req, res) => {
  const vendors = await Vendor.find()
  res.json({ success: true, data: vendors })
}

exports.getVendorById = async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
  if (!vendor)
    return res.status(404).json({ success: false, message: "Vendor not found" })

  res.json({ success: true, data: vendor })
}

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    res.json({ success: true, data: vendor })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

// Update commission specifically
exports.updateCommission = async (req, res) => {
  try {
    const { commission } = req.body
    const commissionValue = Number(commission)
    
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      return res.status(400).json({ 
        success: false, 
        message: "Commission must be a number between 0 and 100" 
      })
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { commission: commissionValue },
      { new: true, runValidators: true }
    )
    
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    
    res.json({ success: true, data: vendor })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

exports.deleteVendor = async (req, res) => {
  await Vendor.findByIdAndDelete(req.params.id)
  res.json({ success: true, message: "Vendor deleted" })
}

exports.getVendorProducts = async (req, res) => {
  try {
    const { slug } = req.params
    const {
      page = 1,
      limit = 50,
      sort = "popular"
    } = req.query

    const query = {
      vendorSlug: slug,
      isActive: true
    }

    const sortOptions = {
      popular: { reviews: -1, rating: -1 },
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      newest: { dateAdded: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.popular
    const skip = (Number(page) - 1) * Number(limit)

    const products = await Product.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const total = await Product.countDocuments(query)

    res.json({
      success: true,
      count: products.length,
      total,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

exports.getVendorBySlug = async (req, res) => {
  try {
    const { slug } = req.params
    const vendor = await Vendor.findOne({ slug, isActive: true }).lean()
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      })
    }

    res.json({
      success: true,
      data: vendor
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// Get vendor details with products, sales, and orders (for admin)
exports.getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params
    const Order = require("../order/order.model")
    const VendorOrder = require("../order/vendorOrder.model")

    // Get vendor
    const vendor = await Vendor.findById(id).lean()
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      })
    }

    // Get ALL products (no limit) with all required fields except images
    // Try to match by vendorSlug OR by brand matching vendor name (including partial matches like "Monarch" for "Monarch Jhansi")
    const products = await Product.find({ 
      $or: [
        { vendorSlug: vendor.slug },
        { brand: vendor.name },
        { brand: new RegExp(vendor.name.split(' ')[0], 'i') } // Match the first word (e.g., "Monarch")
      ],
      isActive: true 
    })
    .select("name slug price stock rating reviews category subcategory isActive brand")
    .lean()
    .sort({ createdAt: -1 }) // Sort by newest first

    const totalProducts = products.length

    // Get vendor orders from VendorOrder collection
    // Try to find by vendorId (ObjectId) or vendorName OR by matching brand in items (though VendorOrder should have it)
    const vendorOrders = await VendorOrder.find({
      $or: [
        { vendorId: vendor._id },
        { vendorName: vendor.name },
        { vendorName: new RegExp(vendor.name.split(' ')[0], 'i') }
      ]
    })
      .populate("orderId", "orderStatus paymentStatus totalAmount createdAt userId")
      .lean()

    // Calculate total sales amount (from paid orders only)
    const totalSales = vendorOrders.reduce((sum, vo) => {
      if (vo.orderId && vo.orderId.paymentStatus === "PAID" && vo.orderId.orderStatus !== "CANCELLED") {
        return sum + (vo.subtotal || 0)
      }
      return sum
    }, 0)

    // Get order statistics
    const totalOrders = vendorOrders.length
    const completedOrders = vendorOrders.filter(
      vo => vo.orderId && (vo.orderId.orderStatus === "DELIVERED" || vo.orderId.orderStatus === "COMPLETED")
    ).length
    const pendingOrders = vendorOrders.filter(
      vo => vo.orderId && (vo.orderId.orderStatus === "PLACED" || vo.orderId.orderStatus === "CONFIRMED")
    ).length

    // Get ALL orders (no limit) with full order ID and commission
    const commissionRate = vendor.commission || 0
    const allOrders = vendorOrders
      .filter(vo => vo.orderId)
      .sort((a, b) => new Date(b.orderId.createdAt) - new Date(a.orderId.createdAt))
      .map(vo => {
        const subtotal = vo.subtotal || 0
        const commission = (subtotal * commissionRate) / 100
        return {
          orderId: vo.orderId._id.toString(), // Full order ID as string
          orderStatus: vo.orderId.orderStatus,
          paymentStatus: vo.orderId.paymentStatus,
          totalAmount: subtotal,
          commission: commission,
          createdAt: vo.orderId.createdAt
        }
      })

    // Calculate total commission
    const totalCommission = allOrders.reduce((sum, order) => {
      if (order.paymentStatus === "PAID" && order.orderStatus !== "CANCELLED") {
        return sum + order.commission
      }
      return sum
    }, 0)

    res.json({
      success: true,
      data: {
        vendor,
        products: {
          list: products,
          total: totalProducts
        },
        sales: {
          totalSales,
          totalOrders,
          completedOrders,
          pendingOrders,
          totalCommission
        },
        orders: allOrders
      }
    })
  } catch (err) {
    console.error("Error fetching vendor details:", err)
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch vendor details"
    })
  }
}
  
