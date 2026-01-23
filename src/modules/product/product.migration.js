const Product = require("./product.model")

/**
 * Category mapping: old category values -> { category, subcategory }
 */
const categoryMapping = {
  // Men's Wear
  'jeans': { category: "Men's Wear", subcategory: "jeans", productType: "Jeans" },
  'jean': { category: "Men's Wear", subcategory: "jeans", productType: "Jeans" },
  'shirt': { category: "Men's Wear", subcategory: "shirts", productType: "Shirt" },
  'shirts': { category: "Men's Wear", subcategory: "shirts", productType: "Shirt" },
  'tshirt': { category: "Men's Wear", subcategory: "tshirts", productType: "Tshirt" },
  'tshirts': { category: "Men's Wear", subcategory: "tshirts", productType: "Tshirt" },
  't-shirt': { category: "Men's Wear", subcategory: "tshirts", productType: "Tshirt" },
  't-shirts': { category: "Men's Wear", subcategory: "tshirts", productType: "Tshirt" },
  'polo': { category: "Men's Wear", subcategory: "tshirts", productType: "Polo Shirt" },
  'polo shirt': { category: "Men's Wear", subcategory: "tshirts", productType: "Polo Shirt" },
  'polo tshirt': { category: "Men's Wear", subcategory: "tshirts", productType: "Polo Shirt" },
  'jacket': { category: "Men's Wear", subcategory: "jackets", productType: "Jacket" },
  'jackets': { category: "Men's Wear", subcategory: "jackets", productType: "Jacket" },
  'trouser': { category: "Men's Wear", subcategory: "trousers", productType: "Trouser" },
  'trousers': { category: "Men's Wear", subcategory: "trousers", productType: "Trouser" },
  'suit': { category: "Men's Wear", subcategory: "suits", productType: "Suit" },
  'suits': { category: "Men's Wear", subcategory: "suits", productType: "Suit" },
  'blazer': { category: "Men's Wear", subcategory: "suits", productType: "Blazer" },
  'sweatshirt': { category: "Men's Wear", subcategory: "sweatshirts", productType: "Sweatshirt" },
  'sweatshirts': { category: "Men's Wear", subcategory: "sweatshirts", productType: "Sweatshirt" },
  'sweater': { category: "Men's Wear", subcategory: "sweaters", productType: "Sweater" },
  'sweaters': { category: "Men's Wear", subcategory: "sweaters", productType: "Sweater" },
  'tracksuit': { category: "Men's Wear", subcategory: "tracksuits", productType: "Tracksuit" },
  'tracksuits': { category: "Men's Wear", subcategory: "tracksuits", productType: "Tracksuit" },

  // Women's Wear
  'dress': { category: "Women's Wear", subcategory: "dresses", productType: "Dress" },
  'dresses': { category: "Women's Wear", subcategory: "dresses", productType: "Dress" },
  'top': { category: "Women's Wear", subcategory: "tops", productType: "Top" },
  'tops': { category: "Women's Wear", subcategory: "tops", productType: "Top" },
  'skirt': { category: "Women's Wear", subcategory: "skirts", productType: "Skirt" },
  'skirts': { category: "Women's Wear", subcategory: "skirts", productType: "Skirt" },
  'kurta': { category: "Women's Wear", subcategory: "kurtas", productType: "Kurta" },
  'kurtas': { category: "Women's Wear", subcategory: "kurtas", productType: "Kurta" },
  'kurta set': { category: "Women's Wear", subcategory: "kurta-sets", productType: "Kurta Set" },
  'kurta sets': { category: "Women's Wear", subcategory: "kurta-sets", productType: "Kurta Set" },

  // Footwear
  'shoe': { category: "Footwear", subcategory: "casual-shoes", productType: "Shoe" },
  'shoes': { category: "Footwear", subcategory: "casual-shoes", productType: "Shoe" },
  'sneaker': { category: "Footwear", subcategory: "sports-shoes", productType: "Sneaker" },
  'sneakers': { category: "Footwear", subcategory: "sports-shoes", productType: "Sneaker" },
  'sandal': { category: "Footwear", subcategory: "sandals", productType: "Sandal" },
  'sandals': { category: "Footwear", subcategory: "sandals", productType: "Sandal" },

  // Personal Care
  'face wash': { category: "Personal Care", subcategory: "face-care", productType: "Face Wash" },
  'facewash': { category: "Personal Care", subcategory: "face-care", productType: "Face Wash" },
  'face-wash': { category: "Personal Care", subcategory: "face-care", productType: "Face Wash" },
}

