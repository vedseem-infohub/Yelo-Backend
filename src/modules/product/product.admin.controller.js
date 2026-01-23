const Product = require("./product.model")
const { assignProductToShops } = require("../assignment/assignment.service")
const { ensureCategory, updateCategoryCounts } = require("../category/category.service")
const seedShops = require("../shop/shop.seed")

async function deleteAllProducts(req, res) {
  try {
    const result = await Product.deleteMany({})

    // Update category counts in background (non-blocking)
    updateCategoryCounts().catch(err => {
      console.error('Error updating category counts after delete all:', err.message)
    })

    res.json({ success: true, message: `Deleted ${result.deletedCount} products.` })
  } catch (error) {
    console.error("Error deleting all products:", error)
    res.status(500).json({ success: false, message: "Failed to delete all products." })
  }
}

async function deleteProductsByCriteria(req, res) {
  try {
    const criteria = req.body
    if (Object.keys(criteria).length === 0) {
      return res.status(400).json({ success: false, message: "Deletion criteria cannot be empty." })
    }
    const result = await Product.deleteMany(criteria)

    // Update category counts in background (non-blocking)
    updateCategoryCounts().catch(err => {
      console.error('Error updating category counts after delete by criteria:', err.message)
    })

    res.json({ success: true, message: `Deleted ${result.deletedCount} products matching criteria.`, criteria })
  } catch (error) {
    console.error("Error deleting products by criteria:", error)
    res.status(500).json({ success: false, message: "Failed to delete products by criteria." })
  }
}

// Seed shops (ensures all shops exist)
async function seedShopsEndpoint(req, res) {
  try {
    await seedShops()
    res.json({
      success: true,
      message: "Shops seeded successfully"
    })
  } catch (error) {
    console.error("Error seeding shops:", error)
    res.status(500).json({
      success: false,
      message: "Failed to seed shops.",
      error: error.message
    })
  }
}

