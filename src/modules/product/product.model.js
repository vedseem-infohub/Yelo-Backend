const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },


    baseSlug: {
      type: String,
      required: false, 
      lowercase: true,
      trim: true
    },

    slug: {
      type: String,
      required: false, 
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },

    description: String,

    price: {
      type: Number,
      required: true,
      index: true
    },

    originalPrice: Number,

    discount: {
      type: Number,
      default: 0
    },

    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    audience: {
      gender: {
        type: String,
        enum: ["MEN", "WOMEN", "KIDS", "UNISEX"],
        index: true
      },
      ageGroup: {
        type: String,
        enum: ["ADULT", "KIDS"],
        index: true
      }
    },

    productType: {
      type: String, 
      index: true
    },

    subcategory: {
      type: String, 
      index: true
    },

    occasion: {
      type: [String],
      index: true
    },

    material: {
      type: [String], 
      index: true
    },

    fit: {
      type: String 
    },

    category: {
      type: String,
      index: true
    },

    brand: String,

    rating: {
      type: Number,
      default: 0,
      index: true
    },

    reviews: {
      type: Number,
      default: 0,
      index: true
    },

    sizes: [String],

    colors: [
      {
        name: String,
        value: String
      }
    ],

    images: [
      {
        url: {
          type: String,
          required: true
        },
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false
        }
      }
    ],

    isTrending: {
      type: Boolean,
      default: false,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    dateAdded: {
      type: Date,
      default: Date.now,
      index: true
    },

    majorCategory: {
      type: String,
      enum: ["AFFORDABLE", "LUXURY"],
      index: true
    },

    assignedShops: {
      type: [String],
      index: true
    },

    vendorSlug: {
      type: String,
      required: false, 
      index: true,
      lowercase: true,
      trim: true
    }
  },
  { timestamps: true }
)
productSchema.index({ category: 1, isActive: 1, price: 1 }, {
  name: 'category_isActive_price',
  background: true
})

productSchema.index({ category: 1, isActive: 1, createdAt: -1 }, {
  name: 'category_isActive_createdAt',
  background: true
})

productSchema.index({ category: 1, isActive: 1, rating: -1 }, {
  name: 'category_isActive_rating',
  background: true
})

productSchema.index({ category: 1, isActive: 1, reviews: -1, rating: -1 }, {
  name: 'category_isActive_popular',
  background: true
})

productSchema.index({ brand: 1, isActive: 1, price: 1 }, {
  name: 'brand_isActive_price',
  background: true,
  sparse: true
})

productSchema.index({ brand: 1, isActive: 1, createdAt: -1 }, {
  name: 'brand_isActive_createdAt',
  background: true,
  sparse: true
})

productSchema.index({ brand: 1, isActive: 1, rating: -1 }, {
  name: 'brand_isActive_rating',
  background: true,
  sparse: true
})

productSchema.index({ category: 1, brand: 1, isActive: 1, price: 1 }, {
  name: 'category_brand_isActive_price',
  background: true,
  sparse: true
})

productSchema.index({ isActive: 1, price: 1 }, {
  name: 'isActive_price',
  background: true
})

productSchema.index({ isActive: 1, createdAt: -1 }, {
  name: 'isActive_createdAt',
  background: true
})

productSchema.index({ isActive: 1, rating: -1 }, {
  name: 'isActive_rating',
  background: true
})

// Trending/Popular products
productSchema.index({ isTrending: 1, isActive: 1, reviews: -1, rating: -1 }, {
  name: 'isTrending_isActive_popular',
  background: true
})

// Subcategory indexes (for category/subcategory pages)
productSchema.index({ category: 1, subcategory: 1, isActive: 1, price: 1 }, {
  name: 'category_subcategory_isActive_price_low',
  background: true
})

productSchema.index({ category: 1, subcategory: 1, isActive: 1, price: -1 }, {
  name: 'category_subcategory_isActive_price_high',
  background: true
})

productSchema.index({ category: 1, subcategory: 1, isActive: 1, createdAt: -1 }, {
  name: 'category_subcategory_isActive_createdAt',
  background: true
})

productSchema.index({ category: 1, subcategory: 1, isActive: 1, rating: -1 }, {
  name: 'category_subcategory_isActive_rating',
  background: true
})

productSchema.index({ category: 1, subcategory: 1, isActive: 1, reviews: -1, rating: -1 }, {
  name: 'category_subcategory_isActive_popular',
  background: true
})

productSchema.index({ assignedShops: 1, isActive: 1, price: 1 }, {
  name: 'assignedShops_isActive_price',
  background: true
})

productSchema.index({ assignedShops: 1, isActive: 1, createdAt: -1 }, {
  name: 'assignedShops_isActive_createdAt',
  background: true
})

productSchema.index({ assignedShops: 1, isActive: 1, rating: -1 }, {
  name: 'assignedShops_isActive_rating',
  background: true
})

// AssignedShops + Popular Sorting (for shop pages - reviews + rating)
productSchema.index({ assignedShops: 1, isActive: 1, reviews: -1, rating: -1 }, {
  name: 'assignedShops_isActive_popular',
  background: true
})

// Discount-based compound indexes for offers queries
// Following ESR rule: Equality (isActive) → Sort/Range (discount/price)

// Index for products with discount field: helps with filtering discount > 10 and sorting
productSchema.index({ isActive: 1, discount: -1 }, {
  name: 'isActive_discount_desc',
  background: true
})

// Partial index for offers: only indexes active products with discount > 10 (very efficient for offers queries)
productSchema.index({ isActive: 1, discount: -1 }, {
  name: 'isActive_discount_gt_10_partial',
  background: true,
  partialFilterExpression: {
    isActive: true,
    discount: { $gt: 10 }
  }
})