/**
 * Normalize category name for matching
 */
function normalizeCategory(category) {
  if (!category) return ''
  return category.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Find matching category mapping
 */
function findCategoryMapping(oldCategory, productName = '', audienceGender = null) {
  if (!oldCategory) return null

  const normalized = normalizeCategory(oldCategory)
  const nameLower = (productName || '').toLowerCase()

  // Direct match
  if (categoryMapping[normalized]) {
    return categoryMapping[normalized]
  }

  // Partial match (e.g., "men's jeans" -> "jeans")
  for (const [key, value] of Object.entries(categoryMapping)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // If we have gender info, prefer matching gender
      if (audienceGender) {
        const genderLower = audienceGender.toLowerCase()
        if (genderLower === 'men' && value.category === "Men's Wear") {
          return value
        }
        if (genderLower === 'women' && value.category === "Women's Wear") {
          return value
        }
      }
      return value
    }
  }

  // Check product name for clues
  if (productName) {
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (nameLower.includes(key)) {
        // If we have gender info, prefer matching gender
        if (audienceGender) {
          const genderLower = audienceGender.toLowerCase()
          if (genderLower === 'men' && value.category === "Men's Wear") {
            return value
          }
          if (genderLower === 'women' && value.category === "Women's Wear") {
            return value
          }
        }
        return value
      }
    }
  }

  // Check if it's already a proper category
  const properCategories = ["Men's Wear", "Women's Wear", "Kids Wear", "Footwear", "Perfumes", "Personal Care"]
  if (properCategories.some(cat => normalized.includes(cat.toLowerCase()))) {
    // It's already a proper category, just extract subcategory from productType
    return null
  }

  return null
}

/**
 * Migrate products: Fix category and subcategory structure
 */
async function migrateProductCategories() {
  try {
    const products = await Product.find({ isActive: true })
    let updatedCount = 0
    let skippedCount = 0
    const updates = []

    for (const product of products) {
      const oldCategory = product.category
      const mapping = findCategoryMapping(
        oldCategory,
        product.name,
        product.audience?.gender
      )

      if (mapping) {
        // Update product
        const updateData = {
          category: mapping.category,
          subcategory: mapping.subcategory
        }

        // Update productType if not set or if it's the same as old category
        if (!product.productType || normalizeCategory(product.productType) === normalizeCategory(oldCategory)) {
          updateData.productType = mapping.productType
        }

        await Product.updateOne(
          { _id: product._id },
          { $set: updateData }
        )

        updatedCount++
        updates.push({
          productId: product._id,
          productName: product.name,
          oldCategory: oldCategory,
          newCategory: mapping.category,
          newSubcategory: mapping.subcategory,
          newProductType: updateData.productType || product.productType
        })
      } else {
        // Check if category is already correct but subcategory is missing
        const properCategories = ["Men's Wear", "Women's Wear", "Kids Wear", "Footwear", "Perfumes", "Personal Care"]
        const normalizedCategory = normalizeCategory(oldCategory)
        const isProperCategory = properCategories.some(cat =>
          normalizedCategory.includes(cat.toLowerCase()) || cat.toLowerCase().includes(normalizedCategory)
        )

        if (isProperCategory && !product.subcategory && product.productType) {
          // Category is correct, just populate subcategory
          const subcategory = product.productType.toLowerCase().replace(/\s+/g, '-')
          await Product.updateOne(
            { _id: product._id },
            { $set: { subcategory: subcategory } }
          )
          updatedCount++
          updates.push({
            productId: product._id,
            productName: product.name,
            oldCategory: oldCategory,
            newCategory: oldCategory,
            newSubcategory: subcategory,
            action: 'populated_subcategory'
          })
        } else {
          skippedCount++
        }
      }
    }

    return {
      success: true,
      totalProducts: products.length,
      updatedCount,
      skippedCount,
      updates: updates.slice(0, 20) // Return first 20 for preview
    }
  } catch (error) {
    console.error("Error migrating product categories:", error)
    throw error
  }
}

module.exports = {
  migrateProductCategories,
  categoryMapping,
  findCategoryMapping
}

