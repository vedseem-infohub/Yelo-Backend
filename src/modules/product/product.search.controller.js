const Product = require("./product.model")
const Category = require("../category/category.model")

// GET search suggestions - returns top 5 product names matching the search
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q, includeLuxury } = req.query

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: []
      })
    }

    const searchTerm = q.trim()
    const shouldIncludeLuxury = includeLuxury === 'true' || includeLuxury === true

    // Simple case-insensitive regex pattern
    const searchPattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    // Build query - exclude luxury products unless explicitly requested
    const query = {
      isActive: true,
      $or: [
        { name: searchPattern },
        { brand: searchPattern },
        { category: searchPattern },
        { subcategory: searchPattern }
      ]
    }

    // Exclude luxury products (products with brands) unless includeLuxury is true
    if (!shouldIncludeLuxury) {
      query.$and = [
        {
          $or: [
            { brand: { $exists: false } },
            { brand: null },
            { brand: '' }
          ]
        }
      ]
    }

    // Search products - get top 5 matching product names
    const products = await Product.find(query)
      .select('name brand category')
      .limit(5)
      .sort({ createdAt: -1 })
      .lean()

    const suggestions = products.map(product => ({
      type: 'product',
      id: product._id,
      name: product.name,
      brand: product.brand,
      category: product.category
    }))

    res.json({
      success: true,
      data: suggestions
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// GET comprehensive search - returns products, categories, and subcategories
exports.comprehensiveSearch = async (req, res) => {
  try {
    const { q, includeLuxury } = req.query

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: {
          products: [],
          categories: [],
          subcategories: []
        }
      })
    }

    const searchTerm = q.trim()
    const shouldIncludeLuxury = includeLuxury === 'true' || includeLuxury === true

    // Simple case-insensitive regex pattern
    const searchPattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    // Build query - exclude luxury products unless explicitly requested
    const productQuery = {
      isActive: true,
      $or: [
        { name: searchPattern },
        { brand: searchPattern },
        { category: searchPattern },
        { subcategory: searchPattern },
        { description: searchPattern }
      ]
    }

    // Exclude luxury products (products with brands) unless includeLuxury is true
    if (!shouldIncludeLuxury) {
      productQuery.$and = [
        {
          $or: [
            { brand: { $exists: false } },
            { brand: null },
            { brand: '' }
          ]
        }
      ]
    }

    // Search products
    const products = await Product.find(productQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    // Search categories
    const categories = await Category.find({
      isActive: true,
      $or: [
        { name: searchPattern },
        { slug: searchPattern }
      ]
    })
      .select('name slug icon image')
      .lean()

    // Extract subcategories from categories and search separately
    const subcategories = []
    categories.forEach(category => {
      if (category.subcategories && Array.isArray(category.subcategories)) {
        category.subcategories.forEach(sub => {
          const subNameMatch = sub.name && searchPattern.test(sub.name)
          const subSlugMatch = sub.slug && searchPattern.test(sub.slug)

          if (sub.isActive !== false && (subNameMatch || subSlugMatch)) {
            subcategories.push({
              id: sub._id || sub.slug,
              name: sub.name,
              slug: sub.slug,
              icon: sub.icon,
              image: sub.image,
              categoryName: category.name,
              categorySlug: category.slug
            })
          }
        })
      }
    })

    res.json({
      success: true,
      data: {
        products: products.map(p => ({
          ...p,
          id: p._id
        })),
        categories: categories.map(c => ({
          id: c._id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          image: c.image
        })),
        subcategories
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}
