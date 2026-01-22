const mongoose = require("mongoose")

const connectDB = async (retries = 3, delay = 2000) => {
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  
  if (!mongoUri) {
    throw new Error(
      "MongoDB connection string is missing. Please set MONGODB_URI or MONGO_URI environment variable."
    )
  }
  
  mongoUri = mongoUri.trim()
  
  if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
    const preview = mongoUri.substring(0, 20) + (mongoUri.length > 20 ? "..." : "")
    throw new Error(
      `Invalid MongoDB connection string format. Expected to start with "mongodb://" or "mongodb+srv://". ` +
      `Received: "${preview}" (length: ${mongoUri.length}). ` +
      `Please check your MONGODB_URI environment variable.`
    )
  }
  
  const options = {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 120000, 
    connectTimeoutMS: 30000, 
    maxPoolSize: 20, 
    minPoolSize: 5, 
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 10000,
  }
  
  mongoose.set('bufferCommands', false) 
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting MongoDB connection (${attempt}/${retries})...`)
      
      await mongoose.connect(mongoUri, options)
      console.log("MongoDB connected successfully")
      return
    } catch (error) {
      console.error(` MongoDB connection attempt ${attempt}/${retries} failed:`, error.message)
      
      if (error.message.includes("querySrv EREFUSED") || error.message.includes("ENOTFOUND")) {
        console.error("   DNS resolution error - possible causes:")
        console.error("   - MongoDB Atlas IP whitelist: Add your current IP to MongoDB Atlas Network Access")
        console.error("      - Network connectivity issue: Check your internet connection")
        console.error("      - Firewall blocking: Check if port 27017 or MongoDB Atlas ports are blocked")
      } else if (error.message.includes("authentication failed")) {
        console.error("  Authentication error - check your MongoDB username and password")
      } else if (error.message.includes("timeout")) {
        console.error("  Connection timeout - MongoDB server may be unreachable")
      }
      
      if (attempt === retries) {
        throw new Error(
          `MongoDB connection failed after ${retries} attempts. Last error: ${error.message}. ` +
          `Please check your MONGODB_URI and ensure MongoDB is accessible.`
        )
      }
      
      const waitTime = delay * attempt
      console.log(`  Retrying in ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

module.exports = connectDB
