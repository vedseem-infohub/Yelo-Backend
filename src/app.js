const express = require("express")
const cors = require("cors")
const routes = require("./routes")

const app = express()

// CORS configuration
const allowedOrigins = [
  // Localhost variations for development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "http://[::1]:3000",
  "http://[::1]:3001",
  "http://[::1]:5173",

  // Production domains
  "https://www.yeloindia.com",
  "https://yeloindia.com",
  "http://yeloindia.com",
  // Vercel deployments
  "https://yelo-admin-drab.vercel.app", //new
  "https://yelo-wheat.vercel.app",
  "https://yelo-admin-rose.vercel.app",
  // Add any other Vercel preview URLs if needed
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
]

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      
      // Check if origin is in allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true)
      }
      
      // Always allow localhost origins (for development and testing)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
      if (isLocalhost) {
        return callback(null, true)
      }
      
      // Reject if not allowed
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "Cache-Control", 
      "Pragma", 
      "Expires", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
)

// Increase body parser limit for image uploads (50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use("/api", routes)

// Error handling middleware (must be last)
const errorHandler = require("./middlewares/error.middleware")
app.use(errorHandler)

module.exports = app
