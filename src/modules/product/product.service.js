const Product = require("./product.model")
const { assignProductToShops } = require("../assignment/assignment.service")
const SORT_MAP = require("./product.sort")

// Helper function to get sort query for offers (uses calculatedDiscount field)
function getOffersSortQuery(sort, discountField = "calculatedDiscount") {
  const sortMap = {
    "discount-high": { [discountField]: -1 },
    "discount-low": { [discountField]: 1 },
    "price-low": { price: 1 },
    "price-high": { price: -1 },
    "newest": { createdAt: -1 },
    "popular": { rating: -1, reviews: -1 }
  }
  return sortMap[sort] || sortMap["discount-high"]
}

// =======================
// CREATE PRODUCT
// =======================
async function createProduct(payload) {
  // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
  payload.majorCategory =
    (payload.brand && payload.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE"

  const product = await Product.create(payload)

  // Assign shops (will include "trending" if isTrending is true)
  const assignedShops = await assignProductToShops(product)
  product.assignedShops = assignedShops
  await product.save() // Ensure assignedShops is saved

  return product
}

// =======================
// GET PRODUCTS BY SHOP
// =======================
async function getProductsByShop({
  shopSlug,
  sort = "popular",
  filters = {},
  page = 1,
  limit = 6
}) {
  // Special handling for "offers" shop - filter discount > 10% and sort by discount descending
  if (shopSlug === "offers") {
    return getOffersProducts({
      sort,
      filters,
      page,
      limit
    })
  }

  const sortQuery = SORT_MAP[sort] || SORT_MAP.popular

  // For luxury shops, include products assigned to the shop OR products with brands (safety fallback)
  let query = {}
  if (shopSlug.startsWith('luxury')) {
    // For luxury shops, include products assigned to shop OR products with brands (luxury products)
    // Luxury products are identified by having a brand name (not null/empty)
    query = {
      isActive: true,
      $or: [
        { assignedShops: shopSlug },
        // Fallback: include products with brands if they're not assigned (safety measure)
        {
          brand: { $exists: true, $ne: null, $ne: '' }
        }
      ]
    }
  } else {
    // For non-luxury shops, only products assigned to the shop AND without brands
    query = {
      assignedShops: shopSlug,
      isActive: true,
      $and: [
        {
          $or: [
            { brand: { $exists: false } },
            { brand: null },
            { brand: '' }
          ]
        }
      ]
    }
  }

  // PRICE FILTER
  if (filters.minPrice || filters.maxPrice) {
    query.price = {}
    if (filters.minPrice && filters.minPrice !== 'undefined' && !isNaN(Number(filters.minPrice))) {
      query.price.$gte = Number(filters.minPrice)
    }
    if (filters.maxPrice && filters.maxPrice !== 'undefined' && !isNaN(Number(filters.maxPrice))) {
      query.price.$lte = Number(filters.maxPrice)
    }
  }

  // BRAND FILTER
  if (filters.brand) {
    query.brand = { $in: filters.brand.split(",") }
  }

  // SIZE FILTER
  if (filters.size) {
    query.sizes = { $in: filters.size.split(",") }
  }

  // COLOR FILTER
  if (filters.color) {
    query["colors.name"] = { $in: filters.color.split(",") }
  }

  const skip = (Number(page) - 1) * Number(limit)



  const total = await Product.countDocuments(query).maxTimeMS(30000)



  const products = await Product.find(query)
    .allowDiskUse(true)
    .maxTimeMS(30000)
    .sort(sortQuery)
    .skip(skip)
    .limit(Number(limit))
    .lean()
    .select('name slug baseSlug vendorSlug price originalPrice discount images brand category subcategory emoji isTrending rating reviews stock colors sizes _id dateAdded createdAt')

  // Add SEO-friendly URLs to products
  const productsWithSeoUrl = products.map(product => ({
    ...product,
    seoUrl: product.vendorSlug && product.baseSlug
      ? `${product.vendorSlug}/${product.baseSlug}`
      : product.slug
  }))

  return {
    products: productsWithSeoUrl,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      hasMore: skip + products.length < total
    }
  }
}

