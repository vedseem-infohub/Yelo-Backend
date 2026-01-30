const { getActiveCategories, getCategoryBySlug, updateCategoryCounts, ensureCategory } = require("./category.service")

// GET all categories with products
exports.getAllCategories = async (req, res) => {
  try {
    const { majorCategory, forceUpdate, lightweight, includeInactive } = req.query
    // Only force update if explicitly requested (for admin use)
    const forceUpdateCounts = forceUpdate === 'true'
    const isLightweight = lightweight === 'true'
    const showInactive = includeInactive === 'true' // For admin panel
    
    if (isLightweight) {
      try {
        // NO FILTERING - Return ALL categories from database
        const Category = require("./category.model")
        
        // Only filter by majorCategory if specified, otherwise get ALL
        const baseQuery = {}
        if (majorCategory) {
          baseQuery.majorCategory = { $in: [majorCategory, "ALL"] }
        }

        // Get ALL categories - NO FILTERING, NO DUPLICATE HANDLING, NO LIMITS
        // Use empty query to get EVERYTHING from database (including inactive ones for frontend)
        const categories = await Category.find({})
          .select('name slug image productCount isActive subcategories majorCategory')
          .sort({ name: 1 }) // Simple alphabetical sort
          .lean()
          
        // Ensure we always return an array, never null
        const categoriesArray = Array.isArray(categories) ? categories : []
        
        return res.json({
          success: true,
          data: categoriesArray,
          count: categoriesArray.length
        })
      } catch (err) {
        console.error('Error in lightweight categories endpoint:', err)
        return res.status(500).json({
          success: false,
          message: err.message || 'Failed to fetch categories',
          data: []
        })
      }
    }
    
    // For admin: return all categories without filtering (bypass getActiveCategories)
    if (showInactive) {
      const Category = require("./category.model")
      const baseQuery = {}
      
      if (majorCategory) {
        baseQuery.$and = [
          {
            $or: [
              { majorCategory },
              { majorCategory: "ALL" }
            ]
          }
        ]
      }

      const categories = await Category.find(baseQuery)
        .sort({ productCount: -1, name: 1 })
        .lean()

      return res.json({
        success: true,
        data: categories
      })
    }
    
    // Return ALL categories without filtering - use getActiveCategories but with no filtering
    const Category = require("./category.model")
    const baseQuery = {}
    
    if (majorCategory) {
      baseQuery.majorCategory = { $in: [majorCategory, "ALL"] }
    }
    
    // Get ALL categories with subcategories - no filtering
    const categories = await Category.find(baseQuery)
      .sort({ name: 1 })
      .lean()

    res.json({
      success: true,
      data: categories || []
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// GET category by slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params
    const { lightweight } = req.query
    const category = await getCategoryBySlug(slug)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      })
    }

    // If lightweight, return only subcategories with name and image
    if (lightweight === 'true') {
      const lightweightCategory = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        subcategories: (category.subcategories || []).map(sub => ({
          _id: sub._id,
          name: sub.name,
          slug: sub.slug,
          image: sub.image,
          productCount: sub.productCount,
          isActive: sub.isActive
        }))
      }
      return res.json({
        success: true,
        data: lightweightCategory
      })
    }

    res.json({
      success: true,
      data: category
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// POST create category
exports.createCategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const { name, slug, majorCategory = "ALL", image, icon, subcategories = [] } = req.body

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required"
      })
    }

    // Check if category already exists
    const existing = await Category.findOne({ slug })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists"
      })
    }

    const category = await Category.create({
      name,
      slug,
      majorCategory,
      image: image || null,
      icon: icon || null,
      subcategories: subcategories.map(sub => ({
        name: sub.name,
        slug: sub.slug || sub.subcategorySlug, // Support both 'slug' and 'subcategorySlug'
        image: sub.image || null,
        icon: sub.icon || null,
        productCount: 0,
        isActive: sub.isActive !== false
      })),
      productCount: 0,
      isActive: true
    })

    // Update counts
    await updateCategoryCounts()

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// PUT update category
exports.updateCategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const { slug } = req.params
    const { name, majorCategory, image, icon, isActive } = req.body

    // Handle both slug formats
    let category = await Category.findOne({ slug })
    
    if (!category) {
      // Try with apostrophe variations
      category = await Category.findOne({ 
        $or: [
          { slug: slug.replace(/-/g, "'") },
          { slug: slug.replace(/'/g, "-") }
        ]
      })
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with slug: ${slug}`
      })
    }

    // Update fields only if provided
    if (name) category.name = name
    if (majorCategory) category.majorCategory = majorCategory
    if (image !== undefined) category.image = image
    if (icon !== undefined) category.icon = icon
    // Only update isActive if explicitly provided, otherwise keep current value
    if (isActive !== undefined) {
      category.isActive = isActive
    } else {
      // Ensure category stays active if not explicitly set to inactive
      if (category.isActive === undefined || category.isActive === null) {
        category.isActive = true
      }
    }

    await category.save()
    await updateCategoryCounts()


    res.json({
      success: true,
      message: "Category updated successfully",
      data: category
    })
  } catch (err) {
    console.error('Error updating category:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// DELETE category
exports.deleteCategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const FreeSubcategory = require("./free-subcategory.model")
    const { slug } = req.params

    // Handle both slug formats - try exact match first, then variations
    let category = await Category.findOne({ slug })
    
    // If not found, try with apostrophe variations
    if (!category) {
      category = await Category.findOne({ 
        $or: [
          { slug: slug.replace(/-/g, "'") }, // Try with apostrophe (e.g., "men's-wear")
          { slug: slug.replace(/'/g, "-") },  // Try without apostrophe (e.g., "mens-wear")
          { slug: slug.replace(/-/g, " ") },  // Try with spaces
          { slug: slug.replace(/\s+/g, "-") }  // Try with hyphens
        ]
      })
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with slug: ${slug}`
      })
    }


    // Save subcategories as free subcategories before deleting
    if (category.subcategories && category.subcategories.length > 0) {
      
      for (const subcat of category.subcategories) {
        // Check if free subcategory already exists
        const existingFree = await FreeSubcategory.findOne({ 
          slug: subcat.slug
        })
        
        if (!existingFree) {
          await FreeSubcategory.create({
            name: subcat.name,
            slug: subcat.slug,
            image: subcat.image || null,
            icon: subcat.icon || null,
            productCount: subcat.productCount || 0,
            originalCategorySlug: category.slug,
            originalCategoryName: category.name,
            createdAt: subcat.createdAt || new Date(),
            isActive: subcat.isActive !== false
          })
        } else {
          console.log(`Free subcategory already exists: ${subcat.name}`)
        }
      }
    }

    // Hard delete the category (permanently remove)
    const deleteResult = await Category.deleteOne({ _id: category._id })
    
    if (deleteResult.deletedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete category"
      })
    }


    await updateCategoryCounts()

    res.json({
      success: true,
      message: "Category deleted successfully. Subcategories have been moved to free subcategories.",
      deletedCount: deleteResult.deletedCount
    })
  } catch (err) {
    console.error('Error deleting category:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// POST add subcategory to category
exports.addSubcategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const { slug } = req.params
    const { name, subcategorySlug, image, icon } = req.body

    if (!name || !subcategorySlug) {
      return res.status(400).json({
        success: false,
        message: "Name and subcategorySlug are required"
      })
    }

    const category = await Category.findOne({ slug })
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      })
    }

    // Check if subcategory already exists
    const subExists = category.subcategories.some(sub => sub.slug === subcategorySlug)
    if (subExists) {
      return res.status(400).json({
        success: false,
        message: "Subcategory with this slug already exists"
      })
    }

    category.subcategories.push({
      name,
      slug: subcategorySlug,
      image: image || null,
      icon: icon || null,
      productCount: 0,
      isActive: true
    })

    await category.save()
    await updateCategoryCounts()

    res.json({
      success: true,
      message: "Subcategory added successfully",
      data: category
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// PUT update subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const { slug, subcategorySlug } = req.params
    const { name, image, icon, isActive } = req.body

    const category = await Category.findOne({ slug })
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      })
    }

    const subcategory = category.subcategories.find(sub => sub.slug === subcategorySlug)
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      })
    }

    if (name) subcategory.name = name
    if (image !== undefined) subcategory.image = image
    if (icon !== undefined) subcategory.icon = icon
    if (isActive !== undefined) subcategory.isActive = isActive

    await category.save()
    await updateCategoryCounts()

    res.json({
      success: true,
      message: "Subcategory updated successfully",
      data: category
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// DELETE subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    const Category = require("./category.model")
    const FreeSubcategory = require("./free-subcategory.model")
    const { slug, subcategorySlug } = req.params

    const category = await Category.findOne({ slug })
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      })
    }

    const subIndex = category.subcategories.findIndex(sub => sub.slug === subcategorySlug)
    if (subIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      })
    }

    const subcategory = category.subcategories[subIndex]

    // Move to FreeSubcategory before deleting to preserve product associations
    const existingFree = await FreeSubcategory.findOne({ slug: subcategorySlug })
    if (!existingFree) {
      await FreeSubcategory.create({
        name: subcategory.name,
        slug: subcategory.slug,
        image: subcategory.image || null,
        icon: subcategory.icon || null,
        productCount: subcategory.productCount || 0,
        originalCategorySlug: category.slug,
        originalCategoryName: category.name,
        isActive: subcategory.isActive !== false
      })
    }

    // Hard delete - remove from array
    category.subcategories.splice(subIndex, 1)
    await category.save()

    await updateCategoryCounts()

    res.json({
      success: true,
      message: "Subcategory deleted successfully and moved to free subcategories"
    })
  } catch (err) {
    console.error('Error deleting subcategory:', err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// POST update category counts (admin endpoint)
exports.updateCounts = async (req, res) => {
  try {
    // First merge duplicate categories in database
    const Category = require("./category.model")
    
    // Merge mens-wear duplicates (handle both "mens-wear" and "men's-wear" formats)
    // Check for "men's-wear" first (the actual slug in the database)
    const mensWearCategories = await Category.find({ 
      $or: [
        { slug: "men's-wear" },
        { slug: 'mens-wear' }
      ],
      isActive: true 
    })
    
    if (mensWearCategories.length > 0) {
      const nonImageCategory = mensWearCategories.find(c => !c.image) || mensWearCategories[0]
      
      // Merge from image category if exists
      const imageCategory = mensWearCategories.find(c => c.image && c._id.toString() !== nonImageCategory._id.toString())
      if (imageCategory) {
        const existingSlugs = new Set(nonImageCategory.subcategories.map(s => s.slug))
        const subcategoriesToAdd = imageCategory.subcategories.filter(s => !existingSlugs.has(s.slug))
        
        if (subcategoriesToAdd.length > 0) {
          nonImageCategory.subcategories.push(...subcategoriesToAdd)
          await nonImageCategory.save()
          console.log(`Merged ${subcategoriesToAdd.length} subcategories from mens-wear image category`)
        }
        
        await Category.deleteOne({ _id: imageCategory._id })

      }
      
      const hasJackets = nonImageCategory.subcategories.some(s => 
        s.slug === 'mens-jackets' || s.name === 'Jackets'
      )
      if (!hasJackets) {
        nonImageCategory.subcategories.push({
          name: "Jackets",
          slug: "mens-jackets",
          image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&q=80",
          productCount: 0,
          isActive: true
        })
        await nonImageCategory.save()
      }
    }
    
    const womensWearCategories = await Category.find({ 
      $or: [
        { slug: "women's-wear" },
        { slug: 'womens-wear' }
      ],
      isActive: true 
    })
    
    if (womensWearCategories.length > 1) {
      const imageCategory = womensWearCategories.find(c => c.image)
      const nonImageCategory = womensWearCategories.find(c => !c.image)
      
      if (imageCategory && nonImageCategory) {
        const existingSlugs = new Set(nonImageCategory.subcategories.map(s => s.slug))
        const subcategoriesToAdd = imageCategory.subcategories.filter(s => !existingSlugs.has(s.slug))
        
        if (subcategoriesToAdd.length > 0) {
          nonImageCategory.subcategories.push(...subcategoriesToAdd)
          await nonImageCategory.save()
          console.log(`Merged ${subcategoriesToAdd.length} subcategories from womens-wear image category`)
        }
        
        // Delete the image category permanently
        await Category.deleteOne({ _id: imageCategory._id })
        console.log(`Deleted duplicate womens-wear category with image`)
      }
    }
    
    await updateCategoryCounts()
    res.json({
      success: true,
      message: "Category counts updated and duplicates merged"
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// POST seed hardcoded categories (admin endpoint)
exports.seedHardcodedCategories = async (req, res) => {
  try {
    const hardcodedCategories = [
      { name: "Women's Wear", slug: "womens-wear", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Dresses", slug: "womens-dresses", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop&q=80" },
        { name: "Tops & T-Shirts", slug: "womens-tops", image: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop&q=80" },
        { name: "Jeans & Pants", slug: "womens-jeans", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&q=80" },
        { name: "Skirts", slug: "womens-skirts", image: "https://images.unsplash.com/photo-1594633312681-425c7b97a5a3?w=400&h=400&fit=crop&q=80" },
        { name: "Jackets & Coats", slug: "womens-jackets", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&q=80" },
        { name: "Activewear", slug: "womens-activewear", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80" },
      ]},
      { name: "Men's Wear", slug: "mens-wear", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Shirts", slug: "mens-shirts", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop&q=80" },
        { name: "T-Shirts", slug: "mens-tshirts", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&q=80" },
        { name: "Jeans", slug: "mens-jeans", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&q=80" },
        { name: "Trousers", slug: "mens-trousers", image: "https://images.unsplash.com/photo-1624378515194-6e8c0c6c5e5a?w=400&h=400&fit=crop&q=80" },
        { name: "Jackets", slug: "mens-jackets", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&q=80" },
        { name: "Suits & Blazers", slug: "mens-suits", image: "https://images.unsplash.com/photo-1594938291221-94f18cbb708b?w=400&h=400&fit=crop&q=80" },
      ]},
      { name: "Kids Wear", slug: "kids-wear", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Boys Clothing", slug: "kids-boys", image: "https://images.unsplash.com/photo-1503919005314-30d9339471b3?w=400&h=400&fit=crop&q=80" },
        { name: "Girls Clothing", slug: "kids-girls", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop&q=80" },
        { name: "Infant Wear", slug: "kids-infant", image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop&q=80" },
        { name: "School Uniforms", slug: "kids-uniforms", image: "https://images.unsplash.com/photo-1503919005314-30d9339471b3?w=400&h=400&fit=crop&q=80" },
        { name: "Accessories", slug: "kids-accessories", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop&q=80" },
      ]},
      { name: "Footwear", slug: "footwear", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Casual Shoes", slug: "footwear-casual", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&q=80" },
        { name: "Sports Shoes", slug: "footwear-sports", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80" },
        { name: "Formal Shoes", slug: "footwear-formal", image: "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400&h=400&fit=crop&q=80" },
        { name: "Heels", slug: "footwear-heels", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop&q=80" },
        { name: "Sandals", slug: "footwear-sandals", image: "https://images.unsplash.com/photo-1575540951203-17b3e3b3d0c3?w=400&h=400&fit=crop&q=80" },
        { name: "Boots", slug: "footwear-boots", image: "https://images.unsplash.com/photo-1608256246200-53bd35f133f4?w=400&h=400&fit=crop&q=80" },
      ]},
      { name: "Perfumes", slug: "perfumes", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Men's Perfumes", slug: "perfumes-mens", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop&q=80" },
        { name: "Women's Perfumes", slug: "perfumes-womens", image: "https://images.unsplash.com/photo-1595425970377-c9703cf48ad1?w=400&h=400&fit=crop&q=80" },
        { name: "Unisex Perfumes", slug: "perfumes-unisex", image: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop&q=80" },
        { name: "Body Sprays", slug: "perfumes-sprays", image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop&q=80" },
        { name: "Deodorants", slug: "perfumes-deodorants", image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop&q=80" },
      ]},
      { name: "Personal Care", slug: "personal-care", majorCategory: "ALL", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=400&fit=crop&q=80", subcategories: [
        { name: "Skincare", slug: "personal-care-skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&q=80" },
        { name: "Hair Care", slug: "personal-care-haircare", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop&q=80" },
        { name: "Body Care", slug: "personal-care-bodycare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop&q=80" },
        { name: "Face Care", slug: "personal-care-facecare", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&q=80" },
        { name: "Oral Care", slug: "personal-care-oralcare", image: "https://images.unsplash.com/photo-1607613009820-a29f7a4d3d89?w=400&h=400&fit=crop&q=80" },
        { name: "Men's Grooming", slug: "personal-care-mens", image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=400&fit=crop&q=80" },
      ]},
    ]

    const created = []
    const Category = require("./category.model")

    for (const catData of hardcodedCategories) {
      let category = await Category.findOne({ slug: catData.slug })
      
      if (!category) {
        category = await Category.create({
          name: catData.name,
          slug: catData.slug,
          majorCategory: catData.majorCategory,
          image: catData.image || null,
          subcategories: catData.subcategories.map(sub => ({
            name: sub.name,
            slug: sub.slug,
            image: sub.image || null,
            productCount: 0
          })),
          productCount: 0,
          isActive: true
        })
        created.push(catData.slug)
      } else {
        // Update category image if provided
        if (catData.image && !category.image) {
          category.image = catData.image
        }
        // Update subcategories if missing
        for (const subData of catData.subcategories) {
          const subExists = category.subcategories.some(sub => sub.slug === subData.slug)
          if (!subExists) {
            category.subcategories.push({
              name: subData.name,
              slug: subData.slug,
              image: subData.image || null,
              productCount: 0
            })
          } else {
            // Update subcategory image if missing
            const existingSub = category.subcategories.find(sub => sub.slug === subData.slug)
            if (subData.image && !existingSub.image) {
              existingSub.image = subData.image
            }
          }
        }
        await category.save()
      }
    }

    // Update counts after seeding
    await updateCategoryCounts()

    res.json({
      success: true,
      message: `Seeded ${created.length} new categories. Total: ${hardcodedCategories.length}`,
      created,
      total: hardcodedCategories.length
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}
