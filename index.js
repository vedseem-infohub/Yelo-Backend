
require('dotenv').config()

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
if (mongoUri) {
  const preview = mongoUri.trim().substring(0, 25)
  if (!mongoUri.trim().startsWith('mongodb://') && !mongoUri.trim().startsWith('mongodb+srv://')) {
    console.log("mm")
  }
} else {
  console.log("set no")
}

require('./src/server.js')

