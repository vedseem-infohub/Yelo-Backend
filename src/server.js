// Load environment variables from .env file
require("dotenv").config()

const app = require("./app")
const connectDB = require("./config/db")

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await connectDB()
    console.log("MongoDB connected")

    try {
      const { ensureProductIndexes } = require("./modules/product/ensure-indexes")
      await ensureProductIndexes()
    } catch (indexError) {
      console.warn("Index creation warning (non-critical):", indexError.message)
    }

    if (process.env.SEED_SHOPS === "true") {
      try {
        const seedShops = require("./modules/shop/shop.seed")
        await seedShops()
        console.log(" Shops seeded successfully")
      } catch (seedError) {
        console.warn("Shop seeding failed (non-critical):", seedError.message)
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error("Server startup failed:", err)
    process.exit(1)
  }
}

startServer()