// Index for products using originalPrice/price calculation: helps with filtering and sorting
// originalPrice: -1 helps with sorting by calculated discount (higher originalPrice = higher discount potential)
productSchema.index({ isActive: 1, originalPrice: -1, price: 1 }, {
  name: 'isActive_originalPrice_desc_price_asc',
  background: true
})

// Index for price-based filtering with discount calculation
productSchema.index({ isActive: 1, price: 1, originalPrice: -1 }, {
  name: 'isActive_price_asc_originalPrice_desc',
  background: true
})

// Index for brand filtering in offers (when brand filter is applied)
productSchema.index({ isActive: 1, brand: 1, discount: -1 }, {
  name: 'isActive_brand_discount_desc',
  background: true,
  sparse: true
})

/**
 * Auto-generate:
 * 1. final slug = baseSlug + vendorSlug (for backward compatibility)
 *    But also support vendor-slug/product-slug format in URLs for SEO
 * 2. majorCategory
 */
productSchema.pre("validate", function () {
  // Auto-generate baseSlug from name if not provided
  if (!this.baseSlug && this.name) {
    this.baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  // Generate slug as baseSlug-vendorSlug for database uniqueness
  // Frontend will construct vendor-slug/product-slug URLs for SEO
  if (!this.slug) {
    // Generate a short unique ID (last 6 chars of timestamp in base36)
    const uniqueId = Date.now().toString(36).slice(-6)

    if (this.baseSlug && this.vendorSlug) {
      this.slug = `${this.baseSlug}-${this.vendorSlug}-${uniqueId}`
    } else if (this.baseSlug) {
      // If vendorSlug is missing, use baseSlug with unique ID
      this.slug = `${this.baseSlug}-${uniqueId}`
    }

    console.log(`Generated unique slug: ${this.slug}`)
  }

  // Ensure slug and baseSlug are set (validation will fail if not)
  if (!this.baseSlug) {
    throw new Error('baseSlug is required. Provide either baseSlug or name field.')
  }
  if (!this.slug) {
    throw new Error('slug is required. Provide either slug or both baseSlug and vendorSlug fields.')
  }

  // Assign majorCategory based on brand presence: if brand exists, it's LUXURY, otherwise AFFORDABLE
  this.majorCategory = (this.brand && this.brand.trim() !== '') ? "LUXURY" : "AFFORDABLE"

  // Auto-populate subcategory from productType if not set
  if (this.productType && !this.subcategory) {
    // Normalize productType to subcategory format
    this.subcategory = this.productType.toLowerCase().replace(/\s+/g, '-')
  }
})

// Slug deduplication - ensure unique slugs before saving
productSchema.pre("save", async function (next) {
  // Only check for duplicates if this is a new document
  if (!this.isNew) {
    return next()
  }

  const Product = this.constructor
  let baseSlug = this.slug
  let counter = 1
  let isUnique = false

  console.log(`Checking slug uniqueness for: ${baseSlug}`)

  while (!isUnique) {
    try {
      const existingProduct = await Product.findOne({ slug: this.slug, _id: { $ne: this._id } }).lean()

      if (!existingProduct) {
        isUnique = true
        console.log(`Unique slug found: ${this.slug}`)
      } else {
        // Slug exists, append counter
        this.slug = `${baseSlug}-${counter}`
        counter++
        console.log(`Slug already exists, trying: ${this.slug}`)
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error)
      return next(error)
    }
  }

  next()
})

// Virtual for SEO-friendly URL format
productSchema.virtual('seoUrl').get(function () {
  if (this.vendorSlug && this.baseSlug) {
    return `${this.vendorSlug}/${this.baseSlug}`
  }
  return this.slug
})

// Auto-assign products to shops after save (create or update)
productSchema.post('save', async function () {
  try {
    const { assignProductToShops } = require("../assignment/assignment.service")
    await assignProductToShops(this)

    // Update category counts in background (non-blocking)
    const { updateCategoryCounts } = require("../category/category.service")
    updateCategoryCounts().catch(err => {
      console.error('Error updating category counts after product save:', err.message)
    })
  } catch (error) {
    console.error(`Error auto-assigning product ${this._id} to shops:`, error.message)
    // Don't throw - assignment failure shouldn't prevent product save
  }
})

// Auto-assign products to shops after update
productSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    try {
      const { assignProductToShops } = require("../assignment/assignment.service")
      await assignProductToShops(doc)

      // Update category counts in background (non-blocking)
      const { updateCategoryCounts } = require("../category/category.service")
      updateCategoryCounts().catch(err => {
        console.error('Error updating category counts after product update:', err.message)
      })
    } catch (error) {
      console.error(`Error auto-assigning product ${doc._id} to shops:`, error.message)
    }
  }
})

// Update category counts after product deletion (for findOneAndDelete, findByIdAndDelete, etc.)
productSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    try {
      const { updateCategoryCounts } = require("../category/category.service")
      // Run in background - don't block deletion
      updateCategoryCounts().catch(err => {
        console.error('Error updating category counts after product delete:', err.message)
      })
    } catch (error) {
      console.error('Error in post-delete hook:', error.message)
    }
  }
})

// Update category counts after product removal (for document.remove())
productSchema.post('remove', async function () {
  try {
    const { updateCategoryCounts } = require("../category/category.service")
    // Run in background - don't block deletion
    updateCategoryCounts().catch(err => {
      console.error('Error updating category counts after product remove:', err.message)
    })
  } catch (error) {
    console.error('Error in post-remove hook:', error.message)
  }
})

module.exports = mongoose.model("Product", productSchema)
