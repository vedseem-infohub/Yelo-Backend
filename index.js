
require('dotenv').config()

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
if (mongoUri) {
  const preview = mongoUri.trim().substring(0, 25)
  if (!mongoUri.trim().startsWith('mongodb://') && !mongoUri.trim().startsWith('mongodb+srv://')) {
    console.log(`WARNING: MongoDB URI doesn't start with mongodb:// or mongodb+srv://`)
  }
} else {
  console.log(' MongoDB URI: NOT SET - Please set MONGODB_URI in Render environment variables')
}
console.log(' PORT:', process.env.PORT || 'Using default (5000)')

require('./src/server.js')

