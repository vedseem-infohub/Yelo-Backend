
const mongoose = require('mongoose')
const Product = require('./product.model')

async function createOptimalIndexes() {
  try {


    await Product.collection.createIndex(
      { category: 1, isActive: 1, price: 1 },
      {
        name: 'category_isActive_price',
        background: true,
        sparse: false
      }
    )

    await Product.collection.createIndex(
      { category: 1, isActive: 1, createdAt: -1 },
      {
        name: 'category_isActive_createdAt',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, isActive: 1, rating: -1 },
      {
        name: 'category_isActive_rating',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, isActive: 1, reviews: -1, rating: -1 },
      {
        name: 'category_isActive_popular',
        background: true
      }
    )
    await Product.collection.createIndex(
      { brand: 1, isActive: 1, price: 1 },
      {
        name: 'brand_isActive_price',
        background: true,
        sparse: true // Sparse because brand can be null/undefined
      }
    )

    await Product.collection.createIndex(
      { brand: 1, isActive: 1, createdAt: -1 },
      {
        name: 'brand_isActive_createdAt',
        background: true,
        sparse: true
      }
    )

    await Product.collection.createIndex(
      { brand: 1, isActive: 1, rating: -1 },
      {
        name: 'brand_isActive_rating',
        background: true,
        sparse: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, brand: 1, isActive: 1, price: 1 },
      {
        name: 'category_brand_isActive_price',
        background: true,
        sparse: true
      }
    )

    await Product.collection.createIndex(
      { isActive: 1, price: 1 },
      {
        name: 'isActive_price',
        background: true
      }
    )

    await Product.collection.createIndex(
      { isActive: 1, createdAt: -1 },
      {
        name: 'isActive_createdAt',
        background: true
      }
    )

    await Product.collection.createIndex(
      { isActive: 1, rating: -1 },
      {
        name: 'isActive_rating',
        background: true
      }
    )

    await Product.collection.createIndex(
      { isTrending: 1, isActive: 1, reviews: -1, rating: -1 },
      {
        name: 'isTrending_isActive_popular',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, subcategory: 1, isActive: 1, price: 1 },
      {
        name: 'category_subcategory_isActive_price_low',
        background: true
      }
    )
    await Product.collection.createIndex(
      { category: 1, subcategory: 1, isActive: 1, price: -1 },
      {
        name: 'category_subcategory_isActive_price_high',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, subcategory: 1, isActive: 1, createdAt: -1 },
      {
        name: 'category_subcategory_isActive_createdAt',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, subcategory: 1, isActive: 1, rating: -1 },
      {
        name: 'category_subcategory_isActive_rating',
        background: true
      }
    )

    await Product.collection.createIndex(
      { category: 1, subcategory: 1, isActive: 1, reviews: -1, rating: -1 },
      {
        name: 'category_subcategory_isActive_popular',
        background: true
      }
    )

    await Product.collection.createIndex(
      { assignedShops: 1, isActive: 1, price: 1 },
      {
        name: 'assignedShops_isActive_price',
        background: true
      }
    )

    await Product.collection.createIndex(
      { assignedShops: 1, isActive: 1, createdAt: -1 },
      {
        name: 'assignedShops_isActive_createdAt',
        background: true
      }
    )

    await Product.collection.createIndex(
      { assignedShops: 1, isActive: 1, rating: -1 },
      {
        name: 'assignedShops_isActive_rating',
        background: true
      }
    )
    await Product.collection.createIndex(
      { assignedShops: 1, isActive: 1, reviews: -1, rating: -1 },
      {
        name: 'assignedShops_isActive_popular',
        background: true
      }
    )


  } catch (error) {
    console.error(' Error creating indexes:', error.message)
    throw error
  }
}

// If run directly, execute the function
if (require.main === module) {
  // Connect to MongoDB first
  const connectDB = require('../../config/db')
  connectDB()
    .then(() => createOptimalIndexes())
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error(' Failed:', error.message)
      process.exit(1)
    })
}

module.exports = { createOptimalIndexes }
