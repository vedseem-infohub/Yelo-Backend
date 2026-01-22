const Product = require("./product.model")
const Category = require("../category/category.model")
const { getProductsByShop, createProduct: createProductService } = require("./product.service")
const { ensureCategory } = require("../category/category.service")

// Simple health check - count products
exports.getProductCount = async (req, res) => {
  try {
    const totalCount = await Product.countDocuments({})
    const activeCount = await Product.countDocuments({ isActive: true })

    res.json({
      success: true,
      total: totalCount,
      active: activeCount,
      inactive: totalCount - activeCount
    })
  } catch (err) {
    console.error('Error getting product count:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// GET all products (with filters and pagination)
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = "popular",
      category,
      brand,
      minPrice,
      maxPrice,
      gender,
      isTrending,
      isActive = true,
      search
    } = req.query

    const query = { isActive: isActive !== 'false' }

    // Search filter - fuzzy search in name, brand, category
    if (search && search.trim()) {
      const searchTerm = search.trim()

      // Normalize search term: remove hyphens, normalize spaces, handle common variations
      const normalizedSearch = searchTerm
        .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
        .replace(/\s+/g, ' ')    // Normalize multiple spaces to single space
        .trim()

      // Create a flexible regex pattern that matches:
      // - With or without spaces (sweatshirt, sweat shirt)
      // - With or without hyphens (sweat-shirt, sweat shirt)
      // - Word parts in any order (sweat shirt matches "sweatshirt")
      const words = normalizedSearch.split(/\s+/).filter(w => w.length > 0)

      // Pattern: match all words with optional spaces/hyphens/underscores between them
      // This handles: "sweatshirt", "sweat shirt", "sweat-shirt", "sweat_shirt", etc.
      const fuzzyPattern = words.length > 1
        ? new RegExp(words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[-_\\s]*'), 'i')
        : new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      // Also create pattern without spaces (for matching compound words)
      const noSpacePattern = new RegExp(normalizedSearch.replace(/\s+/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      // Build $or query with both patterns
      query.$or = [
        { name: fuzzyPattern },
        { name: noSpacePattern },
        { brand: fuzzyPattern },
        { brand: noSpacePattern },
        { category: fuzzyPattern },
        { category: noSpacePattern },
        { productType: fuzzyPattern },
        { productType: noSpacePattern },
        { subcategory: fuzzyPattern },
        { subcategory: noSpacePattern },
        { description: fuzzyPattern },
        { description: noSpacePattern }
      ]
    }

    // Filters
    if (category) query.category = category
    if (brand) query.brand = { $in: brand.split(",") }
    if (gender) query["audience.gender"] = gender
    if (isTrending === 'true') query.isTrending = true

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    // Sort options
    const sortOptions = {
      popular: { reviews: -1, rating: -1 },
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      newest: { createdAt: -1 }, // Use createdAt as primary for newest (more reliable)
      rating: { rating: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.popular

    const skip = (Number(page) - 1) * Number(limit)

    // Log query details for debugging
    console.log('📊 getAllProducts query:', JSON.stringify(query, null, 2))
    console.log('📊 Sort options:', JSON.stringify(sortQuery, null, 2))
    console.log('📊 Pagination:', { page, limit, skip })

    const queryStartTime = Date.now()

    // Add query timeout (30 seconds) to prevent hanging
    const products = await Product.find(query)
      .allowDiskUse(true)
      .maxTimeMS(30000) // 30 second timeout
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const queryTime = Date.now() - queryStartTime
    console.log(`⏱️  Query took ${queryTime}ms, found ${products.length} products`)

    // Add timeout for count as well
    const countStartTime = Date.now()
    const total = await Product.countDocuments(query).maxTimeMS(30000)
    const countTime = Date.now() - countStartTime
    console.log(`⏱️  Count took ${countTime}ms, total: ${total}`)

    const response = {
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }

    console.log(`✅ Returning ${products.length} products, total: ${total}`)

    res.json(response)
  } catch (err) {
    // Log full error details for debugging
    console.error('❌ Error in getAllProducts:', {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 3).join('\n')
    })

    // Handle timeout errors gracefully
    if (err.message && (err.message.includes('timeout') || err.message.includes('timed out') || err.name === 'MongoServerError')) {
      console.error('Product query timeout/error:', err.message)
      return res.status(500).json({
        success: false,
        message: 'Query timeout: The request took too long. Please try again with different filters or smaller page size.',
        error: 'TIMEOUT'
      })
    }

    // Handle sort memory errors
    if (err.message && err.message.includes('Sort exceeded memory limit')) {
      console.error('⚠️ Sort memory limit error - indexes may still be building')
      return res.status(500).json({
        success: false,
        message: 'Query is taking too long. Indexes may still be building. Please wait a moment and try again.',
        error: 'SORT_MEMORY_LIMIT',
        hint: 'Indexes are being created in the background. This should resolve automatically.'
      })
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    })
  }
}

// GET product by slug (supports vendor-slug/product-slug format)
exports.getProductBySlug = async (req, res) => {
  try {
    // Handle both regex route (req.params[0]) and named parameter route (req.params.slug)
    const slug = req.params[0] || req.params.slug

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required"
      })
    }

    let product = null

    // Check if it's vendor-slug/product-slug format (SEO-friendly)
    if (slug.includes('/')) {
      const parts = slug.split('/')
      if (parts.length === 2) {
        const [vendorSlug, productSlug] = parts
        product = await Product.findOne({
          vendorSlug: vendorSlug.toLowerCase(),
          baseSlug: productSlug.toLowerCase(),
          isActive: true
        }).lean()
      }
    }

    // If not found, try exact slug match (backward compatibility)
    if (!product) {
      product = await Product.findOne({
        slug: slug.toLowerCase(),
        isActive: true
      }).lean()
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }

    // Add SEO-friendly URL to response
    const responseData = {
      ...product,
      seoUrl: product.vendorSlug && product.baseSlug
        ? `${product.vendorSlug}/${product.baseSlug}`
        : product.slug
    }

    res.json({
      success: true,
      data: responseData
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// GET products by vendor slug
exports.getProductsByVendor = async (req, res) => {
  try {
    const { vendorSlug } = req.params
    const {
      page = 1,
      limit = 50,
      sort = "popular"
    } = req.query

    const query = {
      vendorSlug,
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
      .allowDiskUse(true)
      .maxTimeMS(30000) // 30 second timeout
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const total = await Product.countDocuments(query).maxTimeMS(30000)

    // Add SEO-friendly URLs to products
    const productsWithSeoUrl = products.map(product => ({
      ...product,
      seoUrl: product.vendorSlug && product.baseSlug
        ? `${product.vendorSlug}/${product.baseSlug}`
        : product.slug
    }))

    res.json({
      success: true,
      data: productsWithSeoUrl,
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

// GET products by shop slug
exports.getProductsByShop = async (req, res) => {
  try {
    const { shopSlug } = req.params
    const { sort = "popular", page = 1, limit = 6, ...filters } = req.query

    const result = await getProductsByShop({
      shopSlug,
      sort,
      filters,
      page: Number(page),
      limit: Number(limit)
    })

    res.json({
      success: true,
      products: result.products || [], // Also include 'products' key for frontend compatibility
      data: result.products || [],
      pagination: result.pagination || {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        pages: 0,
        hasMore: false
      }
    })
  } catch (err) {
    console.error('Error in getProductsByShop:', err)
    // Return empty array instead of error
    res.json({
      success: true,
      data: [],
      pagination: {
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 6),
        total: 0,
        pages: 0,
        hasMore: false
      }
    })
  }
}

// GET products by category and subcategory (paginated)
exports.getProductsByCategory = async (req, res) => {
  try {
    const {
      categorySlug,
      subcategorySlug,
      page = 1,
      limit = 6,
      sort = "popular",
      minPrice,
      maxPrice
    } = req.query

    // If no category or subcategory provided, return empty
    if (!categorySlug && !subcategorySlug) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          pages: 0,
          hasMore: false
        }
      })
    }

    const query = { isActive: true }

    // Build category match conditions - handle slug to name conversion
    if (categorySlug) {
      const categoryConditions = [
        { category: categorySlug },
        { category: { $regex: new RegExp(`^${categorySlug}$`, 'i') } }
      ]

      // Convert slug to name variations (e.g., "women's-wear" -> "Women's Wear", "womens-wear" -> "Women's Wear")
      const categoryNameFromSlug = categorySlug
        .replace(/-/g, ' ')  // Replace hyphens with spaces
        .replace(/\b\w/g, l => l.toUpperCase())  // Capitalize first letter of each word
        .replace(/Womens/g, "Women's")  // Handle "womens" -> "Women's"
        .replace(/Mens/g, "Men's")  // Handle "mens" -> "Men's"

      categoryConditions.push(
        { category: { $regex: new RegExp(`^${categoryNameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      )

      // Also try direct name matching with various formats
      categoryConditions.push(
        { category: { $regex: new RegExp(categorySlug.replace(/[-_]/g, '[\\s_-]*'), 'i') } }
      )

      query.$or = categoryConditions
    }

    // Add subcategory filter - handle slug to name conversion and partial matching
    if (subcategorySlug) {
      const subcategoryConditions = [
        { subcategory: subcategorySlug },
        { subcategory: { $regex: new RegExp(`^${subcategorySlug}$`, 'i') } },
        { productType: subcategorySlug },
        { productType: { $regex: new RegExp(`^${subcategorySlug}$`, 'i') } }
      ]

      // Convert slug to name (e.g., "womens-jackets" -> "Jackets & Coats" or "Jackets")
      const subcategoryNameFromSlug = subcategorySlug
        .replace(/-/g, ' ')  // Replace hyphens with spaces
        .replace(/\b\w/g, l => l.toUpperCase())  // Capitalize first letter of each word
        .replace(/Womens |Mens |Women S |Men S /g, '')  // Remove "Womens " or "Mens " prefix

      // Try exact name match
      subcategoryConditions.push(
        { subcategory: { $regex: new RegExp(`^${subcategoryNameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { productType: { $regex: new RegExp(`^${subcategoryNameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      )

      // Try partial matching (e.g., "jackets" matches "Jackets & Coats")
      const subcategoryWords = subcategoryNameFromSlug.split(/\s+/).filter(w => w.length > 2)
      if (subcategoryWords.length > 0) {
        // Match if subcategory contains any of the words
        subcategoryWords.forEach(word => {
          subcategoryConditions.push(
            { subcategory: { $regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
            { productType: { $regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
          )
        })
      }

      // IMPORTANT: Ensure category filter is maintained when filtering by subcategory
      // This prevents men's-wear/jacket from showing women's jackets
      // Combine with category conditions if they exist - use $and to ensure both category AND subcategory match
      if (query.$or) {
        query.$and = [
          { $or: query.$or },  // Category conditions (e.g., "Men's Wear")
          { $or: subcategoryConditions }  // Subcategory conditions (e.g., "Jackets")
        ]
        delete query.$or
      } else {
        query.$or = subcategoryConditions
      }
    }

    // Add price filter if provided
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice && minPrice !== 'undefined') {
        query.price.$gte = Number(minPrice)
      }
      if (maxPrice && maxPrice !== 'undefined') {
        query.price.$lte = Number(maxPrice)
      }
    }

    // Sort options
    const sortOptions = {
      popular: { reviews: -1, rating: -1 },
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      newest: { createdAt: -1, dateAdded: -1 },
      rating: { rating: -1 }
    }

    const sortQuery = sortOptions[sort] || sortOptions.popular
    const skip = (Number(page) - 1) * Number(limit)

    const products = await Product.find(query)
      .allowDiskUse(true)
      .maxTimeMS(30000) // 30 second timeout
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean()
      .select('name slug baseSlug vendorSlug price originalPrice images brand category subcategory emoji isTrending rating reviews')

    const total = await Product.countDocuments(query).maxTimeMS(30000)

    // Always return success, even if no products found
    res.json({
      success: true,
      data: products || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / Number(limit)),
        hasMore: skip + (products?.length || 0) < (total || 0)
      }
    })
  } catch (err) {
    console.error('Error in getProductsByCategory:', err)
    // Return empty array instead of error to prevent 404
    res.json({
      success: true,
      data: [],
      pagination: {
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 6),
        total: 0,
        pages: 0,
        hasMore: false
      }
    })
  }
}

// GET trending products - shows recent active products
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 20 } = req.query

    console.log(`Fetching trending products (limit: ${limit})...`)

    const products = await Product.find({
      isActive: true
    })
      .allowDiskUse(true)
      .maxTimeMS(30000) // 30 second timeout
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(Number(limit))
      .lean()

    console.log(`Found ${products.length} trending products`)

    // Add SEO-friendly URLs to products
    const productsWithSeoUrl = products.map(product => ({
      ...product,
      seoUrl: product.vendorSlug && product.baseSlug
        ? `${product.vendorSlug}/${product.baseSlug}`
        : product.slug
    }))

    res.json({
      success: true,
      data: productsWithSeoUrl
    })
  } catch (err) {
    console.error('Error fetching trending products:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

exports.createProduct = async (req, res) => {
  try {
    // Ensure isActive is set
    if (req.body.isActive === undefined) {
      req.body.isActive = true
    }

    // Auto-create category if it doesn't exist
    if (req.body.category) {
      // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
      const majorCategory = (req.body.brand && req.body.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE"
      await ensureCategory(req.body.category, req.body.productType, majorCategory)
    }

    // Use service to create product (which auto-assigns shops)
    const product = await createProductService(req.body)

    res.status(201).json({
      success: true,
      data: product
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

exports.createBulkProducts = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Request body must be an array"
      })
    }

    // Ensure isActive is set for all products and auto-create categories
    const createdProducts = []

    for (const productData of req.body) {
      try {
        if (productData.isActive === undefined) {
          productData.isActive = true
        }

        // Auto-create category if it doesn't exist
        if (productData.category) {
          // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
          const majorCategory = (productData.brand && productData.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE"
          await ensureCategory(productData.category, productData.productType, majorCategory)
        }

        // Use service to create product (which auto-assigns shops)
        const product = await createProductService(productData)
        createdProducts.push(product)
      } catch (err) {
        console.error(`Error creating product ${productData.name}:`, err.message)
        // Continue with other products even if one fails
      }
    }

    res.status(201).json({
      success: true,
      count: createdProducts.length,
      data: createdProducts,
      message: `Created ${createdProducts.length} out of ${req.body.length} products`
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
}

// UPDATE product by ID
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // If brand is being updated, set majorCategory automatically
    if (updateData.brand !== undefined) {
      updateData.majorCategory = (updateData.brand && updateData.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE"
    }

    // Find and update product
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }

    // Reassign to shops if price/category/brand/isTrending changed
    // Also reassign if brand changes (affects majorCategory)
    if (updateData.price || updateData.category || updateData.brand || updateData.majorCategory || updateData.isTrending !== undefined) {
      const { assignProductToShops } = require("../assignment/assignment.service")
      await assignProductToShops(product)
    }

    // Update category counts if category changed
    if (updateData.category) {
      const { updateCategoryCounts } = require("../category/category.service")
      updateCategoryCounts().catch(err => {
        console.error('Error updating category counts:', err.message)
      })
    }

    res.json({
      success: true,
      data: product
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// DELETE product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findByIdAndDelete(id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }

    // Update category counts
    const { updateCategoryCounts } = require("../category/category.service")
    updateCategoryCounts().catch(err => {
      console.error('Error updating category counts after delete:', err.message)
    })

    res.json({
      success: true,
      message: "Product deleted successfully"
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// PATCH product by ID (partial update)
exports.patchProduct = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }

    res.json({
      success: true,
      data: product
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}