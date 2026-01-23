/**
 * Fix Product Index Conflicts
 * This script drops old/incorrect indexes and ensures correct ones exist
 * Run this once to fix index conflicts
 * 
 * Usage: node -e "require('./src/modules/product/fix-indexes.js')"
 */

const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = require('../../config/db')
const Product = require('./product.model')

async function fixIndexes() {
  try {
    await connectDB()

    const collection = Product.collection

    // Get all current indexes
    const indexes = await collection.getIndexes()
    const indexNames = Object.keys(indexes)


    // List of old/incorrect index names to drop
    const indexesToDrop = [
      'category_subcategorry_isActive_price', // Typo: double 'r'
      'category_subcategory_isActive_price' // Old name without _low suffix
    ]
    for (const oldIndexName of indexesToDrop) {
      if (indexNames.includes(oldIndexName)) {
        try {
          await collection.dropIndex(oldIndexName)
        } catch (dropError) {
          if (dropError.message.includes('index not found')) {
            console.log(`  Index ${oldIndexName} not found (already dropped)`)
          } else {
            console.error(`   Error dropping ${oldIndexName}:`, dropError.message)
          }
        }
      } else {
        console.log(`  Index ${oldIndexName} not found (no action needed)`)
      }
    }

    try {
      await Product.ensureIndexes()
    } catch (ensureError) {
      if (ensureError.message.includes('already exists with a different name')) {
        console.warn(' Index conflict detected:', ensureError.message)
      } else {
        throw ensureError
      }
    }
    const finalIndexes = await collection.getIndexes()
    const finalIndexNames = Object.keys(finalIndexes)
    finalIndexNames.forEach(name => {
      const index = finalIndexes[name]
      const keys = Object.keys(index.key).map(k => `${k}:${index.key[k]}`).join(', ')
    })

    process.exit(0)
  } catch (error) {
    console.error(' Error fixing indexes:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  fixIndexes()
}

module.exports = { fixIndexes }