// Reassign all products to shops and create categories
async function reassignAndSyncProducts(req, res) {
  try {
    // First ensure shops are seeded
    await seedShops()

    const products = await Product.find({ isActive: true })
    let assignedCount = 0
    let categoryCount = 0
    const assignmentDetails = []

    for (const product of products) {
      try {
        // Reassign to shops
        const assignedShops = await assignProductToShops(product)
        assignedCount++

        if (assignedShops.length > 0) {
          assignmentDetails.push({
            productId: product._id,
            productName: product.name,
            shops: assignedShops
          })
        }

        // Create category if it doesn't exist
        if (product.category) {
          // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
          const majorCategory = product.majorCategory || ((product.brand && product.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE")
          await ensureCategory(product.category, product.productType, majorCategory)
          categoryCount++
        }
      } catch (err) {
        console.error(`Error processing product ${product._id}:`, err.message)
      }
    }

    // Update category counts
    await updateCategoryCounts()

    res.json({
      success: true,
      message: `Reassigned ${assignedCount} products and synced ${categoryCount} categories.`,
      assignedCount,
      categoryCount,
      totalProducts: products.length,
      assignmentDetails: assignmentDetails.slice(0, 10) // Show first 10 for debugging
    })
  } catch (error) {
    console.error("Error reassigning and syncing products:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reassign and sync products.",
      error: error.message
    })
  }
}

// Migrate product categories: Fix category/subcategory structure
async function migrateCategories(req, res) {
  try {
    const { migrateProductCategories } = require("./product.migration")
    const result = await migrateProductCategories()

    // Reassign products to shops after migration
    const { reassignAllProducts } = require("../assignment/assignment.service")
    await reassignAllProducts()

    // Sync categories
    const { ensureCategory, updateCategoryCounts } = require("../category/category.service")
    const products = await Product.find({ isActive: true })
    for (const product of products) {
      if (product.category) {
        const majorCategory = product.majorCategory || (product.price <= 2000 ? "AFFORDABLE" : "LUXURY")
        await ensureCategory(product.category, product.productType, majorCategory)
      }
    }
    await updateCategoryCounts()

    res.json({
      success: true,
      message: `Migrated ${result.updatedCount} products. Categories and subcategories fixed.`,
      ...result
    })
  } catch (error) {
    console.error("Error migrating categories:", error)
    res.status(500).json({
      success: false,
      message: "Failed to migrate categories.",
      error: error.message
    })
  }
}

// Populate subcategory field from productType for all products
async function populateSubcategories(req, res) {
  try {
    const products = await Product.find({
      isActive: true,
      productType: { $exists: true, $ne: null },
      $or: [
        { subcategory: { $exists: false } },
        { subcategory: null },
        { subcategory: "" }
      ]
    })

    let updatedCount = 0

    for (const product of products) {
      if (product.productType) {
        const subcategory = product.productType.toLowerCase().replace(/\s+/g, '-')
        await Product.updateOne(
          { _id: product._id },
          { subcategory: subcategory }
        )
        updatedCount++
      }
    }

    res.json({
      success: true,
      message: `Populated subcategory for ${updatedCount} products.`,
      updatedCount,
      totalProducts: products.length
    })
  } catch (error) {
    console.error("Error populating subcategories:", error)
    res.status(500).json({
      success: false,
      message: "Failed to populate subcategories.",
      error: error.message
    })
  }
}

// Create categories from all existing products
async function createCategoriesFromProducts(req, res) {
  try {
    const products = await Product.find({ isActive: true, category: { $exists: true, $ne: null } })
    const categoriesCreated = new Set()
    let count = 0

    for (const product of products) {
      try {
        if (product.category) {
          // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
          const majorCategory = product.majorCategory || ((product.brand && product.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE")
          await ensureCategory(product.category, product.productType, majorCategory)

          if (!categoriesCreated.has(product.category)) {
            categoriesCreated.add(product.category)
            count++
          }
        }
      } catch (err) {
        console.error(`Error creating category for product ${product._id}:`, err.message)
      }
    }

    // Update category counts
    await updateCategoryCounts()

    res.json({
      success: true,
      message: `Created ${count} categories from existing products.`,
      categoriesCreated: Array.from(categoriesCreated),
      count
    })
  } catch (error) {
    console.error("Error creating categories from products:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create categories from products.",
      error: error.message
    })
  }
}

// Debug endpoint: Get product data with shop assignments
// Check index status and ensure they're created
async function checkIndexes(req, res) {
  try {
    const { ensureProductIndexes } = require('./ensure-indexes')
    const result = await ensureProductIndexes()

    res.json({
      success: true,
      message: 'Indexes checked and ensured',
      ...result
    })
  } catch (error) {
    console.error('Error checking indexes:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check indexes',
      error: error.message
    })
  }
}

async function getProductDebugData(req, res) {
  try {
    const { limit = 20, productId, category, productType } = req.query

    const query = { isActive: true }
    if (productId) query._id = productId
    if (category) query.category = category
    if (productType) query.productType = productType

    const products = await Product.find(query)
      .limit(Number(limit))
      .lean()

    const Shop = require("../shop/shop.model")
    const allShops = await Shop.find({}).lean()

    const debugData = products.map(product => {
      // Find which shops this product should be assigned to
      const matchingShops = allShops
        .filter(shop => {
          // Check majorCategory match
          if (shop.majorCategory !== product.majorCategory) return false

          // Check criteria match
          const matchesShopCriteria = require("../assignment/criteriaMatcher")
          return matchesShopCriteria(product, shop.criteria)
        })
        .map(shop => ({
          slug: shop.slug,
          name: shop.name,
          route: shop.route,
          criteria: shop.criteria
        }))

      return {
        _id: product._id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category,
        productType: product.productType,
        subcategory: product.subcategory,
        brand: product.brand,
        majorCategory: product.majorCategory,
        assignedShops: product.assignedShops || [],
        shouldBeAssignedTo: matchingShops.map(s => s.slug),
        matchingShops: matchingShops,
        isCorrectlyAssigned: JSON.stringify((product.assignedShops || []).sort()) ===
          JSON.stringify(matchingShops.map(s => s.slug).sort())
      }
    })

    res.json({
      success: true,
      totalProducts: products.length,
      products: debugData,
      summary: {
        totalChecked: debugData.length,
        correctlyAssigned: debugData.filter(p => p.isCorrectlyAssigned).length,
        incorrectlyAssigned: debugData.filter(p => !p.isCorrectlyAssigned).length,
        notAssigned: debugData.filter(p => p.assignedShops.length === 0).length
      }
    })
  } catch (error) {
    console.error("Error getting product debug data:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get product debug data.",
      error: error.message
    })
  }
}

module.exports = {
  deleteAllProducts,
  deleteProductsByCriteria,
  reassignAndSyncProducts,
  createCategoriesFromProducts,
  seedShopsEndpoint,
  getProductDebugData,
  checkIndexes,
  populateSubcategories,
  migrateCategories
}