// =======================
// GET OFFERS PRODUCTS
// Filters products with discount > 10% and sorts by discount descending by default
// =======================
async function getOffersProducts({
  sort = "discount-high",
  filters = {},
  page = 1,
  limit = 6
}) {
  const skip = (Number(page) - 1) * Number(limit)

  // Build match conditions
  const matchConditions = {
    isActive: true,
    // Ensure product has either discount field OR originalPrice to calculate discount
    $or: [
      { discount: { $gt: 10 } },
      {
        originalPrice: { $exists: true, $ne: null },
        price: { $exists: true, $ne: null },
        originalPrice: { $gt: 0 },
        price: { $gt: 0 }
      }
    ]
  }

  // PRICE FILTER
  if (filters.minPrice || filters.maxPrice) {
    matchConditions.price = {}
    if (filters.minPrice && filters.minPrice !== 'undefined' && !isNaN(Number(filters.minPrice))) {
      matchConditions.price.$gte = Number(filters.minPrice)
    }
    if (filters.maxPrice && filters.maxPrice !== 'undefined' && !isNaN(Number(filters.maxPrice))) {
      matchConditions.price.$lte = Number(filters.maxPrice)
    }
  }

  // BRAND FILTER
  if (filters.brand) {
    matchConditions.brand = { $in: filters.brand.split(",") }
  }

  // SIZE FILTER
  if (filters.size) {
    matchConditions.sizes = { $in: filters.size.split(",") }
  }

  // COLOR FILTER
  if (filters.color) {
    matchConditions["colors.name"] = { $in: filters.color.split(",") }
  }

  // Use aggregation to calculate discount percentage and filter/sort
  const pipeline = [
    {
      $match: matchConditions
    },
    {
      $addFields: {
        // Calculate discount percentage: use discount field if exists and > 0, otherwise calculate from originalPrice/price
        calculatedDiscount: {
          $cond: {
            if: { $and: [{ $gt: ["$discount", 0] }, { $ne: ["$discount", null] }] },
            then: "$discount",
            else: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$originalPrice", 0] },
                    { $gt: ["$price", 0] },
                    { $gt: ["$originalPrice", "$price"] }
                  ]
                },
                then: {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$originalPrice", "$price"] },
                        "$originalPrice"
                      ]
                    },
                    100
                  ]
                },
                else: 0
              }
            }
          }
        }
      }
    },
    {
      // Filter products with discount > 10%
      $match: {
        calculatedDiscount: { $gt: 10 }
      }
    },
    {
      // Sort products based on sort parameter
      $sort: getOffersSortQuery(sort, "calculatedDiscount")
    },
    {
      $skip: skip
    },
    {
      $limit: Number(limit)
    },
    {
      // Project and add discount field for easier access
      $project: {
        name: 1,
        slug: 1,
        baseSlug: 1,
        vendorSlug: 1,
        price: 1,
        originalPrice: 1,
        discount: { $round: "$calculatedDiscount" },
        images: 1,
        brand: 1,
        category: 1,
        subcategory: 1,
        emoji: 1,
        isTrending: 1,
        rating: 1,
        reviews: 1,
        stock: 1,
        colors: 1,
        sizes: 1,
        _id: 1
      }
    }
  ]

  // Get total count for pagination (remove skip, limit, and project stages)
  const countPipeline = [
    ...pipeline.slice(0, -3) // Remove skip, limit, and project stages
  ]

  const [products, totalResult] = await Promise.all([
    Product.aggregate(pipeline).allowDiskUse(true).maxTimeMS(30000),
    Product.aggregate([
      ...countPipeline,
      { $count: "total" }
    ]).allowDiskUse(true).maxTimeMS(30000)
  ])

  const total = totalResult[0]?.total || 0

  // Add SEO-friendly URLs to products
  const productsWithSeoUrl = products.map(product => ({
    ...product,
    seoUrl: product.vendorSlug && product.baseSlug
      ? `${product.vendorSlug}/${product.baseSlug}`
      : product.slug
  }))

  return {
    products: productsWithSeoUrl,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      hasMore: skip + products.length < total
    }
  }
}



module.exports = {
  createProduct,
  getProductsByShop
}
