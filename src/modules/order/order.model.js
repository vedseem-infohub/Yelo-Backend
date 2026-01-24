const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model for population
      required: true,
      index: true
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        color: {
          type: String
        },
        size: {
          type: String
        }
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING"
    },

    orderStatus: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"],
      default: "PLACED"
    },
    
    razorpayOrderId: {
      type: String
    },
    
    razorpayPaymentId: {
      type: String
    },
    
    razorpaySignature: {
      type: String
    },

    // Delivery address
    deliveryAddress: {
      // Keeping old fields for backward compatibility
      address: String,
      city: String,
      state: String,
      pincode: String,
      latitude: Number,
      longitude: Number,
      // Detailed address fields
      fullName: String,
      phone: String,
      addressLine1: String, // House/Flat No., Building Name
      addressLine2: String, // Street, Area, Locality
      area: String,
      block: String,
      landmark: String
    },

    paymentMethod: {
      type: String
    },

    assignedShop: {
      type: String
    },

    statusHistory: [
      {
        status: String,
        updatedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
)

// Add indexes for better query performance
orderSchema.index({ createdAt: -1 }) // For sorting by date
orderSchema.index({ orderStatus: 1, createdAt: -1 }) // For filtering by status and sorting

module.exports = mongoose.model("Order", orderSchema)
